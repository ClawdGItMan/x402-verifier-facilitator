import express from "express";

import { config } from "./config.js";
import { summarizeHandler } from "./endpoints/summarize.js";
import { x402Middleware } from "./x402.js";

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

app.use(express.json());
app.use(x402Middleware);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/weather", (_req, res) => {
  res.json({
    report: {
      weather: "sunny",
      temperature: 70,
      unit: "fahrenheit"
    },
    paid: true,
    service: "verified-ai-work-baseline"
  });
});

app.post("/summarize", (req, res) => {
  void summarizeHandler(req, res);
});

app.listen(config.port, () => {
  console.log(`Demo service listening at http://localhost:${config.port}`);
  console.log(`Paid routes:`);
  console.log(`  GET  http://localhost:${config.port}/weather`);
  console.log(`  POST http://localhost:${config.port}/summarize`);
});
