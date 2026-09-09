import type { JudgeResult, TaskType } from "@verifier-facilitator/shared";

import { summarizationRubric } from "./rubrics/summarization.js";

const SUPPORTED_TASK_TYPES: TaskType[] = ["summarization"];

export const isSupportedTaskType = (value: unknown): value is TaskType =>
  typeof value === "string" && (SUPPORTED_TASK_TYPES as string[]).includes(value);

export const dispatchToRubric = async (params: {
  task_type: TaskType;
  input: unknown;
  output: unknown;
}): Promise<JudgeResult> => {
  switch (params.task_type) {
    case "summarization":
      return summarizationRubric({
        task_type: "summarization",
        input: params.input,
        output: params.output
      });
    default:
      throw new Error(
        `No rubric registered for task_type "${params.task_type}". V1 supports only: ${SUPPORTED_TASK_TYPES.join(", ")}.`
      );
  }
};
