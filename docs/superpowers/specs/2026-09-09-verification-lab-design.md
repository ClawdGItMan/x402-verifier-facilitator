# Verification Lab

Build a shareable interview demonstration of buyer-defined verification before agent payment release. User authorized implementation through completion without design approval checkpoints.

## Experience

The default dashboard becomes a wallet-free laboratory. Visitors select one of seven task types, select a good, bad, or ambiguous deliverable, edit its JSON, select a verification policy and simulated network, and run verification. A buyer/seller/verifier/payment diagram shows progress. The report exposes individual checks, rubric scores, evidence, estimated verification economics, payment state, and an exportable receipt. An optimistic policy provides a 20-second demo challenge window and a dispute action that freezes payment. A reviewer can demonstrate a manual approval/rejection on held work; it is labeled a role-play, never an authenticated arbitration service.

The seven tasks are structured extraction, code behavior, summarization, translation, creative writing, strategic analysis, and generic constraints. Deterministic checks run on actual submitted artifacts. The code example validates a declarative operation pipeline against hidden server-owned test vectors; arbitrary code is never executed. Subjective seeded examples use explicitly authored fixture judgments, not purported live LLM results. Edited subjective text fails closed to review unless the optional server-configured live Anthropic judge is enabled. No fabricated model accuracy or chain transactions.

## Boundaries and architecture

Next.js UI and server endpoints share typed scenario definitions. Zod validates requests. The server evaluates work and issues an HMAC-authenticated, short-lived receipt binding the full request (task, output, policy, price, network) to a verdict. Settlement rechecks the receipt, expiry, output binding, eligibility, dispute deadline, and same-process replay cache before recording a simulated transfer. No wallets, transfers, private keys, or mainnet paths in the public lab. Replay protection is process-local and the deployment is explicitly a simulator; a durable shared ledger is required before real settlement. Missing or invalid judge results never authorize payment.

Live judge is opt-in server-side, enabled only with an access token and API key, accepts bounded inputs, uses a fixed system rubric, returns validated scores, and times out closed. Live multi-provider consensus is future work; the public consensus view uses labeled authored fixture votes. Low confidence, hard grounding failures, or disagreement hold/reject even when average scores are high. Demo mode never silently falls back from a failed live model request.

Keep the original wallet dashboard at /testnet, with wallet providers loaded only there. Preserve its historical Base Sepolia evidence and local setup. Its baseline settlement is payment-only and must be explicitly opted into; it must not appear equivalent to quality-gated settlement. The public server-funded buyer route is disabled in production. Solana devnet is a simulated adapter choice; no live Solana implementation is claimed.

## Research map

Cover deterministic/schema/source checks; executable tests and constraints; learned metrics; formal methods; single LLM; multi-model consensus; confidence escalation; human arbitration; optimistic bonds; streaming heartbeat/SLA; identity and scoped authority; provenance/ZK/TEE; reputation; settlement integrity. Implement core demo interactions, label other methods as research/adapters, and explain what each cannot prove. Include links to primary x402/UMA documentation and repo-local research mapping without publishing private meeting notes.

## Design

Cool paper #f4f6f8, white #ffffff, ink #182c3b, teal #126b62, violet #7564ad, caution #a65d19. Inter for readable interface and large closely spaced display text, existing JetBrains Mono only for JSON and receipt hashes. Wide left-aligned headline and an interactive transaction track; three unequal workbench columns with the receipt as the visual conclusion. Mobile stacks in reading order. Visible focus, semantic controls, reduced-motion support, labeled simulation throughout.

## Acceptance

Unit tests must demonstrate pass/reject/hold; malformed schemas; grounded field mismatch; edited subjective text; prompt injection; low confidence; disagreement; replay/tamper/expiry; held/disputed payment blocking; optimistic time boundary. Browser checks cover all task presets, custom edits, policy changes, export, responsive layout, and legacy route. Production build and monorepo typecheck must pass. Deploy a preview, provide a link, and document the exact demonstrated versus unverified capabilities and a two-minute interview script.
