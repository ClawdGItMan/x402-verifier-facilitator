# Verification record — September 9, 2026

## Automated

- `pnpm test`: **55 passed, 0 failed**. Covers all seven task families, field/source disagreement, malformed schemas, extra fields, fractional code-test failures, edited subjective artifacts, instruction-injection holds, confidence/panel disagreement, exact rubric identities, unrounded thresholds, invalid model output, provider failure, authorization, request-size limits, receipt binding, tampering, expiry, replay, dispute deadlines, reviewer rationale, and terminal states.
- `pnpm typecheck`: **passed** across all six TypeScript project configurations.
- `pnpm build`: **passed** with Next.js 16.2.4 and Webpack. Vercel's production build also completed successfully.
- `git diff --check`: **passed**.
- Independent code review found and verified fixes for reordered grounding dimensions and rounding at the release threshold. Both have regression tests.

## Browser validation (local, Chromium)

- At 1440 × 1080: all seven good presets released simulated payment; all seven bad presets blocked it.
- Invoice: a schema-valid wrong amount failed its source comparison.
- Custom subjective text: held for review, with no invented model score.
- Deterministic-only policy on subjective work: held for semantic evaluation.
- Multi-judge disagreement: held even with a passing aggregate score.
- Optimistic policy: challenge window opened; submitting a complaint froze the payment; role-play approval allowed subsequent simulated release.
- Export receipt: downloaded valid JSON with hashes and event history; authentication token is excluded.
- All research categories and the interview walkthrough rendered and navigated.
- At 390 × 844: the mobile flow released a simulated payment, layout stacked correctly, and document width equaled viewport width (390 px), with no horizontal overflow.
- Original view (now `/archive/base-sepolia`) rendered with the facilitator and event stream online; seller service and wallets were intentionally unconfigured. Its expected offline seller requests produced console errors. No payment was attempted.
- Legacy `/settle` returned `work_verification_required` by default without forwarding a request upstream.
- Playground browser console: **0 errors**. Development-only font preload warnings were observed.

Screenshots and browser receipt are retained locally in `output/playwright/` (ignored by Git).

## Hosting

- Project: `x402-verifier-lab` in the existing Vercel account.
- Public URL: https://x402-verifier-lab.vercel.app
- Root: `apps/dashboard`; Node 22; install `pnpm install --frozen-lockfile`; build `pnpm build`.
- Project-level Vercel SSO protection disabled for the requested public demo.
- No provider keys or wallet secrets uploaded. Live judging remains disabled.
- Deployment reported READY. Functional browser checks were performed locally; hosted runtime availability was not independently probed.

## Material limitations

- No new Base Sepolia or Solana transaction was submitted. April Base Sepolia transaction references are historical repository evidence.
- No paid Anthropic request was made because no API key is configured. The live adapter was tested with mocked provider responses, including malformed responses and provider errors.
- Multi-judge votes and public semantic scores are authored examples, not live calls, measured accuracy, or a calibrated probability estimate.
- Ledger state, authentication keys, and replay protection are temporary and process-local. Another instance or server restart fails closed. This requires a durable shared ledger before real-money use.
- The manual review controls are an explicitly labeled role-play. Identity, arbitration, bonds, escrow, learned metrics, ZK/TEE, on-chain reputation, and streaming integrations are not claimed as implemented.
- Legacy wallet dependencies still emit optional-module build warnings for MetaMask React Native storage, `pino-pretty`, and a dynamic `ox` import. They do not prevent the production build; wallet modules are isolated to `/archive/base-sepolia`.

## Solana-only follow-up

The active API now rejects Base Sepolia and every network except `solana-devnet`. `/testnet` is the Solana integration-status page; the prior Base wallet view is archived at `/archive/base-sepolia`. The additional API boundary test passes for Base, EVM network IDs, mainnet and unrelated chains. Live Solana settlement is still an integration requirement, not an implemented claim.

## Judge timing follow-up

- Seven timing tests cover fast deterministic/rejected/unmatched paths, 8-second single-judge pacing, 10-second concurrent panels, 16-second stepped escalation, no release-capable receipt before completion, a full post-evaluation challenge window, actual live timing without padding, provider failure, and cancellation. Clocks are injected in unit tests; browser checks use real elapsed time.
- Local browser receipts reported 8.01s for a single judge, 10.01s for a concurrent panel, and 16.00s for escalation. Browser wait includes additional request/render overhead.
- The panel and escalation examples held payment; deterministic extraction released in 73ms of browser time.
- The progress panel rendered at 1440px and 390px widths; mobile document width matched the viewport. Canceling returned to an editable workbench and allowed a fresh deterministic run without release from the canceled request.
- The optimistic browser flow displayed a full 20-second countdown after its 8-second evaluation. Navigating away during another run issued only a verify request and no settlement request after the modeled deadline.
- Independent review found no blocking issues in timing, cancellation, or the payment gate. A development-only Fast Refresh warning from changing a hook dependency list cleared on full reload; the fresh browser session had no console errors.
- These are intentionally modeled fixture delays. No live-provider performance benchmark or Solana transaction was performed.
