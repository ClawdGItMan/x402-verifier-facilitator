"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Code2,
  FileText,
  Play,
  RotateCcw,
  ScanLine,
} from "lucide-react";
import {
  getScenario,
  policies,
  scenarios,
  type TaskId,
  type Policy,
} from "../../lib/verification/scenarios";
import {
  evaluate,
  type VerificationRequest,
} from "../../lib/verification/engine";
import { timingPlan } from "../../lib/verification/timing";
import type { Progress } from "./verification-progress";
import type { PaymentAction, Receipt } from "../../lib/verification/receipts";
import { ReceiptPanel } from "./receipt-panel";
import { Flow } from "./flow";

export function Workbench() {
  const [task, setTask] = useState<TaskId>("extraction");
  const scenario = getScenario(task);
  const [preset, setPreset] = useState("good");
  const [artifact, setArtifact] = useState(
    JSON.stringify(scenario.presets[0]!.output, null, 2),
  );
  const [policy, setPolicy] = useState<Policy>("stepped");
  const [amount, setAmount] = useState("0.05");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const pending = useRef<AbortController | null>(null);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<
    { label: string; state: string; amount: number }[]
  >([]);
  const [liveAvailable, setLiveAvailable] = useState(false);
  const [live, setLive] = useState(false);
  const [access, setAccess] = useState("");
  useEffect(() => {
    fetch("/api/lab")
      .then((r) => r.json())
      .then((r) => setLiveAvailable(r.liveJudgeAvailable === true))
      .catch(() => {});
    const id = new URLSearchParams(window.location.search).get("task");
    if (scenarios.some((s) => s.id === id)) changeTask(id as TaskId);
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, []);
  function clear() {
    setProgress(null);
    setReceipt(null);
    setStage(0);
    setError("");
  }
  function changeTask(id: TaskId) {
    const s = getScenario(id);
    setTask(id);
    setPreset("good");
    setArtifact(JSON.stringify(s.presets[0]!.output, null, 2));
    setAmount(String(s.price));
    clear();
  }
  function changePreset(id: string) {
    setPreset(id);
    setArtifact(
      JSON.stringify(
        scenario.presets.find((p) => p.id === id)!.output,
        null,
        2,
      ),
    );
    clear();
  }
  const request: VerificationRequest = {
    task,
    artifact,
    policy,
    network: "solana-devnet",
    amount: Number(amount),
    judgeMode: live ? "live" : "fixture",
  };
  async function api(body: unknown, signal?: AbortSignal): Promise<Receipt> {
    const response = await fetch("/api/lab", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(live ? { authorization: `Bearer ${access}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Verification unavailable. Try again.");
    return data;
  }
  async function run() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    clear();
    setBusy(true);
    setStage(2);
    setProgress({
      plan: timingPlan(request, live ? undefined : evaluate(request)),
      startedAt: performance.now(),
    });
    try {
      let result = await api(
        { operation: "verify", request },
        controller.signal,
      );
      controller.signal.throwIfAborted();
      setStage(3);
      setProgress(null);
      setReceipt(result);
      if (result.paymentState === "ready")
        result = await api(
          {
            operation: "settle",
            request,
            id: result.id,
            token: result.token,
            action: "release",
            rationale: "",
          },
          controller.signal,
        );
      controller.signal.throwIfAborted();
      setReceipt(result);
      setStage(result.paymentState === "released" ? 4 : 3);
      setHistory((h) =>
        [
          {
            label: scenario.title,
            state: result.paymentState,
            amount: result.amount,
          },
          ...h,
        ].slice(0, 6),
      );
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(
        e instanceof Error
          ? e.message
          : "Verification failed. Payment stays held.",
      );
      setStage(0);
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setProgress(null);
        setBusy(false);
      }
    }
  }
  function cancel() {
    pending.current?.abort();
    pending.current = null;
    clear();
    setBusy(false);
    setError("Verification canceled. No payment release was requested.");
  }
  async function act(action: PaymentAction, rationale: string) {
    if (!receipt) return;
    setBusy(true);
    setError("");
    try {
      const next = await api({
        operation: "settle",
        request,
        id: receipt.id,
        token: receipt.token,
        action,
        rationale,
      });
      setReceipt(next);
      setStage(next.paymentState === "released" ? 4 : 3);
      setHistory((h) =>
        [
          {
            label: scenario.title,
            state: next.paymentState,
            amount: next.amount,
          },
          ...h,
        ].slice(0, 6),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Action failed. Payment remains unchanged.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Flow stage={stage} receipt={receipt} running={!!progress} />
      <div className="vf-lab-toolbar">
        <div>
          <span className="vf-live-dot" /> Interactive workbench{" "}
          <span className="vf-muted">Change the work. Watch the decision.</span>
        </div>
        <div className="vf-toolbar-controls">
          <a
            className="vf-network"
            href="/testnet"
            aria-label="Solana devnet integration status"
          >
            <span className="vf-solana-mark">≋</span>
            <span>Solana devnet · simulated</span>
            <ArrowUpRight size={13} />
          </a>
          <button
            className="vf-primary vf-quick-run"
            disabled={
              busy ||
              !artifact.trim() ||
              !amount ||
              Number(amount) < 0.001 ||
              Number(amount) > 1000
            }
            onClick={run}
          >
            <Play size={12} />
            {busy ? "Checking…" : "Run example"}
          </button>
        </div>
      </div>
      <div className="vf-workbench">
        <section className="vf-brief">
          <header className="vf-panel-title">
            <FileText size={16} />
            <h2>The agreement</h2>
            <span>Buyer</span>
          </header>
          <div className="vf-panel-body">
            <label htmlFor="task-type">Task to verify</label>
            <div className="vf-select-wrap">
              <select
                id="task-type"
                value={task}
                disabled={busy}
                onChange={(e) => changeTask(e.target.value as TaskId)}
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
            <p className="vf-task-description">{scenario.description}</p>
            <details className="vf-source" open>
              <summary>
                Source & context <ChevronDown size={13} />
              </summary>
              <p>{scenario.source}</p>
            </details>
            <h3 className="vf-small-heading">Definition of done</h3>
            <ul className="vf-criteria">
              {scenario.criteria.map((c) => (
                <li key={c}>
                  <Check size={13} />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <div className="vf-amount">
              <label htmlFor="payment-amount">Payment on acceptance</label>
              <div>
                <input
                  id="payment-amount"
                  type="number"
                  min="0.001"
                  max="1000"
                  step="0.001"
                  value={amount}
                  disabled={busy}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    clear();
                  }}
                />
                <span>USDC</span>
              </div>
            </div>
            <p className="vf-micro">
              Illustrative task value. No wallet, test tokens, or API key needed
              for the public demo.
            </p>
          </div>
        </section>
        <section className="vf-deliverable">
          <header className="vf-panel-title">
            <Code2 size={16} />
            <h2>The deliverable</h2>
            <span>Seller</span>
          </header>
          <div className="vf-panel-body">
            <label htmlFor="example-output">Load an example</label>
            <div className="vf-select-wrap">
              <select
                id="example-output"
                value={preset}
                disabled={busy}
                onChange={(e) => changePreset(e.target.value)}
              >
                {scenario.presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
                {preset === "edited" && (
                  <option value="edited">Your edited output</option>
                )}
              </select>
              <ChevronDown size={14} />
            </div>
            <div className="vf-editor-header">
              <span>
                <span className="vf-file-dot" /> deliverable.json
              </span>
              <button
                title="Reset deliverable"
                aria-label="Reset deliverable"
                disabled={busy}
                onClick={() => changePreset("good")}
              >
                <RotateCcw size={13} />
              </button>
            </div>
            <textarea
              id="artifact"
              aria-label="Agent deliverable JSON"
              className="vf-code-editor"
              spellCheck={false}
              value={artifact}
              disabled={busy}
              onChange={(e) => {
                setArtifact(e.target.value);
                setPreset("edited");
                clear();
              }}
              maxLength={12000}
            />
            <p className="vf-editor-hint">
              Editable. Try changing an amount or removing a field.
            </p>
            <label htmlFor="verification-policy">Verification policy</label>
            <div className="vf-select-wrap">
              <select
                id="verification-policy"
                value={policy}
                disabled={busy}
                onChange={(e) => {
                  setPolicy(e.target.value as Policy);
                  clear();
                }}
              >
                {policies.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
            <p className="vf-policy-description">
              {policies.find((p) => p.id === policy)!.description}
            </p>
            {liveAvailable && (
              <details className="vf-live-settings">
                <summary>Live judge access</summary>
                <label>
                  <input
                    type="checkbox"
                    checked={live}
                    disabled={busy}
                    onChange={(e) => {
                      setLive(e.target.checked);
                      clear();
                    }}
                  />{" "}
                  Use configured Anthropic judge
                </label>
                {live && (
                  <input
                    aria-label="Live judge access token"
                    type="password"
                    autoComplete="off"
                    placeholder="Demo access token"
                    value={access}
                    disabled={busy}
                    onChange={(e) => setAccess(e.target.value)}
                  />
                )}
              </details>
            )}
            <button
              className="vf-primary vf-run"
              disabled={
                busy ||
                !artifact.trim() ||
                !amount ||
                Number(amount) < 0.001 ||
                Number(amount) > 1000
              }
              onClick={run}
            >
              {busy ? (
                <ScanLine className="vf-spin" size={17} />
              ) : (
                <Play size={16} />
              )}{" "}
              {busy ? "Checking work…" : "Run verification"}
              <span>↵</span>
            </button>
            <p className="vf-mode-note">
              {scenario.subjective
                ? live
                  ? "Live model evaluation. Payment is always simulated."
                  : "Real pre-checks + authored model judgments. No live LLM call."
                : "Deterministic checks run on your actual output."}
            </p>
            {error && (
              <div className="vf-error" role="alert">
                {error}
              </div>
            )}
          </div>
        </section>
        <section className="vf-verification">
          <header className="vf-panel-title">
            <ScanLine size={16} />
            <h2>The decision</h2>
            <span>Verifier</span>
          </header>
          <ReceiptPanel
            receipt={receipt}
            busy={busy}
            onAction={act}
            progress={progress}
            onCancel={cancel}
          />
        </section>
      </div>
      <div className="vf-underbench">
        <span>
          <LockIcon /> Every receipt binds the work, criteria, price, policy and
          network.
        </span>
        <a
          href="https://docs.x402.org/core-concepts/facilitator"
          target="_blank"
          rel="noreferrer"
        >
          Where this fits in x402 <ArrowUpRight size={13} />
        </a>
      </div>
      {history.length > 0 && (
        <div className="vf-history">
          <h3>This session</h3>
          {history.map((h, i) => (
            <span key={i}>
              <i
                className={
                  h.state === "released"
                    ? "success"
                    : h.state === "blocked"
                      ? "danger"
                      : "warning"
                }
              />
              {h.label}
              <b>{h.state.replaceAll("-", " ")}</b>
              <small>{h.amount} USDC</small>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
function LockIcon() {
  return <ScanLine size={13} />;
}
