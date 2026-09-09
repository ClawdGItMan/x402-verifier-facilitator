import {
  resolveAgentPaymentOptionsFromEnv,
  runAgentWeatherPayment
} from "@verifier-facilitator/agent-pay";

import { loadRootEnv } from "../env";

export const dynamic = "force-dynamic";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Server-wallet payments are disabled on public deployments. Use the local testnet dashboard." }, { status: 403 });
  }
  loadRootEnv();
  const encoder = new TextEncoder();
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  const write = async (payload: unknown) => {
    await writer.write(encoder.encode(`${JSON.stringify(payload)}\n`));
  };

  void (async () => {
    try {
      const options = resolveAgentPaymentOptionsFromEnv();
      const result = await runAgentWeatherPayment({
        ...options,
        onEvent: async (event) => {
          await write({
            type: "event",
            event
          });
        }
      });

      await write({
        type: "result",
        ok: result.status >= 200 && result.status < 300,
        mode: "agent",
        result
      });
    } catch (error) {
      await write({
        type: "error",
        ok: false,
        mode: "agent",
        error: error instanceof Error ? error.message : "Unknown agent payment error"
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform"
    }
  });
}
