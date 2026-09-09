import type { Request, Response } from "express";

import { config } from "../config.js";
import { DEMO_MODEL, getAnthropicClient } from "../anthropic.js";

interface SummarizeBody {
  source: string;
  max_length: number;
  mode?: "normal" | "bad";
}

const isSummarizeBody = (value: unknown): value is SummarizeBody => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.source !== "string" || v.source.length === 0) return false;
  if (typeof v.max_length !== "number" || v.max_length <= 0) return false;
  if (v.mode !== undefined && v.mode !== "normal" && v.mode !== "bad") return false;
  return true;
};

const BAD_SUMMARY = "This is a summary about stuff. The text mentioned things.";

const generateSummary = async (
  source: string,
  max_length: number
): Promise<string> => {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: DEMO_MODEL,
    max_tokens: 1024,
    system: `You are a concise summarizer. Write a faithful, coherent summary of the user's text. Stay under ${max_length} characters. Return only the summary text — no preamble or commentary.`,
    messages: [{ role: "user", content: source }]
  });

  let text = "";
  for (const block of response.content) {
    if (block.type === "text") {
      text += block.text;
    }
  }
  return text.trim();
};

export const summarizeHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!isSummarizeBody(req.body)) {
    res.status(400).json({
      error: "invalid_request",
      message:
        "Body must be { source: string, max_length: number > 0, mode?: 'normal' | 'bad' }."
    });
    return;
  }

  const { source, max_length, mode = "normal" } = req.body;

  let summary: string;
  let model: string;
  try {
    if (mode === "bad") {
      summary = BAD_SUMMARY;
      model = "stub-bad-mode";
    } else {
      summary = await generateSummary(source, max_length);
      model = DEMO_MODEL;
    }
  } catch (error) {
    res.status(500).json({
      error: "summarization_failed",
      message: error instanceof Error ? error.message : "Unknown summarization error."
    });
    return;
  }

  let judgeResult: unknown;
  try {
    const judgeResp = await fetch(`${config.facilitatorUrl}/judge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        task_type: "summarization",
        input: { source, max_length },
        output: { summary }
      })
    });

    if (!judgeResp.ok) {
      const body = (await judgeResp.json().catch(() => ({}))) as Record<string, unknown>;
      res.status(502).json({
        error: "judge_unavailable",
        message: `Judge returned ${judgeResp.status}.`,
        details: body
      });
      return;
    }

    judgeResult = await judgeResp.json();
  } catch (error) {
    res.status(502).json({
      error: "judge_unavailable",
      message: error instanceof Error ? error.message : "Could not reach judge."
    });
    return;
  }

  if (
    typeof judgeResult !== "object" ||
    judgeResult === null ||
    typeof (judgeResult as { pass?: unknown }).pass !== "boolean"
  ) {
    res.status(502).json({
      error: "judge_invalid_response",
      message: "Judge returned an unexpected shape."
    });
    return;
  }

  const judge = judgeResult as { pass: boolean; score: number };

  if (!judge.pass) {
    res.status(402).json({
      error: "quality_rejected",
      message: "Verifier facilitator rejected the work; payment was not settled.",
      judge: judgeResult,
      summary,
      meta: { mode, model, task_type: "summarization" }
    });
    return;
  }

  res.json({
    summary,
    judge: judgeResult,
    meta: { mode, model, task_type: "summarization" }
  });
};
