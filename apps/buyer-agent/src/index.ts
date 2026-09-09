import { runAgentWeatherPayment } from "@verifier-facilitator/agent-pay";

import { config } from "./config.js";

const result = await runAgentWeatherPayment({
  endpointUrl: config.endpointUrl,
  network: config.network,
  privateKey: config.privateKey,
  onEvent: async (event) => {
    console.log(`[${event.step}] ${event.label}`);
    if (event.detail) {
      console.log(JSON.stringify(event.detail, null, 2));
    }
  }
});

console.log(`Status: ${result.status} ${result.statusText}`);
console.log(`Elapsed: ${result.elapsedMs}ms`);
console.log("Settlement:");
console.log(JSON.stringify(result.settlement, null, 2));
console.log("Body:");
console.log(JSON.stringify(result.body, null, 2));

if (result.status < 200 || result.status >= 300) {
  process.exitCode = 1;
}
