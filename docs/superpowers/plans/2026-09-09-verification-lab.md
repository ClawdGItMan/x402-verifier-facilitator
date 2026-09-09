# Verification Lab Implementation Plan

**Goal:** Deliver a shareable, wallet-free demonstration of checking agent work before payment.
**Architecture:** Next.js lab, server verification engine, signed simulated settlement receipts; separate original testnet dashboard.
**Tech stack:** Existing pnpm monorepo, TypeScript, Next.js, React, Zod, Node test runner.

- [x] Create scenarios/types in apps/dashboard/lib/verification with seven task families and explicit fixture judgments; implement actual deterministic validation and a fail-closed policy engine. Test in tests/verification.test.ts.
- [x] Implement optional live judge, request validation, HMAC receipts and settle guard in lib/verification and app/api/lab. Test tampering, binding, expiry, dispute, replay, and fail-closed behavior.
- [x] Build components/lab workbench, result/receipt, interactive research map and economics. Move existing page to /archive/base-sepolia and reserve /testnet for the Solana-only integration and scope wallet providers there. Preserve testnet baseline with explicit labeling and opt-in.
- [x] Run pnpm test, pnpm typecheck, pnpm build; inspect desktop/mobile and exercise interactions with Playwright. Fix concrete failures and review major code paths.
- [x] Update README, interview walkthrough, research mapping and verification record. Deploy preview using existing Vercel account; return usable URL and limitations.

Execute inline as already requested by user. Focus reviews on settlement gating and honest simulator boundaries. No automatic chain payments or publishing private research content.
