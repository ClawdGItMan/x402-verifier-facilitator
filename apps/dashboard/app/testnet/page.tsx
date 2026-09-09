import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import "../../components/lab/lab.css";

export default function TestnetPage() {
  return (
    <div className="vf-app">
      <header className="vf-header">
        <Link className="vf-brand" href="/" aria-label="Verifier home">
          <span>
            <ShieldCheck size={24} />
          </span>
          verifier<span className="vf-brand-tag">x402</span>
        </Link>
        <Link href="/">Back to the playground</Link>
      </header>
      <main className="vf-main">
        <div className="vf-section-intro">
          <div>
            <h1>
              Solana devnet.
              <br />
              The testnet target.
            </h1>
          </div>
          <p>
            The next blockchain version will be built exclusively for Solana
            devnet. The public playground currently simulates its payments.
          </p>
        </div>
        <div className="vf-project-columns">
          <section>
            <h3>Available now</h3>
            <p>
              Run real schema, source, and constraint checks on agent
              deliverables. Explore judgment, disagreement, disputes, and review
              with simulated USDC release.
            </p>
            <p>
              The active verification API accepts only the Solana devnet
              simulation. It rejects Base, other networks, and mainnet requests.
            </p>
            <Link className="vf-testnet-link" href="/">
              Open the Solana demo <ArrowUpRight size={14} />
            </Link>
          </section>
          <section>
            <h3>Before live testnet payments</h3>
            <p>
              The Solana integration needs a wallet and payment adapter,
              buyer-signed acceptance terms, durable verification receipts, and
              a settlement gate that cannot be bypassed by a seller.
            </p>
            <p>
              It will need confirmed devnet transactions and tests showing that
              rejected, disputed, expired, or repeated requests cannot release
              another payment. No live Solana settlement is claimed yet.
            </p>
          </section>
        </div>
        <div className="vf-walkthrough">
          <h3>One chain for the next version</h3>
          <p>
            Solana devnet only. The earlier Base Sepolia experiment is preserved
            as an archive; it is not the foundation or fallback for the new
            testnet integration.
          </p>
          <Link className="vf-testnet-link" href="/archive/base-sepolia">
            Historical Base prototype <ArrowUpRight size={14} />
          </Link>
        </div>
      </main>
    </div>
  );
}
