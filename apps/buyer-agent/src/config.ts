import "dotenv/config";

import {
  BASE_SEPOLIA_NETWORK,
  DEFAULT_DEMO_SERVICE_PORT,
  type X402Network,
  isHexPrivateKey,
  isX402Network
} from "@verifier-facilitator/shared";

export type BuyerAgentConfig = {
  endpointUrl: string;
  network: X402Network;
  privateKey: `0x${string}`;
};

const parsePrivateKey = (value: string | undefined) => {
  if (!value || !isHexPrivateKey(value) || /^0x0{64}$/i.test(value)) {
    throw new Error("EVM_PRIVATE_KEY must be a non-zero 32-byte hex private key.");
  }

  return value;
};

const defaultServiceUrl = `http://localhost:${DEFAULT_DEMO_SERVICE_PORT}`;

const parseNetwork = (value: string | undefined) => {
  const network = value ?? BASE_SEPOLIA_NETWORK;
  if (!isX402Network(network)) {
    throw new Error(`X402_NETWORK must be a CAIP-style network id, received "${network}".`);
  }

  return network;
};

export const config: BuyerAgentConfig = {
  endpointUrl: `${process.env.DEMO_SERVICE_URL ?? defaultServiceUrl}/weather`,
  network: parseNetwork(process.env.X402_NETWORK),
  privateKey: parsePrivateKey(process.env.EVM_PRIVATE_KEY)
};
