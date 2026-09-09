import { useEffect, useState } from "react";
import { LockKeyhole, ScanLine } from "lucide-react";
import { timingPhase, type TimingPlan } from "../../lib/verification/timing";

export type Progress = { plan: TimingPlan; startedAt: number };

export function VerificationProgress({
  progress,
  onCancel,
}: {
  progress: Progress;
  onCancel: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(
      () => setElapsed(performance.now() - progress.startedAt),
      100,
    );
    return () => clearInterval(timer);
  }, [progress.startedAt]);
  const { plan } = progress;
  const modeled = plan.modeledMs > 0;
  return (
    <div className="vf-receipt-empty vf-evaluating" aria-busy="true">
      <div className="vf-empty-seal">
        <ScanLine className="vf-spin" size={28} />
      </div>
      <span className="vf-caption">
        {modeled ? "Simulated judge timing" : "Verification in progress"}
      </span>
      <h3 aria-live="polite">{timingPhase(plan, elapsed)}</h3>
      <div className="vf-elapsed">
        <strong>
          {(elapsed / 1000).toFixed(1)}
          <small>s</small>
        </strong>
        <span>
          elapsed{modeled ? ` · about ${plan.modeledMs / 1000}s modeled` : ""}
        </span>
      </div>
      {modeled && (
        <div className="vf-timing-track" aria-hidden="true">
          <i
            style={{
              width: `${Math.min(95, (elapsed / plan.modeledMs) * 100)}%`,
            }}
          />
        </div>
      )}
      <p>
        {modeled
          ? plan.kind === "escalation"
            ? "One judge, then a panel when confidence is low. Two rounds are modeled; judgments are authored examples."
            : plan.kind === "parallel"
              ? "The panel is modeled as concurrent calls. We wait for every verdict; judgments are authored examples."
              : "A full rubric response takes time. This authored example includes an illustrative delay, not a live model call."
          : plan.kind === "live"
            ? "Waiting for the complete response and validated rubric. The timer follows the actual request."
            : "Validating the submitted output against the agreed constraints."}
      </p>
      <div className="vf-timing-lock">
        <LockKeyhole size={14} /> Payment held until verification completes
      </div>
      <button className="vf-cancel" onClick={onCancel}>
        Cancel verification
      </button>
    </div>
  );
}
