export type TaskType =
  | "structured-extraction"
  | "code-generation"
  | "summarization"
  | "translation"
  | "creative-writing"
  | "strategic-analysis"
  | "generic";

export interface RubricDimension {
  score: number;
  reason: string;
}

export interface JudgeResult {
  task_type: TaskType;
  score: number;
  pass: boolean;
  reject: boolean;
  gray_zone: boolean;
  dimensions: Record<string, RubricDimension>;
  model: string;
  rubric_version: string;
  latency_ms: number;
  cost_usd: number;
  token_usage: {
    input: number;
    output: number;
  };
}

export interface JudgeRequestBody {
  task_type: TaskType;
  input: unknown;
  output: unknown;
}

export interface TransactionLog {
  id: string;
  timestamp: string;
  task_type: TaskType;
  endpoint: string;
  input_summary: string;
  output_summary: string;
  judge_score: number;
  judge_pass: boolean;
  judge_model: string;
  rubric_version: string;
  latency_ms: number;
  cost_usd: number;
  outcome: "approved" | "settled" | "rejected" | "error";
  error: string | null;
  judge_result_json: string;
}
