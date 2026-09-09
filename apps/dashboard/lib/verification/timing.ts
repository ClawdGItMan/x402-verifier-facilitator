import type { Evaluation, VerificationRequest } from "./engine";

export type TimingPlan = {
  kind: "checks" | "single" | "parallel" | "escalation" | "live";
  modeledMs: number;
};
export type VerificationTiming = TimingPlan & {
  elapsedMs: number;
  basis: "illustrative" | "measured";
};

// Presentation assumptions, not a provider benchmark or an SLA. Panels run
// concurrently; stepped escalation adds a second round after the first judge.
export function timingPlan(
  request: VerificationRequest,
  evaluation?: Evaluation,
): TimingPlan {
  if (request.judgeMode === "live") return { kind: "live", modeledMs: 0 };
  if (evaluation?.judgeSource !== "authored-fixture")
    return { kind: "checks", modeledMs: 0 };
  if (evaluation.method === "Multi-judge consensus")
    return request.policy === "stepped"
      ? { kind: "escalation", modeledMs: 16000 }
      : { kind: "parallel", modeledMs: 10000 };
  return { kind: "single", modeledMs: 8000 };
}

export function timingPhase(plan: TimingPlan, elapsedMs: number): string {
  if (plan.kind === "live") return "Awaiting complete judge response";
  if (plan.kind === "checks") return "Running deterministic checks";
  if (elapsedMs < 200) return "Checking structure and hard constraints";
  if (plan.kind === "escalation" && elapsedMs >= 8000)
    return "Escalating to an independent panel";
  if (plan.kind === "parallel") return "Evaluating with judges in parallel";
  return "Evaluating the acceptance rubric";
}
