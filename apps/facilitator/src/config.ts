import "dotenv/config";

import {
  DEFAULT_FACILITATOR_URL,
  DEFAULT_LOCAL_FACILITATOR_PORT
} from "@verifier-facilitator/shared";

export type FacilitatorConfig = {
  port: number;
  upstreamUrl: string;
};

const parsePort = (value: string | undefined) => {
  if (!value) {
    return DEFAULT_LOCAL_FACILITATOR_PORT;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`FACILITATOR_PORT must be a valid port, received "${value}".`);
  }

  return parsed;
};

const parseUpstreamUrl = (value: string | undefined) => {
  const upstreamUrl = value ?? DEFAULT_FACILITATOR_URL;

  try {
    return new URL(upstreamUrl).toString().replace(/\/+$/, "");
  } catch {
    throw new Error(`UPSTREAM_FACILITATOR_URL must be a valid URL, received "${upstreamUrl}".`);
  }
};

export const config: FacilitatorConfig = {
  port: parsePort(process.env.FACILITATOR_PORT),
  upstreamUrl: parseUpstreamUrl(process.env.UPSTREAM_FACILITATOR_URL)
};
