# Baseline x402 Transaction Setup

This repo starts with a plain x402 paid request before any verifier middleware is added.

## 1. Install dependencies

```bash
npx pnpm@10.23.0 install
```

## 2. Create local env

```bash
cp .env.example .env
npx pnpm@10.23.0 wallet:generate
```

Put the generated private key in `EVM_PRIVATE_KEY`. Put any Base Sepolia EVM receive address in `SELLER_EVM_ADDRESS`.

## 3. Fund the buyer wallet

Fund the generated buyer address with:

- Base Sepolia ETH for gas
- Base Sepolia USDC for payment

## 4. Run the local facilitator

```bash
npx pnpm@10.23.0 dev:facilitator
```

This exposes local `/supported`, `/verify`, and `/settle` endpoints and forwards them to `UPSTREAM_FACILITATOR_URL`.

## 5. Run the demo service

```bash
npx pnpm@10.23.0 dev:demo
```

## 6. Run the buyer agent

In another terminal:

```bash
npx pnpm@10.23.0 tx:baseline
```

## 7. Run the browser dashboard

To run the facilitator, demo service, and dashboard together:

```bash
npx pnpm@10.23.0 dev:all
```

Open `http://localhost:4022`.

The dashboard supports one real transaction, `GET /weather`, with two modes:

- **Manual wallet pays**: the connected browser wallet pays the x402 request.
- **Agent pays**: the local server uses `EVM_PRIVATE_KEY` to pay the same request.

Use the **Fund** action to transfer Base Sepolia USDC from the connected wallet to the agent wallet before running agent mode. The dashboard shows user and agent balances, browser-side payment steps, local facilitator `/supported`, `/verify`, and `/settle` events, plus the final Base Sepolia settlement hash.

Expected flow:

1. Buyer requests `GET /weather`.
2. Demo service returns x402 `402 Payment Required`.
3. Buyer agent signs and retries with `PAYMENT-SIGNATURE`.
4. Demo service calls the local facilitator at `X402_FACILITATOR_URL`.
5. Local facilitator proxies `/verify` and `/settle` to `UPSTREAM_FACILITATOR_URL`.
6. Upstream facilitator settles on Base Sepolia.
7. Buyer receives `200 OK`, a JSON body, and a `PAYMENT-RESPONSE` settlement header.
