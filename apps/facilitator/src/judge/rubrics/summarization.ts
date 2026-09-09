import { performance } from "node:perf_hooks";

import type { JudgeResult } from "@verifier-facilitator/shared";
import { THRESHOLD_PASS, THRESHOLD_REJECT } from "@verifier-facilitator/shared";

import { JUDGE_MODEL, computeCostUsd, getAnthropicClient } from "../models.js";

const RUBRIC_VERSION = "v1.0-summarization";

const SYSTEM_PROMPT = `You are an expert evaluator of text summaries. Given a SOURCE text and a CANDIDATE SUMMARY, score the candidate on four dimensions, each from 0 to 10:

1. faithfulness — The summary contains no facts absent from or contradicted by the source. 10 = fully faithful; 0 = contains hallucinations or contradictions.
2. coverage — The summary captures the source's key points. 10 = all major points present; 0 = misses critical content.
3. coherence — The summary is well-structured, clear, and readable. 10 = polished; 0 = incoherent.
4. length_compliance — The summary respects the requested max_length constraint. 10 = within constraint; 0 = significantly over.

Return STRICT JSON in this exact shape and nothing else:
{
  "faithfulness": {"score": <integer 0-10>, "reason": "<one short sentence>"},
  "coverage": {"score": <integer 0-10>, "reason": "<one short sentence>"},
  "coherence": {"score": <integer 0-10>, "reason": "<one short sentence>"},
  "length_compliance": {"score": <integer 0-10>, "reason": "<one short sentence>"}
}

No preamble, no commentary, no markdown fences — only the JSON object.`;

interface SummarizeInput {
  source: string;
  max_length: number;
}

interface SummarizeOutput {
  summary: string;
}

interface RubricDimensions {
  faithfulness: { score: number; reason: string };
  coverage: { score: number; reason: string };
  coherence: { score: number; reason: string };
  length_compliance: { score: number; reason: string };
}

const isSummarizeInput = (v: unknown): v is SummarizeInput => {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.source === "string" && typeof r.max_length === "number";
};

const isSummarizeOutput = (v: unknown): v is SummarizeOutput => {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.summary === "string";
};

const isRubricDimensions = (v: unknown): v is RubricDimensions => {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  for (const key of ["faithfulness", "coverage", "coherence", "length_compliance"]) {
    const dim = r[key];
    if (typeof dim !== "object" || dim === null) return false;
    const d = dim as Record<string, unknown>;
    if (typeof d.score !== "number") return false;
    if (typeof d.reason !== "string") return false;
  }
  return true;
};

const stripCodeFence = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  return trimmed;
};

const clamp10 = (n: number): number => Math.max(0, Math.min(10, Math.round(n)));

export const summarizationRubric = async (params: {
  task_type: "summarization";
  input: unknown;
  output: unknown;
}): Promise<JudgeResult> => {
  const { input, output } = params;

  if (!isSummarizeInput(input)) {
    throw new Error(
      "Summarization rubric expects input { source: string, max_length: number }."
    );
  }

  if (!isSummarizeOutput(output)) {
    throw new Error("Summarization rubric expects output { summary: string }.");
  }

  const userPrompt = `SOURCE:
${input.source}

CANDIDATE SUMMARY (requested max length: ${input.max_length} characters; actual length: ${output.summary.length}):
${output.summary}

Evaluate the candidate summary against the source.`;

  const startedAt = performance.now();

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }]
  });

  const latency_ms = Math.round(performance.now() - startedAt);

  let rawText = "";
  for (const block of response.content) {
    if (block.type === "text") {
      rawText += block.text;
    }
  }

  if (!rawText) {
    throw new Error("Judge response contained no text block.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(rawText));
  } catch (error) {
    throw new Error(
      `Judge returned invalid JSON: ${(error as Error).message}. Raw: ${rawText.slice(0, 200)}`
    );
  }

  if (!isRubricDimensions(parsed)) {
    throw new Error("Judge JSON did not match expected rubric schema.");
  }

  const dims = {
    faithfulness: { score: clamp10(parsed.faithfulness.score), reason: parsed.faithfulness.reason },
    coverage: { score: clamp10(parsed.coverage.score), reason: parsed.coverage.reason },
    coherence: { score: clamp10(parsed.coherence.score), reason: parsed.coherence.reason },
    length_compliance: {
      score: clamp10(parsed.length_compliance.score),
      reason: parsed.length_compliance.reason
    }
  };

  const aggregateScore = Math.round(
    ((dims.faithfulness.score +
      dims.coverage.score +
      dims.coherence.score +
      dims.length_compliance.score) /
      4) *
      10
  );

  const pass = aggregateScore >= THRESHOLD_PASS;
  const reject = aggregateScore < THRESHOLD_REJECT;
  const gray_zone = !pass && !reject;

  const cost_usd = computeCostUsd(
    JUDGE_MODEL,
    response.usage.input_tokens,
    response.usage.output_tokens
  );

  return {
    task_type: "summarization",
    score: aggregateScore,
    pass,
    reject,
    gray_zone,
    dimensions: dims,
    model: JUDGE_MODEL,
    rubric_version: RUBRIC_VERSION,
    latency_ms,
    cost_usd,
    token_usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens
    }
  };
};
