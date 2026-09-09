import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";

import { config } from "./config.js";

const facilitatorClient = new HTTPFacilitatorClient({
  url: config.facilitatorUrl
});

export const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(config.network, new ExactEvmScheme())
  .onAfterVerify(async ({ result }) => {
    console.info({ result }, "x402 payment verified");
  })
  .onAfterSettle(async ({ result }) => {
    console.info({ result }, "x402 payment settled");
  });

export const x402Middleware = paymentMiddleware(
  {
    "GET /weather": {
      accepts: {
        scheme: "exact",
        price: config.price,
        network: config.network,
        payTo: config.sellerAddress
      },
      description: "Baseline paid weather payload for Verifier Facilitator x402",
      mimeType: "application/json"
    },
    "POST /summarize": {
      accepts: {
        scheme: "exact",
        price: config.summarizePrice,
        network: config.network,
        payTo: config.sellerAddress
      },
      description:
        "Verified summarization — payment is gated by LLM-as-judge quality verification on the local facilitator.",
      mimeType: "application/json"
    }
  },
  resourceServer
);
