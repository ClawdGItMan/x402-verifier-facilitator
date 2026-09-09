import { z } from "zod";
import {
  getScenario,
  taskIds,
  type Dimension,
  type Judgment,
} from "./scenarios";

export const requestSchema = z
  .object({
    task: z.enum(taskIds),
    artifact: z.string().min(1).max(12000),
    policy: z.enum(["stepped", "schema", "judge", "consensus", "optimistic"]),
    network: z.literal("solana-devnet"),
    amount: z.number().finite().min(0.001).max(1000),
    judgeMode: z.enum(["fixture", "live"]).default("fixture"),
  })
  .strict();
export type VerificationRequest = z.infer<typeof requestSchema>;
export type Check = {
  name: string;
  status: "pass" | "fail" | "hold";
  detail: string;
};
export type Verdict = "pass" | "reject" | "hold";
export type Evaluation = {
  verdict: Verdict;
  reason: string;
  checks: Check[];
  dimensions: Dimension[];
  score: number | null;
  confidence: number | null;
  votes: number[];
  method: string;
  judgeSource: "none" | "authored-fixture" | "live-model";
  estimatedCost: number;
  rubricVersion: string;
};
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export function outputSchema(task: VerificationRequest["task"]) {
  const fields = getScenario(task).fields;
  return z
    .object(
      Object.fromEntries(
        Object.entries(fields).map(([key, type]) => [
          key,
          type === "number"
            ? z.number().finite()
            : type === "array"
              ? z.array(z.string().min(1).max(1000)).max(20)
              : z.string().min(1).max(8000),
        ]),
      ),
    )
    .strict();
}
export function deterministicChecks(request: VerificationRequest): {
  checks: Check[];
  output?: Record<string, unknown>;
} {
  const checks: Check[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(request.artifact);
  } catch {
    return {
      checks: [
        {
          name: "JSON parsing",
          status: "fail",
          detail:
            "The deliverable is not valid JSON. Fix syntax before evaluating its contents.",
        },
      ],
    };
  }
  checks.push({
    name: "JSON parsing",
    status: "pass",
    detail: "The submitted artifact is valid JSON.",
  });
  const validated = outputSchema(request.task).safeParse(parsed);
  if (!validated.success) {
    checks.push({
      name: "Schema validation",
      status: "fail",
      detail: validated.error.issues
        .map((i) => `${i.path.join(".") || "output"}: ${i.message}`)
        .join("; "),
    });
    return { checks };
  }
  const output = validated.data;
  checks.push({
    name: "Schema validation",
    status: "pass",
    detail: "All required fields have the correct types; no unknown fields.",
  });
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, status: pass ? "pass" : "fail", detail });
  if (request.task === "extraction" || request.task === "custom") {
    const reference = getScenario(request.task).presets[0]!.output;
    for (const [key, expected] of Object.entries(reference))
      add(
        `${request.task === "extraction" ? "Source" : "Contract"} · ${key}`,
        output[key] === expected,
        `Expected ${JSON.stringify(expected)}; received ${JSON.stringify(output[key])}.`,
      );
  }
  if (request.task === "code") {
    const ops = output.operations as string[];
    const allowed =
      ops.length > 0 &&
      ops.every((op) =>
        ["sum", "count", "divide-by-count", "round"].includes(op),
      );
    add(
      "Allowed operations",
      allowed,
      "Only the bounded operation language is interpreted. Arbitrary code is never executed.",
    );
    if (allowed)
      for (const input of [[2, 4, 6], [], [-4, 2], [1, 2], [0, 0, 0], [10]]) {
        let result = 0;
        for (const op of ops) {
          if (op === "sum") result = input.reduce((a, b) => a + b, 0);
          if (op === "count") result = input.length;
          if (op === "divide-by-count")
            result = input.length === 0 ? 0 : result / input.length;
          if (op === "round") result = Math.round(result);
        }
        const expected =
          input.length === 0
            ? 0
            : input.reduce((a, b) => a + b, 0) / input.length;
        add(
          `Test · [${input.join(", ")}]`,
          result === expected,
          `Expected ${expected}; program returned ${result}.`,
        );
      }
  }
  if (request.task === "summary")
    add(
      "Length constraint",
      (output.summary as string).length <= 360,
      `${(output.summary as string).length} / 360 characters.`,
    );
  if (request.task === "translation") {
    const nums = (output.translation as string).match(/\d+(?:\.\d+)?/g) ?? [];
    add(
      "Quantity preservation",
      canonical(nums.slice().sort()) === canonical(["3", "24", "12"].sort()),
      `Required quantities: 3, 24, 12. Found: ${nums.join(", ") || "none"}.`,
    );
    add(
      "Currency preservation",
      /\bUSDC\b/.test(output.translation as string),
      "The output must preserve USDC.",
    );
  }
  if (request.task === "creative")
    add(
      "Length constraint",
      (output.content as string).length >= 40 &&
        (output.content as string).length <= 400,
      `${(output.content as string).length} characters; allowed range is 40–400.`,
    );
  if (request.task === "analysis")
    add(
      "Actionable output present",
      (output.recommendations as string[]).length > 0,
      "At least one non-empty recommendation is required.",
    );
  const injection =
    /ignore (?:all |the |previous |prior |system )*instructions|release (?:the )?payment|score (?:of )?100|you are now|system\s*:/i.test(
      request.artifact,
    );
  if (injection)
    checks.push({
      name: "Instruction injection screen",
      status: "hold",
      detail:
        "Possible instructions aimed at the verifier. Hold for review. This heuristic is not a comprehensive injection defense.",
    });
  return { checks, output };
}
export const judgmentSchema = z
  .object({
    dimensions: z
      .array(
        z
          .object({
            name: z.string().min(1).max(80),
            score: z.number().finite().min(0).max(100),
            reason: z.string().min(1).max(500),
          })
          .strict(),
      )
      .length(4)
      .refine(
        (dimensions) =>
          dimensions.every(
            (dimension, index) =>
              dimension.name ===
              ["Grounding", "Completeness", "Clarity", "Instruction following"][
                index
              ],
          ),
        "The four named rubric dimensions must be returned exactly once in the declared order.",
      ),
    confidence: z.number().finite().min(0).max(1),
    votes: z.array(z.number().finite().min(0).max(100)).min(1).max(5),
  })
  .strict();
export function evaluate(
  request: VerificationRequest,
  liveJudgment?: Judgment,
): Evaluation {
  const scenario = getScenario(request.task);
  const { checks, output } = deterministicChecks(request);
  const base: Evaluation = {
    verdict: "hold",
    reason: "Review required.",
    checks,
    dimensions: [],
    score: null,
    confidence: null,
    votes: [],
    method: "Deterministic checks",
    judgeSource: "none",
    estimatedCost: 0,
    rubricVersion: "2026-09-09.1",
  };
  if (checks.some((c) => c.status === "fail"))
    return {
      ...base,
      verdict: "reject",
      reason:
        "A required check failed. Payment is blocked; no model can override this failure.",
    };
  if (checks.some((c) => c.status === "hold"))
    return {
      ...base,
      reason:
        "The artifact contains a possible verifier instruction. Payment remains held.",
    };
  if (!scenario.subjective)
    return {
      ...base,
      verdict: "pass",
      reason: "The submitted output passed every declared deterministic check.",
    };
  if (request.policy === "schema")
    return {
      ...base,
      reason:
        "Structure passed, but this task requires a semantic judgment. A valid schema alone cannot authorize payment.",
      checks: [
        ...checks,
        {
          name: "Subjective acceptance criteria",
          status: "hold",
          detail: "Deterministic-only policy cannot evaluate these criteria.",
        },
      ],
    };
  const fixture = scenario.presets.find(
    (p) => canonical(p.output) === canonical(output),
  );
  const candidate =
    request.judgeMode === "live" ? liveJudgment : fixture?.judgment;
  const validated = judgmentSchema.safeParse(candidate);
  if (!validated.success)
    return {
      ...base,
      reason:
        request.judgeMode === "live"
          ? "No valid live judgment was returned. Payment stays held."
          : "This edited output has no authored demo judgment. Deterministic checks ran; enable a live judge or demonstrate human review for semantic evaluation.",
      method: "Awaiting semantic review",
    };
  const judgment = validated.data;
  const score = judgment.dimensions.reduce((sum, d) => sum + d.score, 0) / 4;
  const panel =
    request.policy === "consensus" ||
    (request.policy === "stepped" && judgment.confidence < 0.8);
  if (panel && request.judgeMode === "live")
    return {
      ...base,
      reason:
        "Live cross-provider consensus is not configured. A single model cannot stand in for an independent panel.",
      score,
      dimensions: judgment.dimensions,
      confidence: judgment.confidence,
      judgeSource: "live-model",
      method: "Panel required",
    };
  const votes = panel ? judgment.votes : [];
  const spread = panel ? Math.max(...votes) - Math.min(...votes) : 0;
  const worst = judgment.dimensions[0]!.score;
  let verdict: Verdict = "pass";
  let reason = "The work meets the selected rubric and confidence threshold.";
  if (score < 40 || worst < 40) {
    verdict = "reject";
    reason =
      "The work fails the quality rubric. Fluent text cannot compensate for a grounding failure.";
  } else if (
    score < 70 ||
    worst < 70 ||
    judgment.confidence < 0.8 ||
    (panel && (votes.length < 3 || spread > 25 || votes.some((v) => v < 70)))
  ) {
    verdict = "hold";
    reason =
      spread > 25
        ? "The judges disagree by more than 25 points. Payment stays held despite the average score."
        : "Quality or confidence is below the release threshold. Escalate to review.";
  }
  return {
    ...base,
    verdict,
    reason,
    score,
    dimensions: judgment.dimensions,
    confidence: judgment.confidence,
    votes,
    method: panel ? "Multi-judge consensus" : "LLM rubric",
    judgeSource:
      request.judgeMode === "live" ? "live-model" : "authored-fixture",
    estimatedCost: panel ? 0.06 : 0.02,
    checks: [
      ...checks,
      {
        name: "Semantic quality",
        status: verdict === "reject" ? "fail" : verdict,
        detail: reason,
      },
    ],
  };
}
