import express from "express";

import { config } from "./config.js";
import { addEventClient, emitFacilitatorEvent, facilitatorEventStreamHeaders } from "./events.js";
import { dispatchToRubric, isSupportedTaskType } from "./judge/dispatch.js";
import { appendTransaction } from "./logging.js";
import { proxyToUpstream } from "./proxy.js";

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, PAYMENT-SIGNATURE");
  res.setHeader("Access-Control-Expose-Headers", "PAYMENT-REQUIRED, PAYMENT-RESPONSE");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    upstream: config.upstreamUrl
  });
});

app.get("/supported", (req, res) => {
  void proxyToUpstream("supported", req, res);
});

app.get("/events", (req, res) => {
  res.writeHead(200, facilitatorEventStreamHeaders);
  addEventClient(res);

  req.on("close", () => {
    res.end();
  });
});

app.post("/verify", (req, res) => {
  void proxyToUpstream("verify", req, res);
});

app.post("/settle", (req, res) => {
  void proxyToUpstream("settle", req, res);
});

app.post("/judge", async (req, res) => {
  const body = req.body as unknown;
  if (
    typeof body !== "object" ||
    body === null ||
    !isSupportedTaskType((body as { task_type?: unknown }).task_type)
  ) {
    res.status(400).json({
      error: "invalid_request",
      message:
        "Body must be { task_type: <supported>, input: {...}, output: {...} }."
    });
    return;
  }

  const { task_type, input, output } = body as {
    task_type: ReturnType<typeof unpack>;
    input: unknown;
    output: unknown;
  };

  try {
    const result = await dispatchToRubric({ task_type, input, output });

    appendTransaction({
      task_type: result.task_type,
      endpoint: "/judge",
      input,
      output,
      judge_result: result,
      outcome: result.pass ? "settled" : "rejected"
    });

    emitFacilitatorEvent({
      endpoint: "judge",
      method: "POST",
      status: 200,
      elapsedMs: result.latency_ms
    });

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown judge error.";
    console.error({ error: message }, "judge dispatch failed");
    emitFacilitatorEvent({
      endpoint: "judge",
      method: "POST",
      status: 500,
      elapsedMs: 0
    });
    res.status(500).json({ error: "judge_error", message });
  }
});

const unpack = (value: unknown) => value as never;

app.listen(config.port, () => {
  console.log(`Verifier facilitator listening at http://localhost:${config.port}`);
  console.log(`Proxying x402 facilitator requests to ${config.upstreamUrl}`);
});
