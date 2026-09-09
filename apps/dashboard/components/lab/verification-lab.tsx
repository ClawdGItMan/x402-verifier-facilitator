"use client";
import { useState } from "react";
import { ArrowUpRight, Github, ShieldCheck } from "lucide-react";
import { Workbench } from "./workbench";
import { Economics, ProjectNotes, Research } from "./research";
import "./lab.css";
export function VerificationLab() {
  const [tab, setTab] = useState("lab");
  return (
    <div className="vf-app">
      <header className="vf-header">
        <a className="vf-brand" href="/" aria-label="Verifier home">
          <span>
            <ShieldCheck size={24} />
          </span>
          verifier<span className="vf-brand-tag">x402</span>
        </a>
        <nav aria-label="Main navigation">
          {[
            { id: "lab", name: "Playground" },
            { id: "research", name: "Verification approaches" },
            { id: "project", name: "About the project" },
          ].map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              aria-current={tab === t.id ? "page" : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.name}
            </button>
          ))}
        </nav>
        <a
          className="vf-github"
          href="https://github.com/ClawdGItMan/x402-verifier-facilitator/tree/codex/verification-lab"
          target="_blank"
          rel="noreferrer"
        >
          <Github size={17} />
          <span>View source</span>
          <ArrowUpRight size={13} />
        </a>
      </header>
      <main className="vf-main">
        {tab === "lab" ? (
          <>
            <section className="vf-hero">
              <div>
                <div className="vf-hero-kicker">
                  <span /> An experiment in agent-to-agent trust
                </div>
                <h1>
                  Good work.
                  <br />
                  Then payment.
                </h1>
              </div>
              <div className="vf-hero-aside">
                <p>
                  A valid payment doesn’t mean
                  <br />
                  the work was worth paying for.
                </p>
                <span>
                  Give an agent a task. Inspect what it delivers.
                  <br />
                  Let a verifier decide whether payment moves.
                </span>
                <div className="vf-demo-label">
                  <span className="vf-small-dot" /> Interactive simulation{" "}
                  <span>No wallet required</span>
                </div>
              </div>
            </section>
            <div id="workbench">
              <Workbench />
            </div>
            <Economics />
          </>
        ) : tab === "research" ? (
          <Research />
        ) : (
          <ProjectNotes />
        )}
      </main>
      <footer className="vf-footer">
        <span>
          <ShieldCheck size={16} /> Verifier Facilitator x402
        </span>
        <p>Real checks. Illustrative judgments. Simulated payments.</p>
        <a
          href="https://github.com/ClawdGItMan/x402-verifier-facilitator/tree/codex/verification-lab"
          target="_blank"
          rel="noreferrer"
        >
          Research → prototype → evidence <ArrowUpRight size={13} />
        </a>
      </footer>
    </div>
  );
}
