# Verifier Facilitator x402

A third-party x402 facilitator that injects LLM-as-judge work-quality verification between `/verify` and `/settle`. Agents paying for subjective work get quality-gated settlement; low-quality work doesn't settle.

**Status**: implementation started. Baseline x402 buyer-agent transaction completed on Base Sepolia on 2026-04-23, repeated through the local facilitator-in-the-middle, and exposed through a browser wallet dashboard.

## Why this exists

Every x402 facilitator shipping today verifies the **payment** (signature, nonce, settlement). Nobody verifies the **work**. For subjective agent tasks — writing, analysis, strategic output — signature-verified settlement isn't enough; the agent paying needs a quality gate. This facilitator is that gate.

## V1 scope

- **Chain**: Base Sepolia (testnet)
- **Architecture**: middleware proxying `x402.org/facilitator`, injecting LLM-as-judge at `/settle`
- **Task types**: 7 endpoints covering structured extraction, code generation, summarization, translation, creative writing, strategic analysis, and a generic fallback
- **Timeline**: 2-3 week sprint, Apr 20, 2026 -> ~May 11, 2026

## Full context

All research, strategy, and the comprehensive implementation plan live in the sibling Obsidian vault:

- Venture hub: `/Users/me/Projects/Crypto x AI Research/Obsidian Research/30-Ventures/Verifier Facilitator x402/Agent Facilitator x402.md`
- Implementation Plan: `/Users/me/Projects/Crypto x AI Research/Obsidian Research/30-Ventures/Verifier Facilitator x402/Implementation Plan.md`

See `CLAUDE.md` in this directory for agent instructions when coding.

## Quick start

Install dependencies:

```bash
npx pnpm@10.23.0 install
```

Create local env and fund a test buyer wallet:

```bash
cp .env.example .env
npx pnpm@10.23.0 wallet:generate
```

Put the generated private key in `.env` as `EVM_PRIVATE_KEY`, set `SELLER_EVM_ADDRESS`, then fund the buyer address with Base Sepolia ETH and USDC.

Run the local facilitator:

```bash
npx pnpm@10.23.0 dev:facilitator
```

Run the paid demo service in another terminal:

```bash
npx pnpm@10.23.0 dev:demo
```

In another terminal, run the buyer agent:

```bash
npx pnpm@10.23.0 tx:baseline
```

Or run the local facilitator, demo service, and browser dashboard together:

```bash
npx pnpm@10.23.0 dev:all
```

Then open `http://localhost:4022`. The dashboard connects a browser wallet on Base Sepolia, shows user and agent USDC balances, funds the agent wallet with test USDC, runs `GET /weather` in either manual-wallet or agent-wallet mode, and shows the payment path live: browser -> demo service -> local facilitator -> upstream x402 facilitator -> Base Sepolia settlement.

The first successful baseline settlement tx was `0xc105ed89ed040dda01a7687dd12ba5b55782b38c3da4599e638d21e4a0ee0c4f`.

The first successful settlement through the local facilitator-in-the-middle was `0x15d2a919fa77b368be9f062b4f3028d1df41edf75e0c81ba54e1dbda3db27c5c`.

The first successful dashboard-triggered agent settlement was `0xfbe369e796f6e6c66a936039feae77b731e9f0a82d6c51871eb23aa71decd4e5`; the latest browser-verified dashboard agent run settled as `0x17de059f92990c9832363fe9fa7b04d181898a3e680aa9d1ba75493f27ad3744`.

Prerequisites:
- Node 20+
- pnpm via `npx pnpm@10.23.0` or a local/global pnpm install
- Base Sepolia wallet with testnet USDC (`https://faucet.circle.com`) and a small amount of Base Sepolia ETH for gas (`https://www.alchemy.com/faucets/base-sepolia`)
- Anthropic API key and OpenAI API key for later judge work
