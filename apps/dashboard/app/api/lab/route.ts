import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import {
  deterministicChecks,
  evaluate,
  requestSchema,
} from "../../../lib/verification/engine";
import { getScenario } from "../../../lib/verification/scenarios";
import { DemoLedger } from "../../../lib/verification/receipts";
import { runLiveJudge } from "../../../lib/verification/live-judge";
import { runTimedVerification } from "../../../lib/verification/timed-verification";
import { loadRootEnv } from "../agent/env";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const ledger = new DemoLedger();
const bodySchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("verify"), request: requestSchema }).strict(),
  z
    .object({
      operation: z.literal("settle"),
      request: requestSchema,
      id: z.string().uuid(),
      token: z.string().regex(/^[a-f0-9]{64}$/),
      action: z.enum(["release", "challenge", "approve", "reject"]),
      rationale: z.string().max(1000).default(""),
    })
    .strict(),
]);
function authorized(request: Request) {
  const secret = process.env.LAB_LIVE_JUDGE_TOKEN;
  const token =
    request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (
    !secret ||
    !process.env.ANTHROPIC_API_KEY ||
    process.env.LAB_ENABLE_LIVE_JUDGE !== "true"
  )
    return false;
  const a = Buffer.from(secret),
    b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function GET() {
  loadRootEnv();
  return Response.json(
    {
      liveJudgeAvailable:
        process.env.LAB_ENABLE_LIVE_JUDGE === "true" &&
        !!process.env.ANTHROPIC_API_KEY &&
        !!process.env.LAB_LIVE_JUDGE_TOKEN,
      simulation: true,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  try {
    loadRootEnv();
    const reader = request.body?.getReader();
    if (!reader)
      return Response.json(
        { error: "Request body required." },
        { status: 400 },
      );
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 20000) {
        await reader.cancel();
        return Response.json(
          { error: "Request exceeds the demo size limit." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const parsed = bodySchema.safeParse(
      JSON.parse(Buffer.concat(chunks).toString("utf8")),
    );
    if (!parsed.success)
      return Response.json(
        {
          error:
            "Invalid demo request. Check task, JSON artifact, policy, network, and amount.",
        },
        { status: 400 },
      );
    const body = parsed.data;
    if (body.operation === "settle")
      return Response.json(
        ledger.transition(
          body.id,
          body.token,
          body.request,
          body.action,
          body.rationale,
        ),
        { headers: { "Cache-Control": "no-store" } },
      );
    if (body.request.judgeMode === "live") {
      if (!authorized(request))
        return Response.json(
          {
            error:
              "Live judging requires server configuration and a valid demo access token. The public fixture demo is available without a token.",
          },
          { status: 403 },
        );
    }
    const { verification, timing } = await runTimedVerification(
      body.request,
      async () => {
        let judgment;
        const { checks } = deterministicChecks(body.request);
        if (
          body.request.judgeMode === "live" &&
          getScenario(body.request.task).subjective &&
          body.request.policy !== "schema" &&
          checks.every((c) => c.status === "pass")
        )
          judgment = await runLiveJudge(body.request, request.signal);
        return evaluate(body.request, judgment);
      },
      { signal: request.signal },
    );
    return Response.json(
      ledger.issue(body.request, verification, Date.now(), timing),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? "Invalid JSON request."
        : error instanceof Error
          ? error.message
          : "Verification failed. Payment remains held.";
    return Response.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
