import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export const getAnthropicClient = (): Anthropic => {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY env var is required for AI-backed demo endpoints."
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
};

export const DEMO_MODEL = (process.env.DEMO_MODEL ?? "claude-haiku-4-5") as
  | "claude-haiku-4-5"
  | "claude-sonnet-4-6"
  | "claude-opus-4-7";
