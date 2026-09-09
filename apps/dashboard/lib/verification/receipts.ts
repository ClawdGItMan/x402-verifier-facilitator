import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { canonical, type Evaluation, type VerificationRequest } from "./engine";
export type PaymentState =
  | "blocked"
  | "held"
  | "challenge-window"
  | "ready"
  | "released"
  | "disputed"
  | "refunded";
export type Receipt = {
  id: string;
  requestHash: string;
  artifactHash: string;
  issuedAt: number;
  expiresAt: number;
  notBefore: number;
  verification: Evaluation;
  token: string;
  paymentState: PaymentState;
  amount: number;
  network: string;
  simulation: true;
  events: { at: number; message: string }[];
  transaction?: string;
};
export type PaymentAction = "release" | "challenge" | "approve" | "reject";
const digest = (v: unknown) =>
  createHash("sha256").update(canonical(v)).digest("hex");
export class DemoLedger {
  private records = new Map<string, Receipt>();
  private secret = randomBytes(32);
  private sign(r: Pick<Receipt, "id" | "requestHash" | "expiresAt">) {
    return createHmac("sha256", this.secret)
      .update(`${r.id}:${r.requestHash}:${r.expiresAt}`)
      .digest("hex");
  }
  issue(
    request: VerificationRequest,
    verification: Evaluation,
    now = Date.now(),
  ): Receipt {
    for (const [id, r] of this.records)
      if (r.expiresAt <= now) this.records.delete(id);
    if (this.records.size >= 500)
      throw new Error("Demo capacity reached. Please retry in a few minutes.");
    const paymentState =
      verification.verdict === "reject"
        ? "blocked"
        : verification.verdict === "hold"
          ? "held"
          : request.policy === "optimistic"
            ? "challenge-window"
            : "ready";
    const r: Receipt = {
      id: randomUUID(),
      requestHash: digest(request),
      artifactHash: createHash("sha256").update(request.artifact).digest("hex"),
      issuedAt: now,
      expiresAt: now + 600000,
      notBefore: request.policy === "optimistic" ? now + 20000 : now,
      verification,
      token: "",
      paymentState,
      amount: request.amount,
      network: request.network,
      simulation: true,
      events: [
        {
          at: now,
          message: `Verification complete: ${verification.verdict}. Payment ${paymentState}.`,
        },
      ],
    };
    r.token = this.sign(r);
    this.records.set(r.id, r);
    return structuredClone(r);
  }
  transition(
    id: string,
    token: string,
    request: VerificationRequest,
    action: PaymentAction,
    rationale: string,
    now = Date.now(),
  ): Receipt {
    const r = this.records.get(id);
    if (!r || r.expiresAt <= now)
      throw new Error(
        "Demo session expired or restarted. Run verification again.",
      );
    const supplied = Buffer.from(token, "hex"),
      expected = Buffer.from(this.sign(r), "hex");
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected) ||
      digest(request) !== r.requestHash
    )
      throw new Error(
        "Receipt does not match the verified task, artifact, policy, amount, or network. Run verification again.",
      );
    if (["released", "blocked", "refunded"].includes(r.paymentState))
      throw new Error("This payment is final. A receipt cannot be used twice.");
    if (action === "challenge") {
      if (r.paymentState !== "challenge-window" || now >= r.notBefore)
        throw new Error("The challenge window is not open.");
      if (rationale.trim().length < 10)
        throw new Error(
          "Describe the disputed requirement in at least 10 characters.",
        );
      r.paymentState = "disputed";
      r.events.push({
        at: now,
        message: `Demo dispute opened; payment frozen. Reason: ${rationale}`,
      });
    } else if (action === "approve" || action === "reject") {
      if (!["held", "disputed"].includes(r.paymentState))
        throw new Error(
          "Only held or disputed work can enter manual demo review.",
        );
      if (rationale.trim().length < 10)
        throw new Error(
          "A reviewer rationale of at least 10 characters is required.",
        );
      r.paymentState = action === "approve" ? "ready" : "refunded";
      r.events.push({
        at: now,
        message: `Role-play reviewer ${action === "approve" ? "approved" : "rejected"} work: ${rationale}. No authenticated human arbitration occurred.`,
      });
    } else {
      if (
        r.paymentState !== "ready" &&
        !(r.paymentState === "challenge-window" && now >= r.notBefore)
      )
        throw new Error(
          "Payment is held. A passing verification or explicit demo review is required before release.",
        );
      r.paymentState = "released";
      r.transaction = `sim_${randomUUID()}`;
      r.events.push({
        at: now,
        message: `Simulated release of ${r.amount} USDC. No blockchain transaction was submitted.`,
      });
    }
    return structuredClone(r);
  }
}
