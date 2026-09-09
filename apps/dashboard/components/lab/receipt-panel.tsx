import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  LockKeyhole,
  ShieldCheck,
  X,
  AlertTriangle,
} from "lucide-react";
import type { PaymentAction, Receipt } from "../../lib/verification/receipts";
import { VerificationProgress, type Progress } from "./verification-progress";
const labels = {
  blocked: "Payment blocked",
  held: "Held for review",
  "challenge-window": "Challenge window",
  ready: "Ready to release",
  released: "Payment released",
  disputed: "Payment disputed",
  refunded: "Payment withheld",
};
export function ReceiptPanel({
  receipt,
  busy,
  onAction,
  progress,
  onCancel,
}: {
  receipt: Receipt | null;
  busy: boolean;
  onAction: (action: PaymentAction, reason: string) => void;
  progress: Progress | null;
  onCancel: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (receipt?.paymentState !== "challenge-window") return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [receipt?.paymentState, receipt?.id]);
  useEffect(() => setReason(""), [receipt?.id]);
  if (progress)
    return <VerificationProgress progress={progress} onCancel={onCancel} />;
  if (!receipt)
    return (
      <div className="vf-receipt-empty">
        <div className="vf-empty-seal">
          <LockKeyhole size={28} />
        </div>
        <h3>Payment waits for proof.</h3>
        <p>
          Run a verification to see each check, the decision, and what happens
          to the payment.
        </p>
        <div className="vf-rule-preview">
          <Check size={14} /> Check the structure
          <Check size={14} /> Verify the substance
          <LockKeyhole size={14} /> Release only on acceptance
        </div>
      </div>
    );
  const { verification: v, paymentState: state } = receipt;
  const seconds = Math.max(
    0,
    Math.ceil((receipt.notBefore - Math.max(now, receipt.issuedAt)) / 1000),
  );
  const tone =
    state === "released" || state === "ready"
      ? "success"
      : state === "blocked" || state === "refunded"
        ? "danger"
        : "warning";
  function download() {
    const { token, ...data } = receipt!;
    void token;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            ...data,
            disclosure:
              "Simulated payment. Model fixtures are authored examples. HMAC authentication is server-local; this export is an audit record, not cryptographic proof of quality.",
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verification-${data.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="vf-result" aria-live="polite">
      <div className={`vf-verdict ${tone}`}>
        <span className="vf-verdict-icon">
          {tone === "success" ? (
            <ShieldCheck size={25} />
          ) : tone === "danger" ? (
            <X size={25} />
          ) : (
            <LockKeyhole size={25} />
          )}
        </span>
        <div>
          <span className="vf-caption">Simulated settlement</span>
          <h3>{labels[state]}</h3>
        </div>
        <strong className="vf-payment-amount">
          {receipt.amount}
          <small>USDC</small>
        </strong>
      </div>
      <p className="vf-result-reason">{v.reason}</p>
      {receipt.timing && (
        <div className="vf-timing-result">
          <strong>{(receipt.timing.elapsedMs / 1000).toFixed(2)}s</strong>
          <span>
            {receipt.timing.basis === "illustrative"
              ? "Verification · includes simulated judge delay"
              : "Verification · measured server time"}
          </span>
          <p>
            {receipt.timing.basis === "illustrative"
              ? `${receipt.timing.modeledMs / 1000}s illustrative pacing, not a provider benchmark. No live model call.`
              : "Includes checks and any live provider wait; excludes browser/network and settlement time."}
          </p>
        </div>
      )}
      <div className="vf-method">
        <span>{v.method}</span>
        <span className="vf-pill">
          {v.judgeSource === "authored-fixture"
            ? "Authored judgment"
            : v.judgeSource === "live-model"
              ? "Live model"
              : "Real checks"}
        </span>
      </div>
      <div className="vf-checks">
        {v.checks.map((check, i) => (
          <div className={`vf-check ${check.status}`} key={i}>
            {check.status === "pass" ? (
              <Check size={15} />
            ) : check.status === "fail" ? (
              <X size={15} />
            ) : (
              <AlertTriangle size={15} />
            )}
            <details>
              <summary>
                {check.name}
                <ChevronDown size={12} />
              </summary>
              <p>{check.detail}</p>
            </details>
          </div>
        ))}
      </div>
      {v.score !== null && (
        <>
          <div className="vf-score">
            <span>
              Rubric score{" "}
              <strong>
                {v.score}
                <small>/100</small>
              </strong>
            </span>
            <span>
              Confidence{" "}
              <strong>
                {Math.round((v.confidence ?? 0) * 100)}
                <small>%</small>
              </strong>
            </span>
          </div>
          <div className="vf-dimensions">
            {v.dimensions.map((d) => (
              <details key={d.name}>
                <summary>
                  <span>{d.name}</span>
                  <div className="vf-bar">
                    <i style={{ width: `${d.score}%` }} />
                  </div>
                  <b>{d.score}</b>
                </summary>
                <p>{d.reason}</p>
              </details>
            ))}
          </div>
          <p className="vf-micro">
            Release requires ≥70 quality, ≥70 grounding and ≥80% confidence.
            Confidence is{" "}
            {v.judgeSource === "authored-fixture"
              ? "illustrative"
              : "self-reported"}
            , not a calibrated probability.
          </p>
        </>
      )}
      {v.votes.length > 0 && (
        <div className="vf-votes">
          <span>Illustrative independent votes</span>
          <div>
            {v.votes.map((n, i) => (
              <span key={i}>
                Judge {String.fromCharCode(65 + i)}
                <b>{n}</b>
              </span>
            ))}
          </div>
          <p>Authored panel example; no three-model API call occurred.</p>
        </div>
      )}
      {state === "challenge-window" && (
        <div className="vf-challenge">
          <strong>
            {seconds > 0
              ? `${seconds}s left to challenge`
              : "Challenge window ended"}
          </strong>
          <p>
            Payment has not moved. A challenge freezes release. Bond model:{" "}
            {(receipt.amount * 2).toFixed(2)} USDC (illustrative; no bond
            collected).
          </p>
          {seconds > 0 ? (
            <>
              <label htmlFor="dispute-reason">
                What requirement was missed?
              </label>
              <textarea
                id="dispute-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the specific issue…"
                maxLength={1000}
              />
              <button
                className="vf-secondary"
                disabled={busy || reason.trim().length < 10}
                onClick={() => onAction("challenge", reason)}
              >
                Challenge this work
              </button>
            </>
          ) : (
            <button
              className="vf-primary"
              disabled={busy}
              onClick={() => onAction("release", "")}
            >
              Release simulated payment
            </button>
          )}
        </div>
      )}
      {(state === "held" || state === "disputed") && (
        <details className="vf-human">
          <summary>
            Try the human review step <ChevronDown size={14} />
          </summary>
          <p>
            Role-play the reviewer. These buttons demonstrate arbitration; they
            do not represent a real expert or authenticated dispute process.
          </p>
          <label htmlFor="review-reason">Reviewer rationale</label>
          <textarea
            id="review-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            placeholder="Explain why this work should pass or fail…"
          />
          <div className="vf-review-buttons">
            <button
              className="vf-secondary"
              disabled={busy || reason.trim().length < 10}
              onClick={() => onAction("approve", reason)}
            >
              Approve in demo
            </button>
            <button
              className="vf-secondary"
              disabled={busy || reason.trim().length < 10}
              onClick={() => onAction("reject", reason)}
            >
              Reject in demo
            </button>
          </div>
        </details>
      )}
      {state === "ready" && (
        <button
          className="vf-primary"
          disabled={busy}
          onClick={() => onAction("release", "")}
        >
          Release simulated payment
        </button>
      )}
      <details className="vf-audit">
        <summary>
          Receipt & audit trail <ChevronDown size={14} />
        </summary>
        <dl>
          <dt>Artifact SHA-256</dt>
          <dd>{receipt.artifactHash}</dd>
          <dt>Bound contract SHA-256</dt>
          <dd>{receipt.requestHash}</dd>
          <dt>Rubric version</dt>
          <dd>{v.rubricVersion}</dd>
          <dt>Payment rail (simulated)</dt>
          <dd>{receipt.network}</dd>
        </dl>
        {receipt.events.map((event, i) => (
          <p key={i}>{event.message}</p>
        ))}
        {receipt.transaction && <code>{receipt.transaction}</code>}
        <p>
          No on-chain transaction, escrow, or provenance proof. Demo sessions
          expire after 10 minutes and may reset on server restart.
        </p>
      </details>
      <button className="vf-download" onClick={download}>
        <Download size={14} /> Export receipt
      </button>
    </div>
  );
}
