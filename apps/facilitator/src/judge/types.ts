import type { JudgeRequestBody, JudgeResult, TaskType } from "@verifier-facilitator/shared";

export type Rubric = (params: {
  task_type: TaskType;
  input: unknown;
  output: unknown;
}) => Promise<JudgeResult>;

export type { JudgeRequestBody, JudgeResult, TaskType };
