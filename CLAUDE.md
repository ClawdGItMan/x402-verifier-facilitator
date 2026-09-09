# Verifier Facilitator x402 — Agent Context

This is the **code project** for a third-party x402 facilitator that injects LLM-as-judge work-quality verification between `/verify` and `/settle`. V1 targets Base Sepolia; V2 targets Circle Arc.

## September 2026 current status

The default app is now a wallet-free verification laboratory. Read `README.md`, `docs/VERIFICATION.md`, and `docs/INTERVIEW.md` for the current implementation and demonstrated boundaries. The April plan below is historical context, not the current product scope.

- Public lab: `apps/dashboard/components/lab`, `lib/verification`, and `/api/lab`; real deterministic checks, explicitly authored model fixtures, optional live Anthropic adapter, and simulated payment receipts.
- Original wallet view: `/testnet`; never describe it as live Solana or independently quality-gated settlement. The baseline `/settle` proxy is blocked unless explicitly opted into and restricted to Base Sepolia.
- Do not log a judge approval as a settlement or present artifact hashes as provenance proofs.
- Tests: `pnpm test`, `pnpm typecheck`, `pnpm build`. Webpack extension aliases preserve original NodeNext `.js` imports.

## Read this first

All strategic context, research, and the comprehensive implementation plan live in the Obsidian research vault next door:

- **Venture hub (start here)**: `/Users/me/Projects/Crypto x AI Research/Obsidian Research/30-Ventures/Verifier Facilitator x402/Agent Facilitator x402.md`
- **Implementation plan** (12 sections, session-by-session): `/Users/me/Projects/Crypto x AI Research/Obsidian Research/30-Ventures/Verifier Facilitator x402/Implementation Plan.md`
- **Origin idea** (the thesis): `/Users/me/Projects/Crypto x AI Research/Obsidian Research/20-Ideas/Verifier Facilitator for x402.md`
- **Protocol reference**: `/Users/me/Projects/Crypto x AI Research/Obsidian Research/10-Research/mcp-and-protocols/x402.md`

Before writing any code, read the Implementation Plan end to end. It covers the repo structure, tech stack, data model, per-task-type rubrics, thresholds, environment setup, and session-by-session order.

## Project conventions

- Follow the user's global CLAUDE.md at `/Users/me/CLAUDE.md` (Next.js App Router, TypeScript strict, pnpm, Zod, functional components, named exports, Server Actions over API routes, etc.)
- Code lives in a pnpm monorepo: `apps/facilitator`, `apps/demo-service`, `apps/buyer-agent`, `apps/dashboard`, `packages/shared`
- Current x402 packages use the neutral `@x402/*` namespace (`@x402/express`, `@x402/fetch`, `@x402/core`, `@x402/evm`), not the older `@coinbase/x402` naming in early notes.
- Commit style: conventional commits (`feat:`, `fix:`, `chore:`)
- Branch style: `feature/<name>`, `fix/<name>`
- Never commit secrets — use `.env` files locally, list required vars in `.env.example`
- Never hardcode private keys, API keys, or wallet addresses

## V1 scope (locked 2026-04-20)

| Decision | Value |
|---|---|
| Timeline | 2026-04-20 -> ~2026-05-11 — 2-3 week sprint |
| Architecture | Middleware proxying `x402.org/facilitator` (Option B in the plan) |
| Chain | Base Sepolia only |
| Task types | 7 endpoints: structured extraction, code, summarization, translation, creative, strategic, generic |
| Excluded | High-stakes medical/financial (principled exclusion) |
| Demo brand | "Verified AI work" |
| Success bar | 70 scripted transactions logged, dashboard live, demo-able to Arc dev-rel |

## Status

- **2026-04-20** — folder initialized. No code yet. Next session: Session 1 of the Implementation Plan (scaffold monorepo, proxy facilitator endpoints, smoke test round-trips a test payment on Base Sepolia).
- **2026-04-23** — pnpm monorepo scaffolded with `apps/demo-service`, `apps/buyer-agent`, and `packages/shared`. Baseline paid request settled end-to-end on Base Sepolia via `x402.org/facilitator`; tx `0xc105ed89ed040dda01a7687dd12ba5b55782b38c3da4599e638d21e4a0ee0c4f`.
- **2026-04-23 (later)** — added `apps/facilitator` as a local pass-through service for `/supported`, `/verify`, and `/settle`. Demo service successfully paid through local facilitator -> upstream `x402.org/facilitator`; tx `0x15d2a919fa77b368be9f062b4f3028d1df41edf75e0c81ba54e1dbda3db27c5c`.
- **2026-04-23 (dashboard)** — added `apps/dashboard` with browser wallet connection, Base Sepolia USDC funding, manual-wallet and agent-wallet `/weather` runs, live facilitator SSE events, and settlement visualization. Latest browser-verified agent dashboard run settled tx `0x17de059f92990c9832363fe9fa7b04d181898a3e680aa9d1ba75493f27ad3744`.

## Writing-back to the vault

When notable decisions, findings, or gotchas emerge during implementation:
- Update the venture MOC's status log
- Add a new doc to `30-Ventures/Verifier Facilitator x402/` if it deserves its own note (e.g. `Rubric Design.md`, `Retro Apr 26.md`, `Arc Outreach Draft.md`)
- Update the idea note at `20-Ideas/Verifier Facilitator for x402.md` only for status changes — main content stays frozen for lineage

The goal is that anyone (Claude, the user, a future collaborator) reading either the vault or this repo can reach the full picture in one hop.
