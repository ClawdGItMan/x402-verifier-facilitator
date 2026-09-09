import { setTimeout as delay } from "node:timers/promises";
import type { Evaluation, VerificationRequest } from "./engine";
import { timingPlan, type VerificationTiming } from "./timing";

export async function runTimedVerification(
  request: VerificationRequest,
  evaluate: () => Evaluation | Promise<Evaluation>,
  options: {
    signal?: AbortSignal;
    now?: () => number;
    wait?: (ms: number, signal?: AbortSignal) => Promise<void>;
  } = {},
): Promise<{ verification: Evaluation; timing: VerificationTiming }> {
  const now = options.now ?? (() => performance.now());
  const wait =
    options.wait ?? ((ms, signal) => delay(ms, undefined, { signal }));
  const started = now();
  options.signal?.throwIfAborted();
  const verification = await evaluate();
  options.signal?.throwIfAborted();
  const plan = timingPlan(request, verification);
  const remaining = plan.modeledMs - (now() - started);
  if (remaining > 0) await wait(remaining, options.signal);
  options.signal?.throwIfAborted();
  return {
    verification,
    timing: {
      ...plan,
      elapsedMs: Math.max(0, Math.round(now() - started)),
      basis: plan.modeledMs > 0 ? "illustrative" : "measured",
    },
  };
}
