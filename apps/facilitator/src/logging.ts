import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

import type { JudgeResult, TaskType, TransactionLog } from "@verifier-facilitator/shared";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_DIR = path.resolve(moduleDir, "../../../data");
const DEFAULT_DB_FILE = "transactions.db";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    task_type TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    input_summary TEXT NOT NULL,
    output_summary TEXT NOT NULL,
    judge_score INTEGER NOT NULL,
    judge_pass INTEGER NOT NULL,
    judge_model TEXT NOT NULL,
    rubric_version TEXT NOT NULL,
    latency_ms INTEGER NOT NULL,
    cost_usd REAL NOT NULL,
    outcome TEXT NOT NULL,
    error TEXT,
    judge_result_json TEXT NOT NULL
  )
`;

let db: Database.Database | null = null;

const ensureDb = (): Database.Database => {
  if (db) return db;

  const dbPath =
    process.env.SQLITE_PATH ?? path.join(DEFAULT_DB_DIR, DEFAULT_DB_FILE);
  const dbDir = path.dirname(dbPath);
  fs.mkdirSync(dbDir, { recursive: true });

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.prepare(CREATE_TABLE_SQL).run();

  return db;
};

const truncate = (value: string, max = 500): string =>
  value.length > max ? `${value.slice(0, max)}…` : value;

export interface AppendArgs {
  task_type: TaskType;
  endpoint: string;
  input: unknown;
  output: unknown;
  judge_result: JudgeResult;
  outcome: "settled" | "rejected" | "error";
  error?: string | null;
}

const INSERT_SQL = `
  INSERT INTO transactions (
    id, timestamp, task_type, endpoint, input_summary, output_summary,
    judge_score, judge_pass, judge_model, rubric_version, latency_ms, cost_usd,
    outcome, error, judge_result_json
  ) VALUES (
    @id, @timestamp, @task_type, @endpoint, @input_summary, @output_summary,
    @judge_score, @judge_pass, @judge_model, @rubric_version, @latency_ms, @cost_usd,
    @outcome, @error, @judge_result_json
  )
`;

export const appendTransaction = (args: AppendArgs): TransactionLog => {
  const database = ensureDb();

  const log: TransactionLog = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    task_type: args.task_type,
    endpoint: args.endpoint,
    input_summary: truncate(JSON.stringify(args.input)),
    output_summary: truncate(JSON.stringify(args.output)),
    judge_score: args.judge_result.score,
    judge_pass: args.judge_result.pass,
    judge_model: args.judge_result.model,
    rubric_version: args.judge_result.rubric_version,
    latency_ms: args.judge_result.latency_ms,
    cost_usd: args.judge_result.cost_usd,
    outcome: args.outcome,
    error: args.error ?? null,
    judge_result_json: JSON.stringify(args.judge_result)
  };

  database.prepare(INSERT_SQL).run({
    ...log,
    judge_pass: log.judge_pass ? 1 : 0
  });

  return log;
};

interface RawRow extends Omit<TransactionLog, "judge_pass"> {
  judge_pass: number;
}

export const listTransactions = (limit = 50): TransactionLog[] => {
  const database = ensureDb();
  const rows = database
    .prepare(`SELECT * FROM transactions ORDER BY timestamp DESC LIMIT ?`)
    .all(limit) as RawRow[];

  return rows.map((row) => ({
    ...row,
    judge_pass: row.judge_pass === 1
  }));
};
