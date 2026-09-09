import type { Request, Response } from "express";
import { performance } from "node:perf_hooks";

import { config } from "./config.js";
import { emitFacilitatorEvent } from "./events.js";

type FacilitatorEndpoint = "supported" | "verify" | "settle";

const endpointMethods: Record<FacilitatorEndpoint, "GET" | "POST"> = {
  supported: "GET",
  verify: "POST",
  settle: "POST"
};

const responseBody = async (response: globalThis.Response) => {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
};

const requestBody = (endpoint: FacilitatorEndpoint, req: Request) => {
  if (endpoint === "supported") {
    return undefined;
  }

  return JSON.stringify(req.body);
};

export const proxyToUpstream = async (
  endpoint: FacilitatorEndpoint,
  req: Request,
  res: Response
) => {
  const startedAt = performance.now();
  const upstreamEndpoint = `${config.upstreamUrl}/${endpoint}`;
  const method = endpointMethods[endpoint];

  try {
    const upstreamResponse = await fetch(upstreamEndpoint, {
      method,
      headers: {
        "content-type": "application/json",
        accept: "application/json"
      },
      body: requestBody(endpoint, req),
      redirect: "follow"
    });

    const body = await responseBody(upstreamResponse);
    const elapsedMs = Math.round(performance.now() - startedAt);

    console.info(
      {
        endpoint,
        method,
        status: upstreamResponse.status,
        elapsedMs
      },
      "facilitator proxy forwarded request"
    );

    emitFacilitatorEvent({
      endpoint,
      method,
      status: upstreamResponse.status,
      elapsedMs
    });

    res.status(upstreamResponse.status).json(body);
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - startedAt);
    const message = error instanceof Error ? error.message : "Unknown upstream error";

    console.error(
      {
        endpoint,
        method,
        elapsedMs,
        error: message
      },
      "facilitator proxy failed"
    );

    emitFacilitatorEvent({
      endpoint,
      method,
      status: 502,
      elapsedMs
    });

    res.status(502).json({
      error: "upstream_facilitator_error",
      message
    });
  }
};
