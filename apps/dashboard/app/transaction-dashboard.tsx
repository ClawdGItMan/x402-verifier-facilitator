"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDot,
  CloudSun,
  ExternalLink,
  FileCheck2,
  RefreshCw,
  Send,
  Unplug,
  Wallet
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import type { ClientEvmSigner } from "@x402/evm";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWalletClient,
  useWriteContract
} from "wagmi";
import { baseSepolia } from "wagmi/chains";

import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_EXPLORER_TX,
  BASE_SEPOLIA_NETWORK,
  BASE_SEPOLIA_USDC_ADDRESS,
  DEFAULT_DEMO_SERVICE_URL,
  DEFAULT_LOCAL_FACILITATOR_URL,
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_RESPONSE_HEADER,
  PAYMENT_SIGNATURE_HEADER,
  usdcAtomicToDisplay,
  usdcDisplayToAtomic
} from "@verifier-facilitator/shared";

type TimelineKind =
  | "idle"
  | "request"
  | "required"
  | "sign"
  | "retry"
  | "verify"
  | "settle"
  | "complete"
  | "error"
  | "fund";

type TimelineEvent = {
  id: string;
  kind: TimelineKind;
  label: string;
  timestamp: string;
  detail?: string;
};

type AgentStatus = {
  configured: boolean;
  address: `0x${string}` | null;
  error?: string;
};

type Settlement = {
  success?: boolean;
  payer?: string;
  transaction?: string;
  network?: string;
};

type PersistedRun = {
  settlement: Settlement | null;
  timeline: TimelineEvent[];
  weatherBody: unknown;
  savedAt: string;
};

const demoServiceUrl = process.env.NEXT_PUBLIC_DEMO_SERVICE_URL ?? DEFAULT_DEMO_SERVICE_URL;
const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL ?? DEFAULT_LOCAL_FACILITATOR_URL;
const lastRunStorageKey = "verifier-facilitator-x402:last-run";

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }]
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "ok", type: "bool" }]
  }
] as const;

const shorten = (value?: string | null) => {
  if (!value) {
    return "Not set";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const formatClock = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const stringifyDetail = (detail: unknown) => {
  if (!detail) {
    return undefined;
  }

  if (typeof detail === "string") {
    return detail.startsWith("0x") ? shorten(detail) : detail;
  }

  if (isRecord(detail)) {
    const transaction = typeof detail.transaction === "string" ? detail.transaction : undefined;
    const network = typeof detail.network === "string" ? detail.network : undefined;
    const endpointUrl = typeof detail.endpointUrl === "string" ? detail.endpointUrl : undefined;
    const header = typeof detail.header === "string" ? detail.header : undefined;
    const status = typeof detail.status === "number" ? detail.status : undefined;
    const elapsedMs = typeof detail.elapsedMs === "number" ? detail.elapsedMs : undefined;
    const amount = typeof detail.amount === "string" ? detail.amount : undefined;
    const payTo = typeof detail.payTo === "string" ? detail.payTo : undefined;
    const mode = typeof detail.mode === "string" ? detail.mode : undefined;

    if (transaction && mode) {
      return `${mode}; funding tx ${shorten(transaction)}`;
    }

    if (transaction) {
      return `Tx ${shorten(transaction)} on ${network ?? "Base Sepolia"}`;
    }

    if (amount && payTo) {
      return `${usdcAtomicToDisplay(BigInt(amount))} USDC to ${shorten(payTo)}`;
    }

    if (status && elapsedMs) {
      return `${status} in ${elapsedMs}ms`;
    }

    if (endpointUrl) {
      return endpointUrl;
    }

    if (header) {
      return header;
    }

    if (network) {
      return network;
    }
  }

  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
};

const transactionSteps: Array<{
  key: TimelineKind;
  title: string;
  description: string;
}> = [
  {
    key: "request",
    title: "Request sent",
    description: "The dashboard asked the paid weather endpoint for data."
  },
  {
    key: "required",
    title: "Payment requested",
    description: "The demo service returned an x402 payment requirement."
  },
  {
    key: "sign",
    title: "Payment signed",
    description: "The payer authorized the USDC payment."
  },
  {
    key: "retry",
    title: "Paid retry",
    description: "The request was sent again with the payment attached."
  },
  {
    key: "verify",
    title: "Verified",
    description: "The local facilitator checked the payment."
  },
  {
    key: "settle",
    title: "Settled",
    description: "The upstream x402 facilitator settled on Base Sepolia."
  },
  {
    key: "complete",
    title: "Response returned",
    description: "The paid weather response came back to the dashboard."
  }
];

export function TransactionDashboard() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: BASE_SEPOLIA_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    configured: false,
    address: null
  });
  const [fundAmount, setFundAmount] = useState("0.01");
  const [mode, setMode] = useState<"manual" | "agent">("agent");
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [weatherBody, setWeatherBody] = useState<unknown>(null);
  const [selectedStepKey, setSelectedStepKey] = useState<TimelineKind | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const runStartedAtRef = useRef<number | null>(null);
  const [services, setServices] = useState({
    demo: "unknown" as "unknown" | "online" | "offline",
    facilitator: "unknown" as "unknown" | "online" | "offline",
    events: "connecting" as "connecting" | "live" | "offline"
  });

  const userBalance = useReadContract({
    address: BASE_SEPOLIA_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    query: {
      enabled: Boolean(address),
      refetchInterval: 5000
    }
  });

  const agentBalance = useReadContract({
    address: BASE_SEPOLIA_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: agentStatus.address ? [agentStatus.address] : undefined,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    query: {
      enabled: Boolean(agentStatus.address),
      refetchInterval: 5000
    }
  });

  const addEvent = useCallback((kind: TimelineKind, label: string, detail?: unknown) => {
    setTimeline((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        kind,
        label,
        timestamp: new Date().toISOString(),
        detail: stringifyDetail(detail)
      },
      ...current
    ].slice(0, 40));
  }, []);

  const resetRun = useCallback(() => {
    runStartedAtRef.current = Date.now();
    setSettlement(null);
    setWeatherBody(null);
    setTimeline([]);
  }, []);

  const refreshAgent = useCallback(async () => {
    const response = await fetch("/api/agent/status", { cache: "no-store" });
    const status = (await response.json()) as AgentStatus;
    setAgentStatus(status);
  }, []);

  const refreshServices = useCallback(async () => {
    const [demo, facilitator] = await Promise.allSettled([
      fetch(`${demoServiceUrl}/health`, { cache: "no-store" }),
      fetch(`${facilitatorUrl}/health`, { cache: "no-store" })
    ]);

    setServices((current) => ({
      ...current,
      demo: demo.status === "fulfilled" && demo.value.ok ? "online" : "offline",
      facilitator:
        facilitator.status === "fulfilled" && facilitator.value.ok ? "online" : "offline"
    }));
  }, []);

  useEffect(() => {
    void refreshAgent();
    void refreshServices();
    const interval = window.setInterval(() => {
      void refreshServices();
    }, 7000);

    return () => window.clearInterval(interval);
  }, [refreshAgent, refreshServices]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(lastRunStorageKey);
      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved) as Partial<PersistedRun>;
      if (parsed.settlement) {
        setSettlement(parsed.settlement);
      }
      if (parsed.weatherBody !== undefined) {
        setWeatherBody(parsed.weatherBody);
      }
      if (Array.isArray(parsed.timeline)) {
        setTimeline(parsed.timeline.slice(0, 40));
      }
    } catch {
      window.localStorage.removeItem(lastRunStorageKey);
    }
  }, []);

  useEffect(() => {
    if (!settlement?.success) {
      return;
    }

    const savedRun: PersistedRun = {
      settlement,
      timeline,
      weatherBody,
      savedAt: new Date().toISOString()
    };

    window.localStorage.setItem(lastRunStorageKey, JSON.stringify(savedRun));
  }, [settlement, timeline, weatherBody]);

  useEffect(() => {
    const source = new EventSource(`${facilitatorUrl}/events`);

    source.onopen = () => {
      setServices((current) => ({ ...current, events: "live" }));
    };

    source.onerror = () => {
      setServices((current) => ({ ...current, events: "offline" }));
    };

    source.addEventListener("facilitator", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as {
        endpoint: "supported" | "verify" | "settle";
        id?: number;
        status: number;
        elapsedMs: number;
        timestamp?: string;
      };

      const eventTime = data.timestamp ? Date.parse(data.timestamp) : Date.now();
      if (!runStartedAtRef.current || eventTime < runStartedAtRef.current - 1000) {
        return;
      }

      addEvent(
        data.endpoint === "settle" ? "settle" : data.endpoint === "verify" ? "verify" : "request",
        `Local facilitator /${data.endpoint} -> ${data.status}`,
        `${data.elapsedMs}ms`
      );
    });

    return () => source.close();
  }, [addEvent]);

  const ensureBaseSepolia = useCallback(async () => {
    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      await switchChainAsync({ chainId: BASE_SEPOLIA_CHAIN_ID });
    }
  }, [chainId, switchChainAsync]);

  const fundAgent = useCallback(async () => {
    if (!agentStatus.address) {
      addEvent("error", "Agent wallet is not configured");
      return;
    }

    setIsFunding(true);
    try {
      await ensureBaseSepolia();
      const amount = usdcDisplayToAtomic(fundAmount);
      addEvent("fund", "Funding transaction opened in wallet", `${fundAmount} USDC`);

      const hash = await writeContractAsync({
        address: BASE_SEPOLIA_USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "transfer",
        args: [agentStatus.address, amount],
        chainId: BASE_SEPOLIA_CHAIN_ID
      });

      addEvent("fund", "Funding transaction submitted", hash);
      if (publicClient) {
        addEvent("fund", "Waiting for funding confirmation");
        await publicClient.waitForTransactionReceipt({ hash });
        addEvent("fund", "Funding transaction confirmed", hash);
      }
      await Promise.all([userBalance.refetch(), agentBalance.refetch()]);
      setMode("agent");
      addEvent("fund", "Agent funded and ready to pay for /weather", {
        mode: "Agent pays",
        transaction: hash
      });
    } catch (error) {
      addEvent("error", "Funding failed", error instanceof Error ? error.message : String(error));
    } finally {
      setIsFunding(false);
    }
  }, [
    addEvent,
    agentBalance,
    agentStatus.address,
    ensureBaseSepolia,
    fundAmount,
    userBalance,
    publicClient,
    writeContractAsync
  ]);

  const runManual = useCallback(async () => {
    if (!address) {
      addEvent("error", "Connect a wallet before running manual mode");
      return;
    }

    setIsRunning(true);
    resetRun();

    try {
      await ensureBaseSepolia();
      if (!walletClient) {
        throw new Error("Wallet client is not ready after switching to Base Sepolia.");
      }
      const endpointUrl = `${demoServiceUrl}/weather`;
      addEvent("request", "Browser requested paid weather endpoint", endpointUrl);

      const firstResponse = await fetch(endpointUrl, {
        method: "GET",
        headers: { accept: "application/json" }
      });

      const firstBody = await firstResponse.json().catch(() => ({}));

      if (firstResponse.status !== 402) {
        throw new Error(`Expected 402 Payment Required, received ${firstResponse.status}.`);
      }

      addEvent("required", "Demo service returned x402 payment requirements", {
        header: PAYMENT_REQUIRED_HEADER
      });

      const signer: ClientEvmSigner = {
        address,
        signTypedData: async ({ domain, types, primaryType, message }) =>
          (walletClient.signTypedData as unknown as (args: {
            account: `0x${string}`;
            domain: Record<string, unknown>;
            types: Record<string, unknown>;
            primaryType: string;
            message: Record<string, unknown>;
          }) => Promise<`0x${string}`>)({
            account: address,
            domain,
            types,
            primaryType,
            message
          })
      };

      const client = new x402Client().register(BASE_SEPOLIA_NETWORK, new ExactEvmScheme(signer));
      const httpClient = new x402HTTPClient(client);
      const paymentRequired = httpClient.getPaymentRequiredResponse(
        (name) => firstResponse.headers.get(name),
        firstBody
      );

      addEvent("sign", "Wallet signature requested for x402 payment", paymentRequired.accepts[0]);
      const paymentPayload = await client.createPaymentPayload(paymentRequired);
      const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);
      addEvent("retry", "Browser retried request with signed payment", {
        header: PAYMENT_SIGNATURE_HEADER
      });

      const paidResponse = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...paymentHeaders
        }
      });

      const paidText = await paidResponse.text();
      const paidBody = JSON.parse(paidText) as unknown;
      setWeatherBody(paidBody);

      const decodedSettlement = httpClient.getPaymentSettleResponse((name) =>
        paidResponse.headers.get(name)
      ) as Settlement;

      setSettlement(decodedSettlement);
      addEvent("complete", `Paid response returned ${paidResponse.status}`, {
        header: PAYMENT_RESPONSE_HEADER
      });
    } catch (error) {
      addEvent("error", "Manual payment failed", error instanceof Error ? error.message : String(error));
    } finally {
      setIsRunning(false);
    }
  }, [addEvent, address, ensureBaseSepolia, resetRun, walletClient]);

  const runAgent = useCallback(async () => {
    setIsRunning(true);
    resetRun();
    addEvent("request", "Dashboard asked agent to run paid weather transaction");

    try {
      const response = await fetch("/api/agent/weather", { method: "POST" });
      if (!response.body) {
        throw new Error("Agent response stream was empty.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let ok = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          const payload = JSON.parse(line) as {
            type: "event" | "result" | "error";
            ok?: boolean;
            error?: string;
            event?: { step: string; label: string; detail?: unknown };
            result?: {
              body: unknown;
              settlement: Settlement;
            };
          };

          if (payload.type === "event" && payload.event) {
            addEvent(
              payload.event.step === "settled"
                ? "settle"
                : payload.event.step === "complete"
                  ? "complete"
                  : payload.event.step === "payment-required"
                    ? "required"
                  : payload.event.step === "sign"
                    ? "sign"
                    : payload.event.step === "retry"
                      ? "retry"
                      : "request",
              payload.event.label,
              payload.event.detail
            );
          }

          if (payload.type === "error") {
            throw new Error(payload.error ?? "Agent payment failed.");
          }

          if (payload.type === "result") {
            ok = Boolean(payload.ok);
            setSettlement(payload.result?.settlement ?? null);
            setWeatherBody(payload.result?.body ?? null);
          }
        }
      }

      if (!ok) {
        throw new Error("Agent payment did not return a successful result.");
      }
      await agentBalance.refetch();
    } catch (error) {
      addEvent("error", "Agent payment failed", error instanceof Error ? error.message : String(error));
    } finally {
      setIsRunning(false);
    }
  }, [addEvent, agentBalance, resetRun]);

  const runSelected = useCallback(() => {
    if (mode === "manual") {
      void runManual();
      return;
    }

    void runAgent();
  }, [mode, runAgent, runManual]);

  const flowNodes = useMemo(
    () => [
      { key: "request", label: "Browser", icon: Wallet },
      { key: "required", label: "Demo API", icon: CloudSun },
      { key: "verify", label: "Local facilitator", icon: Activity },
      { key: "settle", label: "x402.org", icon: CircleDot },
      { key: "complete", label: "Base Sepolia", icon: CheckCircle2 }
    ],
    []
  );

  const activeKinds = new Set(timeline.map((event) => event.kind));
  const onBaseSepolia = chainId === BASE_SEPOLIA_CHAIN_ID;
  const latestEvent = timeline[0];
  const selectedStep = transactionSteps.find((step) => step.key === selectedStepKey);
  const hasError = latestEvent?.kind === "error";
  const currentStatus = settlement?.success
    ? "Settled on Base Sepolia"
    : hasError
      ? "Needs attention"
      : isRunning
        ? "Transaction running"
        : latestEvent?.label ?? "Ready";
  const currentDetail = settlement?.transaction
    ? `Tx ${settlement.transaction}`
    : latestEvent?.detail ?? "No transaction is running right now.";

  const getStepStatus = (kind: TimelineKind) => {
    if (latestEvent?.kind === kind && isRunning) {
      return "current";
    }

    if (activeKinds.has(kind)) {
      return "done";
    }

    return "pending";
  };

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">x402</span>
          <div>
            <h1>Verifier Facilitator x402</h1>
            <p>Base Sepolia transaction control</p>
          </div>
        </div>
        <div className="topbar-actions">
          <span className={`status-chip ${onBaseSepolia ? "online" : "offline"}`}>
            Base Sepolia
          </span>
          <ConnectButton chainStatus="name" accountStatus="address" showBalance={false} />
        </div>
      </header>

      <section className="grid-layout">
        <aside className="panel wallet-panel">
          <div className="panel-heading">
            <Wallet size={18} />
            <h2>Wallets</h2>
          </div>

          <div className="balance-row">
            <span>User wallet</span>
            <strong>{address ? shorten(address) : "Not connected"}</strong>
            <em>{userBalance.data !== undefined ? `${usdcAtomicToDisplay(userBalance.data)} USDC` : "--"}</em>
          </div>

          <div className="balance-row">
            <span>Agent wallet</span>
            <strong>{shorten(agentStatus.address)}</strong>
            <em>{agentBalance.data !== undefined ? `${usdcAtomicToDisplay(agentBalance.data)} USDC` : "--"}</em>
          </div>

          <div className="fund-row">
            <input
              aria-label="USDC amount"
              value={fundAmount}
              onChange={(event) => setFundAmount(event.target.value)}
              inputMode="decimal"
            />
            <button
              type="button"
              className="icon-button"
              title="Fund agent"
              disabled={!isConnected || !agentStatus.address || isFunding}
              onClick={() => void fundAgent()}
            >
              {isFunding ? <RefreshCw size={17} className="spin" /> : <Send size={17} />}
              <span>Fund</span>
            </button>
          </div>

          <div className="service-stack">
            <ServiceDot label="Demo API" state={services.demo} />
            <ServiceDot label="Facilitator" state={services.facilitator} />
            <ServiceDot label="Event stream" state={services.events === "live" ? "online" : services.events === "connecting" ? "unknown" : "offline"} />
          </div>
        </aside>

        <section className="panel command-panel">
          <div className="panel-heading">
            <CloudSun size={18} />
            <h2>Transaction</h2>
          </div>

          <div className="mode-switch" role="tablist" aria-label="Payment mode">
            <button
              type="button"
              className={mode === "manual" ? "active" : ""}
              onClick={() => setMode("manual")}
            >
              Manual wallet pays
            </button>
            <button
              type="button"
              className={mode === "agent" ? "active" : ""}
              onClick={() => setMode("agent")}
            >
              Agent pays
            </button>
          </div>

          <div
            className={`live-status ${settlement?.success ? "success" : hasError ? "danger" : isRunning ? "running" : "idle"}`}
            aria-live="polite"
          >
            <div className="live-status-icon">
              {settlement?.success ? (
                <CheckCircle2 size={24} />
              ) : isRunning ? (
                <RefreshCw size={24} className="spin" />
              ) : (
                <Bot size={24} />
              )}
            </div>
            <div>
              <span>Current state</span>
              <strong>{currentStatus}</strong>
              <p>{currentDetail}</p>
            </div>
          </div>

          <button
            type="button"
            className={`transaction-row selected ${isRunning ? "running" : ""}`}
            disabled={isRunning}
            onClick={runSelected}
          >
            <div>
              <span className="method">GET</span>
              <strong>/weather</strong>
              <em>$0.001 USDC</em>
            </div>
            <div className="run-label">
              {isRunning ? <RefreshCw size={18} className="spin" /> : <ArrowRight size={18} />}
              <span>{isRunning ? "Running" : mode === "agent" ? "Run agent" : "Run"}</span>
            </div>
          </button>

          <div className="process-board" aria-label="Payment progress">
            {transactionSteps.map((step) => {
              const status = getStepStatus(step.key);
              const selected = selectedStepKey === step.key;

              return (
                <button
                  type="button"
                  aria-expanded={selected}
                  className={`process-step ${status} ${selected ? "selected" : ""}`}
                  key={step.key}
                  onClick={() => setSelectedStepKey(selected ? null : step.key)}
                >
                  <span className="process-marker">
                    {status === "done" ? <CheckCircle2 size={16} /> : status === "current" ? <RefreshCw size={16} className="spin" /> : null}
                  </span>
                  <strong>{step.title}</strong>
                </button>
              );
            })}
          </div>

          {selectedStep ? (
            <div className="process-detail">
              <strong>{selectedStep.title}</strong>
              <p>{selectedStep.description}</p>
            </div>
          ) : null}

          <div className="flow-rail" aria-label="Transaction flow">
            {flowNodes.map((node, index) => {
              const Icon = node.icon;
              const active = activeKinds.has(node.key as TimelineKind);

              return (
                <div className="flow-node-wrap" key={node.key}>
                  <div className={`flow-node ${active ? "active" : ""}`}>
                    <Icon size={20} />
                    <span>{node.label}</span>
                  </div>
                  {index < flowNodes.length - 1 ? <div className="flow-line" /> : null}
                </div>
              );
            })}
          </div>

          <div className="timeline-header">
            <strong>Event log</strong>
            <span>Latest first</span>
          </div>
          <div className="timeline-list">
            {timeline.length === 0 ? (
              <div className="empty-state">
                <Unplug size={18} />
                <span>No transaction events yet</span>
              </div>
            ) : (
              timeline.map((event) => (
                <div className={`timeline-item ${event.kind}`} key={event.id}>
                  <time>{formatClock(event.timestamp)}</time>
                  <strong>{event.label}</strong>
                  {event.detail ? <span>{event.detail}</span> : null}
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="panel settlement-panel">
          <div className="panel-heading">
            <FileCheck2 size={18} />
            <h2>Settlement</h2>
          </div>

          <div className={`settlement-box ${settlement?.success ? "success" : ""}`}>
            <span>Status</span>
            <strong>{settlement?.success ? "Settled" : "Waiting"}</strong>
          </div>

          <dl className="settlement-list">
            <div>
              <dt>Payer</dt>
              <dd>{shorten(settlement?.payer)}</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>{settlement?.network ?? BASE_SEPOLIA_NETWORK}</dd>
            </div>
            <div>
              <dt>Tx hash</dt>
              <dd className="tx-hash">{settlement?.transaction ?? "Not set"}</dd>
            </div>
          </dl>

          {settlement?.transaction ? (
            <a
              className="explorer-link"
              href={`${BASE_SEPOLIA_EXPLORER_TX}${settlement.transaction}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} />
              <span>Open transaction</span>
            </a>
          ) : null}

          <pre className="response-view">
            {weatherBody ? JSON.stringify(weatherBody, null, 2) : "No paid response yet"}
          </pre>
        </aside>
      </section>
    </main>
  );
}

function ServiceDot({
  label,
  state
}: Readonly<{ label: string; state: "unknown" | "online" | "offline" }>) {
  return (
    <div className="service-dot">
      <span className={state} />
      <strong>{label}</strong>
      <em>{state}</em>
    </div>
  );
}
