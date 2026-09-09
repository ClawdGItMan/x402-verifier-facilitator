import Anthropic from "@anthropic-ai/sdk";

let anthropicClient: Anthropic | null = null;

export const getAnthropicClient = (): Anthropic => {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY env var is required for the judge module.");
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
};

export const JUDGE_MODEL = (process.env.JUDGE_MODEL ?? "claude-sonnet-4-6") as
  | "claude-sonnet-4-6"
  | "claude-opus-4-7"
  | "claude-haiku-4-5";

const PRICING_PER_M_TOKENS_USD: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-opus-4-7": { input: 5.0, output: 25.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 }
};

export const computeCostUsd = (
  model: string,
  input_tokens: number,
  output_tokens: number
): number => {
  const rates = PRICING_PER_M_TOKENS_USD[model];
  if (!rates) return 0;
  const inputCost = (input_tokens / 1_000_000) * rates.input;
  const outputCost = (output_tokens / 1_000_000) * rates.output;
  return Number((inputCost + outputCost).toFixed(6));
};
