import { x402HTTPClient } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";

import {
  BASE_SEPOLIA_NETWORK,
  DEFAULT_DEMO_SERVICE_URL,
  PAYMENT_RESPONSE_HEADER,
  type X402Network,
  isHexPrivateKey,
  isX402Network
} from "@verifier-facilitator/shared";

export type AgentPaymentStep =
  | "request"
  | "payment-required"
  | "sign"
  | "retry"
  | "settled"
  | "complete";

export type AgentPaymentEvent = {
  step: AgentPaymentStep;
  label: string;
  timestamp: string;
  detail?: unknown;
};

export type AgentWeatherPaymentOptions = {
  endpointUrl?: string;
  privateKey: `0x${string}`;
  network?: X402Network;
  onEvent?: (event: AgentPaymentEvent) => void | Promise<void>;
};

export type AgentWeatherPaymentResult = {
  status: number;
  statusText: string;
  elapsedMs: number;
  body: unknown;
  settlement: unknown | null;
};

const event = async (
  onEvent: AgentWeatherPaymentOptions["onEvent"],
  step: AgentPaymentStep,
  label: string,
  detail?: unknown
) => {
  await onEvent?.({
    step,
    label,
    timestamp: new Date().toISOString(),
    detail
  });
};

export const resolveAgentPaymentOptionsFromEnv = () => {
  const privateKey = process.env.EVM_PRIVATE_KEY;
  if (!privateKey || !isHexPrivateKey(privateKey) || /^0x0{64}$/i.test(privateKey)) {
    throw new Error("EVM_PRIVATE_KEY must be set to a non-zero 32-byte hex private key.");
  }

  const network = process.env.X402_NETWORK ?? BASE_SEPOLIA_NETWORK;
  if (!isX402Network(network)) {
    throw new Error(`X402_NETWORK must be a CAIP-style network id, received "${network}".`);
  }

  return {
    endpointUrl: `${process.env.DEMO_SERVICE_URL ?? DEFAULT_DEMO_SERVICE_URL}/weather`,
    network,
    privateKey
  };
};

export const runAgentWeatherPayment = async ({
  endpointUrl = `${DEFAULT_DEMO_SERVICE_URL}/weather`,
  privateKey,
  network = BASE_SEPOLIA_NETWORK,
  onEvent
}: AgentWeatherPaymentOptions): Promise<AgentWeatherPaymentResult> => {
  const account = privateKeyToAccount(privateKey);
  const startedAt = Date.now();

  const client = new x402Client()
    .register(network, new ExactEvmScheme(account))
    .onBeforePaymentCreation(async ({ selectedRequirements }) => {
      await event(onEvent, "payment-required", "Agent selected payment requirements", selectedRequirements);
      await event(onEvent, "sign", "Agent signed payment authorization");
    })
    .onAfterPaymentCreation(async ({ paymentPayload }) => {
      await event(onEvent, "retry", "Agent retried request with x402 payment", {
        network: paymentPayload.accepted.network
      });
    });

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);
  const httpClient = new x402HTTPClient(client);

  await event(onEvent, "request", "Agent requested paid weather endpoint", { endpointUrl });

  const response = await fetchWithPayment(endpointUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
      "user-agent": "verifier-facilitator-dashboard-agent/0.1.0"
    }
  });

  const bodyText = await response.text();
  const elapsedMs = Date.now() - startedAt;
  const paymentResponseHeader = response.headers.get(PAYMENT_RESPONSE_HEADER);
  const settlement = paymentResponseHeader
    ? httpClient.getPaymentSettleResponse((name) => response.headers.get(name))
    : null;

  if (settlement) {
    await event(onEvent, "settled", "Agent payment settled on Base Sepolia", settlement);
  }

  let body: unknown = bodyText;
  try {
    body = JSON.parse(bodyText) as unknown;
  } catch {
    body = bodyText;
  }

  await event(onEvent, "complete", `Agent request completed with ${response.status}`, {
    status: response.status,
    elapsedMs
  });

  return {
    status: response.status,
    statusText: response.statusText,
    elapsedMs,
    body,
    settlement
  };
};
