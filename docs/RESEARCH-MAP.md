# Research mapped to the demonstration

The September build reviewed the original venture Implementation Plan, Algorithmic verification, LLM-as-judge, _MOC Verification, Stepped Verification, and Optimistic dispute layer for verifier in the adjacent Crypto x AI Research vault. Private meeting notes and market claims were not copied into the public site.

| Research solution | Demo location | Evidence / boundary |
|---|---|---|
| Schema, format, statistical constraints | All seven task families | Actual strict Zod schemas; length and quantity checks |
| Source/reference comparison | Invoice extraction | Actual field-by-field comparison to fixed source |
| Test execution | Code behavior | Bounded interpreter, buyer-owned test vectors; no arbitrary code sandbox |
| Constraint predicates / policy as code | Acceptance contract | Actual equality/type predicates; not a real deployment check |
| Learned metrics (BERTScore, COMET) | Approaches → Work quality | Explained; model integration not implemented |
| Formal methods | Approaches → Work quality | Simple predicates demonstrated; no Lean/LTL theorem proving |
| LLM as judge | Summary, translation, copy, recommendation | Authored rubric examples; optional authenticated live Anthropic call |
| Cross-family consensus | Multi-judge policy | Authored panel votes and real disagreement gate; no live multi-provider panel |
| Confidence escalation | Borderline examples, stepped policy | Actual fail-closed state transition; confidence not calibrated |
| Human arbitration | Held/disputed receipts | Explicit reviewer role-play requiring a rationale; no human marketplace |
| Optimistic dispute window | Optimistic policy | Actual 20-second simulator deadline and freeze; bonds/bounties illustrative |
| Streaming heartbeat / audits / SLA | Approaches → When to verify | Explained; no streaming payment integration |
| Identity / spend authority | Approaches → Identity, provenance & trust | Receipt amount/network/task binding; no authenticated KYA integration |
| Provenance / ZK / TEE | Research guide and receipt explanation | Artifact SHA-256 only; no authenticity or quality proof |
| Reputation / attestations | Audit export and research guide | Exportable receipt; no on-chain attestation or reputation network |
| Settlement integrity | Server demo ledger | Process-local signatures/replay checks; simulated transfers only |
| Per-call stepped verification | Default lab policy | Real deterministic-first routing; uncertainty remains held |

## Corrections to earlier prototype assumptions

- Gray-zone judgments stay held instead of auto-settling.
- An average score cannot override a hard constraint, grounding failure, low confidence, or excessive panel disagreement.
- Schema validity is insufficient to establish field truth.
- A challenge window comes before release. Real disputes require an explicit escrow/hold mechanism; x402 facilitators do not inherently hold funds.
- The original seller-triggered judge is not an independent facilitator-enforced gate. The legacy settlement proxy is now explicitly opt-in and testnet-only.
- A `/judge` approval is logged as approval, not as an on-chain settlement.
- Cost assumptions are shown as assumptions. Historical research estimates and vendor market-share claims are not presented as current measurements.

## Primary references checked September 9, 2026

- [x402 facilitator](https://docs.x402.org/core-concepts/facilitator): payment verification and settlement responsibilities; non-custodial boundary.
- [x402 networks](https://docs.x402.org/core-concepts/network-and-token-support): network-specific payment adapters and testnet support.
- [UMA oracle lifecycle](https://docs.uma.xyz/protocol-overview/how-does-umas-oracle-work): optimistic assertion, challenge window, and dispute escalation pattern.

The linked BERTScore and EZKL repositories in the UI are research references, not dependencies or claims of integrated execution.
