"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  FlaskConical,
  Scale,
} from "lucide-react";
const methods = [
  {
    name: "Schema & source validation",
    group: "quality",
    status: "Runs in this demo",
    question: "Is it well-formed, and do the fields match?",
    body: "Validate types, required fields, amounts, and source values before paying for a model call. The invoice example shows why valid JSON is only the first check: 120 and 12 are both numbers.",
    limit:
      "Cannot determine the quality of a subjective explanation. Source comparison is only as trustworthy as the source.",
    task: "extraction",
  },
  {
    name: "Executable tests & constraints",
    group: "quality",
    status: "Runs in this demo",
    question: "Does the output meet the declared contract?",
    body: "The code example interprets a bounded operation pipeline and executes buyer-owned test vectors. The acceptance contract checks exact predicates. General code execution would need an isolated, resource-limited sandbox.",
    limit:
      "Passing a finite test suite is not proof of general correctness. Letting the seller choose all tests creates an easy gaming surface.",
    task: "code",
  },
  {
    name: "Learned metrics",
    group: "quality",
    status: "Research path",
    question: "How similar is this to a trusted reference?",
    body: "BERTScore, COMET and related evaluators can supply repeatable semantic signals for summaries and translations. They fit between basic constraints and a more expensive judge.",
    limit:
      "Reference overlap is not truth, taste, or insight. No learned model runs in this demo.",
    link: "https://github.com/Tiiiger/bert_score",
  },
  {
    name: "Formal methods & policy enforcement",
    group: "quality",
    status: "Predicates demonstrated",
    question: "Can the requirement be expressed precisely?",
    body: "Typed constraints and runtime policies turn explicit rules into executable checks. More demanding workflows can use theorem provers or temporal logic. The acceptance contract demonstrates only simple predicates.",
    limit:
      "A proof of a formal statement does not prove the statement captures what the buyer really wanted.",
    task: "custom",
  },
  {
    name: "LLM as judge",
    group: "quality",
    status: "Fixtures + optional live API",
    question: "Does this work satisfy a semantic rubric?",
    body: "Assess grounding, completeness, clarity, and instruction following. The supplied source and buyer criteria are kept separate from the untrusted deliverable. Grounding failures cannot be rescued by fluent prose.",
    limit:
      "A model can be wrong, biased, or manipulated. Public scores are authored examples; edited text is held unless a live model is configured.",
    task: "summary",
  },
  {
    name: "Cross-model consensus",
    group: "quality",
    status: "Illustrative panel",
    question: "Do independent evaluators agree?",
    body: "Different model families can reduce dependence on one evaluator. This demo requires three passing votes, a spread of at most 25 points, and adequate confidence. Try “Judges disagree” in Product copy.",
    limit:
      "Correlated errors remain. The public panel contains authored votes; live cross-provider consensus is not implemented.",
    task: "creative",
  },
  {
    name: "Confidence & human escalation",
    group: "quality",
    status: "Review flow demonstrated",
    question: "What happens when the answer is uncertain?",
    body: "A gray-zone score or low confidence holds the payment. The review step asks for a rationale before a role-play reviewer can approve or reject the work.",
    limit:
      "Self-reported confidence is not a calibrated probability. Review buttons do not constitute an authenticated expert panel.",
    task: "analysis",
  },
  {
    name: "Identity & scoped authority",
    group: "trust",
    status: "Contract binding demonstrated",
    question: "Who may spend, for which task, and how much?",
    body: "Identity credentials and scoped authorization should bind the buyer, seller, payee, amount, network, task hash, and expiry. Demo receipts bind the selected task, artifact, policy, amount and network; no real identity is authenticated.",
    limit:
      "Identity is not evidence that work is good. A real deployment needs buyer-signed task terms and authenticated reviewers.",
  },
  {
    name: "Provenance, ZK & TEEs",
    group: "trust",
    status: "Research path",
    question: "Did the claimed computation actually run?",
    body: "Attestations, zero-knowledge proofs, or trusted execution environments can support claims about a program, model, input, or execution. A SHA-256 digest here only identifies the exact artifact that was evaluated.",
    limit:
      "A hash is not provenance. Proof of execution is not proof of usefulness. No ZK proof, TEE, or model attestation is generated.",
    link: "https://github.com/zkonduit/ezkl",
  },
  {
    name: "Reputation & attestations",
    group: "trust",
    status: "Exportable local audit",
    question: "What do previous verified outcomes tell us?",
    body: "Persistent, attributable verdicts can become input to an agent reputation system. Receipts here expose criteria, checks, decisions, and artifact fingerprints for review.",
    limit:
      "No on-chain reputation is published. Reputation can be gamed and should not exempt current work from its acceptance criteria.",
  },
  {
    name: "Settlement integrity",
    group: "trust",
    status: "Simulated release guard",
    question: "Was the accepted payment processed correctly?",
    body: "A facilitator validates payment authorization and submits the transaction. A separate work-verification policy determines whether this application should ask for settlement. The demo blocks modified receipts and repeated releases within its process.",
    limit:
      "The demo ledger is temporary and single-process. Real money requires durable replay protection, signed task terms, and chain reconciliation.",
    link: "https://docs.x402.org/core-concepts/facilitator",
  },
  {
    name: "Per-call, before settlement",
    group: "timing",
    status: "Default demo flow",
    question: "Can we decide before money moves?",
    body: "Agree on the task, validate the payment authorization, produce work, evaluate it, and release payment only when accepted. This is the core x402 application flow demonstrated here.",
    limit:
      "The seller still performs work before getting paid. This does not solve every fair-exchange or content-delivery problem.",
    task: "extraction",
  },
  {
    name: "Optimistic disputes & bonds",
    group: "timing",
    status: "20-second simulation",
    question: "Can either party contest the automatic verdict?",
    body: "An accepted result waits in a challenge window. A challenge freezes release and escalates review. A bond discourages frivolous disputes; a separate bounty can pay the resolver. The UI illustrates a 2× task-value bond without collecting it.",
    limit:
      "A settled transfer is not reversible by a judge. Production needs escrow or another explicit hold mechanism; this is not a UMA integration.",
    link: "https://docs.uma.xyz/protocol-overview/how-does-umas-oracle-work",
  },
  {
    name: "Streaming heartbeat & SLA",
    group: "timing",
    status: "Research path",
    question: "Is ongoing work still meeting expectations?",
    body: "For continuous services, combine liveness checks, sampled quality audits, spending caps, and a stop condition. A heartbeat asks whether the worker is active; an audit asks whether its work is acceptable.",
    limit:
      "A heartbeat alone does not prove useful work. No streaming-payment integration is built here.",
  },
  {
    name: "Stepped verification",
    group: "timing",
    status: "Runs in this demo",
    question: "What is the cheapest sufficient check?",
    body: "Stop early on malformed or incorrect data. Skip LLM calls for fully checkable tasks. Escalate subjective or low-confidence work to stronger review. Preserve a hold when the required reviewer is unavailable.",
    limit:
      "Routing and thresholds need calibration against labeled real-world outcomes. Demo examples are not an accuracy benchmark.",
    task: "summary",
  },
];
export function Research() {
  const [filter, setFilter] = useState("quality");
  return (
    <div className="vf-research">
      <div className="vf-section-intro">
        <div>
          <span className="vf-section-icon">
            <FlaskConical size={23} />
          </span>
          <h2>
            There is more than one
            <br />
            way to verify work.
          </h2>
        </div>
        <p>
          The research separates three questions: what is being checked, what
          evidence is sufficient, and when the check should happen. Each
          approach has a boundary.
        </p>
      </div>
      <div
        className="vf-filter"
        role="group"
        aria-label="Verification research category"
      >
        {[
          { id: "quality", label: "Work quality" },
          { id: "trust", label: "Identity, provenance & trust" },
          { id: "timing", label: "When to verify" },
        ].map((f) => (
          <button
            key={f.id}
            aria-pressed={filter === f.id}
            className={filter === f.id ? "active" : ""}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="vf-method-grid">
        {methods
          .filter((m) => m.group === filter)
          .map((m) => (
            <details key={m.name} className="vf-method-card" open>
              <summary>
                <span>{m.name}</span>
                <ChevronDown size={16} />
              </summary>
              <span className="vf-method-status">{m.status}</span>
              <h3>{m.question}</h3>
              <p>{m.body}</p>
              <div className="vf-method-limit">
                <b>What it cannot prove</b>
                <p>{m.limit}</p>
              </div>
              {m.task && (
                <a href={`/?task=${m.task}#workbench`}>
                  Try the example <ArrowUpRight size={14} />
                </a>
              )}
              {m.link && (
                <a href={m.link} target="_blank" rel="noreferrer">
                  Primary reference <ArrowUpRight size={14} />
                </a>
              )}
            </details>
          ))}
      </div>
      <Economics />
    </div>
  );
}
export function Economics() {
  const [exponent, setExponent] = useState(0);
  const [tier, setTier] = useState(0.02);
  const amount = 10 ** exponent;
  const percent = (tier / amount) * 100;
  return (
    <section className="vf-economics">
      <div>
        <Scale size={24} />
        <h2>
          Verification has to
          <br />
          earn its place.
        </h2>
        <p>
          A model call can overwhelm a micropayment. Use deterministic checks
          where the contract allows them, and spend more on verification when
          the work justifies it.
        </p>
      </div>
      <div className="vf-calculator">
        <div className="vf-calc-values">
          <span>
            Task value
            <strong>
              ${amount < 1 ? amount.toFixed(3) : amount.toFixed(2)}
            </strong>
          </span>
          <span>
            Verification / value
            <strong className={percent > 10 ? "vf-cost-high" : ""}>
              {percent < 0.1 ? percent.toFixed(3) : percent.toFixed(1)}%
            </strong>
          </span>
        </div>
        <label htmlFor="task-value-slider">Explore payment size</label>
        <input
          id="task-value-slider"
          type="range"
          min="-3"
          max="2"
          step=".25"
          value={exponent}
          onChange={(e) => setExponent(Number(e.target.value))}
        />
        <div className="vf-range-labels">
          <span>$0.001</span>
          <span>$100</span>
        </div>
        <label htmlFor="cost-assumption">Assumed verification cost</label>
        <select
          id="cost-assumption"
          value={tier}
          onChange={(e) => setTier(Number(e.target.value))}
        >
          <option value="0.0001">Deterministic check — $0.0001</option>
          <option value="0.02">Single judge — $0.02</option>
          <option value="0.06">Three judges — $0.06</option>
          <option value="15">Expert review — $15.00</option>
        </select>
        <p className="vf-micro">
          Illustrative assumptions, not measured costs or provider quotes.
          Excludes network fees, retries, hosting, and disputes.
        </p>
      </div>
    </section>
  );
}
export function ProjectNotes() {
  return (
    <div className="vf-project">
      <div className="vf-section-intro">
        <div>
          <h2>
            From a payment rail
            <br />
            to a definition of done.
          </h2>
        </div>
        <p>
          This project began with real Base Sepolia settlements. The next
          question was whether a valid payment tells us enough about the work
          being purchased.
        </p>
      </div>
      <div className="vf-project-columns">
        <section>
          <h3>The thesis</h3>
          <p>
            An agent can authorize a payment correctly and still buy a bad
            answer. Acceptance criteria belong alongside the payment terms, with
            a verifier that can hold the payment when evidence is insufficient.
          </p>
          <p>
            The strongest design starts with deterministic checks. Use an LLM
            when the requirement calls for semantic judgment, and preserve
            recourse for uncertain or disputed decisions.
          </p>
          <h3>What this demo proves</h3>
          <ul>
            <li>
              <Check size={15} /> Actual schema, source, constraint, and
              bounded-program checks.
            </li>
            <li>
              <Check size={15} /> Server-side decisions before simulated
              release.
            </li>
            <li>
              <Check size={15} /> Receipt binding and process-local replay
              protection.
            </li>
            <li>
              <Check size={15} /> Hold, reject, dispute, and role-play review
              flows.
            </li>
          </ul>
          <h3>What remains an integration</h3>
          <p>
            Live Solana settlement, durable distributed state, buyer-signed
            acceptance contracts, authenticated review, escrow, cross-provider
            consensus, learned metrics, and provenance proofs. The public LLM
            judgments are deliberately authored fixtures. An optional
            server-side Anthropic adapter supports live single-model judging
            when configured.
          </p>
        </section>
        <section>
          <h3>Why Solana is relevant</h3>
          <p>
            x402 separates application acceptance from the underlying payment
            network. Solana is one of its supported networks. The verification
            policy can stay consistent while the payment adapter changes.
          </p>
          <p>
            The current demo and planned testnet integration target Solana
            devnet only. Payments are simulated today; a live Solana transaction
            will require the settlement integration. The earlier Base Sepolia
            work is archived as historical evidence.
          </p>
          <a
            href="https://docs.x402.org/core-concepts/network-and-token-support"
            target="_blank"
            rel="noreferrer"
          >
            x402 network documentation <ArrowUpRight size={14} />
          </a>
          <a className="vf-testnet-link" href="/testnet">
            Solana devnet integration status <ArrowUpRight size={14} />
          </a>
          <h3>The archived Base prototype</h3>
          <p>
            The repository records four Base Sepolia settlements from April 23,
            2026. The original facilitator used a seller-triggered judge and
            payment-only settlement proxy. It did not independently enforce work
            quality in the settlement route.
          </p>
          <a
            href="https://sepolia.basescan.org/tx/0x17de059f92990c9832363fe9fa7b04d181898a3e680aa9d1ba75493f27ad3744"
            target="_blank"
            rel="noreferrer"
          >
            Recorded Base Sepolia transaction <ArrowUpRight size={14} />
          </a>
          <a className="vf-testnet-link" href="/archive/base-sepolia">
            View archived Base dashboard <ArrowUpRight size={14} />
          </a>
          <p className="vf-micro">
            Requires local services, a funded test wallet and explicit
            baseline-settlement opt-in. No new on-chain settlement was performed
            for this demo.
          </p>
        </section>
      </div>
      <div className="vf-walkthrough">
        <h3>A two-minute walkthrough</h3>
        <ol>
          <li>
            <b>Start with an invoice.</b> Run the correct extraction, then
            change 12 to 120. Same schema; a different payment decision.
          </li>
          <li>
            <b>Show the semantic gap.</b> Open Research summary and choose
            Invented success. Fluent text fails grounding.
          </li>
          <li>
            <b>Expose uncertainty.</b> Try Product copy → Judges disagree →
            Multi-judge consensus. Payment stays held.
          </li>
          <li>
            <b>Show recourse.</b> Run correct work with Optimistic + dispute.
            Challenge it before the clock ends, then demonstrate review.
          </li>
          <li>
            <b>Explain the economics.</b> Compare a $0.02 judge against a $0.001
            task and a $10 task.
          </li>
        </ol>
      </div>
    </div>
  );
}
