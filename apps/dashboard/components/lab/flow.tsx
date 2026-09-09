import {
  ArrowRight,
  Bot,
  Check,
  CircleDollarSign,
  LockKeyhole,
  ScanLine,
} from "lucide-react";
import type { Receipt } from "../../lib/verification/receipts";
export function Flow({
  stage,
  receipt,
  running,
}: {
  stage: number;
  receipt: Receipt | null;
  running: boolean;
}) {
  const state = receipt?.paymentState;
  const nodes = [
    {
      icon: Bot,
      title: "Buyer agent",
      detail: stage ? "Acceptance criteria agreed" : "Defines the task",
      badge: "01",
    },
    {
      icon: Bot,
      title: "Seller agent",
      detail: stage ? "Deliverable submitted" : "Produces the work",
      badge: "02",
    },
    {
      icon: ScanLine,
      title: "Verifier",
      detail: running
        ? "Checking the deliverable"
        : receipt
          ? receipt.verification.verdict === "pass"
            ? "Criteria satisfied"
            : receipt.verification.verdict === "reject"
              ? "Work rejected"
              : "Review required"
          : "Checks before payment",
      badge: "03",
    },
    {
      icon: state === "released" ? CircleDollarSign : LockKeyhole,
      title: "Payment",
      detail:
        state === "released"
          ? "Simulated USDC released"
          : state === "challenge-window"
            ? "Challenge window open"
            : state === "disputed"
              ? "Disputed · frozen"
              : state === "blocked"
                ? "Release blocked"
                : state === "held"
                  ? "Held for review"
                  : state === "refunded"
                    ? "Withheld after review"
                    : running
                      ? "Held during evaluation"
                      : "Waiting for verification",
      badge: "04",
    },
  ];
  return (
    <div className="vf-flow" aria-label="Agent payment flow">
      {nodes.map((node, i) => (
        <div className="vf-flow-segment" key={node.title}>
          <div
            className={`vf-flow-node ${i === 2 ? "vf-verifier-node" : ""} ${stage > i ? "is-complete" : ""} ${running && i === 2 ? "is-checking" : ""}`}
          >
            <span className="vf-node-icon">
              <node.icon size={21} />
            </span>
            <div>
              <strong>{node.title}</strong>
              <span>{node.detail}</span>
            </div>
            <span className="vf-step">
              {stage > i ? <Check size={13} /> : node.badge}
            </span>
          </div>
          {i < 3 && <ArrowRight className="vf-flow-arrow" size={17} />}
        </div>
      ))}
    </div>
  );
}
