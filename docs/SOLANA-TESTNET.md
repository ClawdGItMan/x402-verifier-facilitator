# Solana-only testnet direction

The user's September 9 clarification makes **Solana devnet the sole chain target** for the next blockchain version. There is no active Base option or planned EVM fallback.

## Current implementation

- The public playground always uses the Solana devnet simulation.
- The server request schema accepts only `solana-devnet`; Base, other chains, and mainnet are rejected.
- `/testnet` describes the Solana integration status. It does not claim a live wallet or settlement adapter.
- The old wallet dashboard lives at `/archive/base-sepolia`. Its code, setup variables and historical transaction references are archival, not the starting point for the new integration.

## Requirements for the eventual live version

1. Implement a Solana-specific wallet/payment adapter and restrict its configuration to devnet.
2. Bind buyer-approved acceptance terms, seller/payee, work commitment, amount, asset, network and expiry to the payment request.
3. Use durable shared verification and replay state. The current process-local demo ledger cannot gate real payments.
4. Require the server's accepted verdict before submitting settlement. Rejected, unresolved, disputed, expired and mismatched requests must fail closed.
5. Handle transaction confirmation, expired transaction data, retries and reconciliation without paying twice.
6. Record explorer evidence for successful devnet settlement and demonstrate that rejected work does not settle.
7. Keep the wallet-free simulator available independently of wallet funding and provider availability.

This follow-up changes the target and active UI/API boundaries. It does not submit a blockchain transaction or claim a completed live Solana integration.
