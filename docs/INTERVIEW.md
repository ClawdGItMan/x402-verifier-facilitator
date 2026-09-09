# Friday interview walkthrough

Open the public demo or run `pnpm dev:dashboard` and open http://localhost:4022.

## Two minutes

**0:00 — The problem.** “A payment signature proves that an agent can pay. It doesn't prove the agent received useful work. I explored making acceptance criteria part of the payment workflow.”

**0:20 — Deterministic first.** Run Invoice extraction → Correct extraction. Then choose Wrong amount and run again. The JSON shape still passes, but 120 does not match the source's 12, so payment is blocked. The task fee is separate from the invoice amount being extracted.

**0:40 — Semantic quality.** Select Research summary → Invented success. Explain that fluent prose can fail grounding. “These public model judgments are authored examples so the demo works without a key. There is an optional live single-model API adapter; I am not claiming these are live model calls.”

**1:00 — Uncertainty.** Select Product copy → Judges disagree → Multi-judge consensus. The average is not sufficient when the judges disagree. Work stays held. Explain that cross-family evaluation helps expose disagreement but cannot eliminate shared blind spots.

**1:20 — Recourse.** Select Invoice extraction → Correct extraction → Optimistic + dispute. Run, then enter a complaint and challenge within 20 seconds. Payment freezes. Open the human-review role-play, enter a rationale, approve, then release. “A dispute window needs a real hold or escrow design in production; it can't simply reverse a settled transfer.”

**1:45 — Economics and Solana.** Use the cost calculator to compare a $0.02 judgment on a $0.001 task and a $10 task. “The acceptance layer should use the cheapest sufficient evidence. The next blockchain version will be Solana devnet only. This playground simulates that target; the earlier Base Sepolia experiment is archived history.”

## Backup paths

- No internet: run locally with authored examples. No wallet/provider/facilitator dependency.
- Session expired: rerun verification. Temporary demo state can reset after a server restart or instance change.
- Model unavailable: the system holds; it never silently swaps in a fixture.
- Asked about code execution: the demo tests a bounded declarative operation language, not arbitrary JavaScript.
- Asked about proofs: hashes bind artifacts, but do not establish truth or prove which model ran.
- Asked about metrics: fixture scores and cost assumptions are illustrative; no measured accuracy, cost benchmark, or adoption claim is presented.
- Asked about real payments: the About page links to historical Base Sepolia evidence and the archived `/archive/base-sepolia` dashboard; `/testnet` describes the Solana-only integration. No new chain transaction was made in this build.

## The decisions worth discussing

- Separate payment authorization, work acceptance, identity, provenance, and settlement integrity.
- Hard constraints should not be averaged away by a model's other scores.
- Buyer-defined criteria and reference quality matter more than a verifier's branding.
- Prompt injection, reviewer bias, shared model failures, and Goodhart effects require measured evaluation.
- Production requires buyer-signed terms, durable state, authenticated review, replay protection, and settlement reconciliation.
