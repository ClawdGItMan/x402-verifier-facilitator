export const BASE_SEPOLIA_NETWORK = "eip155:84532" as const;
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
export const BASE_SEPOLIA_EXPLORER_TX = "https://sepolia.basescan.org/tx/" as const;
export const DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator" as const;
export const DEFAULT_LOCAL_FACILITATOR_PORT = 4020;
export const DEFAULT_DEMO_SERVICE_PORT = 4021;
export const DEFAULT_DASHBOARD_PORT = 4022;
export const DEFAULT_X402_PRICE = "$0.001" as const;
export const DEFAULT_DEMO_SERVICE_URL = `http://localhost:${DEFAULT_DEMO_SERVICE_PORT}` as const;
export const DEFAULT_LOCAL_FACILITATOR_URL = `http://localhost:${DEFAULT_LOCAL_FACILITATOR_PORT}` as const;

export type X402Network = `${string}:${string}`;

export const PAYMENT_RESPONSE_HEADER = "PAYMENT-RESPONSE" as const;
export const PAYMENT_REQUIRED_HEADER = "PAYMENT-REQUIRED" as const;
export const PAYMENT_SIGNATURE_HEADER = "PAYMENT-SIGNATURE" as const;

export const isHexPrivateKey = (value: string): value is `0x${string}` =>
  /^0x[a-fA-F0-9]{64}$/.test(value);

export const isEvmAddress = (value: string): value is `0x${string}` =>
  /^0x[a-fA-F0-9]{40}$/.test(value);

export const isX402Network = (value: string): value is X402Network =>
  /^[a-z0-9]+:[a-zA-Z0-9._/-]+$/.test(value);

export const usdcAtomicToDisplay = (amount: bigint) => {
  const whole = amount / 1_000_000n;
  const fractional = amount % 1_000_000n;
  const trimmedFraction = fractional.toString().padStart(6, "0").replace(/0+$/, "");
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole.toString();
};

export const usdcDisplayToAtomic = (value: string) => {
  const normalized = value.trim();
  if (!/^\d+(\.\d{0,6})?$/.test(normalized)) {
    throw new Error("USDC amount must be a positive decimal with up to 6 places.");
  }

  const [whole = "0", fractional = ""] = normalized.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fractional.padEnd(6, "0").slice(0, 6));
};

export * from "./types.js";
export * from "./thresholds.js";
