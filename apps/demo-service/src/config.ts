import "dotenv/config";

import {
  BASE_SEPOLIA_NETWORK,
  DEFAULT_DEMO_SERVICE_PORT,
  DEFAULT_FACILITATOR_URL,
  DEFAULT_X402_PRICE,
  type X402Network,
  isEvmAddress,
  isX402Network
} from "@verifier-facilitator/shared";

export type DemoServiceConfig = {
  port: number;
  facilitatorUrl: string;
  network: X402Network;
  price: string;
  summarizePrice: string;
  sellerAddress: `0x${string}`;
};

const parsePort = (value: string | undefined) => {
  if (!value) {
    return DEFAULT_DEMO_SERVICE_PORT;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`DEMO_SERVICE_PORT must be a valid port, received "${value}".`);
  }

  return parsed;
};

const parseSellerAddress = (value: string | undefined) => {
  if (!value || !isEvmAddress(value) || /^0x0{40}$/i.test(value)) {
    throw new Error("SELLER_EVM_ADDRESS must be a non-zero EVM address.");
  }

  return value;
};

const parseNetwork = (value: string | undefined) => {
  const network = value ?? BASE_SEPOLIA_NETWORK;
  if (!isX402Network(network)) {
    throw new Error(`X402_NETWORK must be a CAIP-style network id, received "${network}".`);
  }

  return network;
};

export const config: DemoServiceConfig = {
  port: parsePort(process.env.DEMO_SERVICE_PORT),
  facilitatorUrl: process.env.X402_FACILITATOR_URL ?? DEFAULT_FACILITATOR_URL,
  network: parseNetwork(process.env.X402_NETWORK),
  price: process.env.X402_PRICE ?? DEFAULT_X402_PRICE,
  summarizePrice: process.env.X402_SUMMARIZE_PRICE ?? "$0.05",
  sellerAddress: parseSellerAddress(process.env.SELLER_EVM_ADDRESS)
};
