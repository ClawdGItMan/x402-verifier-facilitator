import Link from "next/link";
import { Providers } from "../providers";
import { TransactionDashboard } from "../transaction-dashboard";
export default function TestnetPage() {
  return (
    <>
      <div
        style={{
          padding: "18px 24px",
          background: "#e7edf1",
          color: "#182c3b",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        <Link href="/">← Back to verification playground</Link>
        <br />
        <strong>Original Base Sepolia baseline.</strong> This wallet dashboard
        requires local services. Its settlement proxy verifies payments, not
        work quality. Enable ALLOW_UNVERIFIED_TESTNET_SETTLEMENT=true locally to
        reproduce the historical baseline. The public demo cannot spend a server
        wallet.
      </div>
      <Providers>
        <TransactionDashboard />
      </Providers>
    </>
  );
}
