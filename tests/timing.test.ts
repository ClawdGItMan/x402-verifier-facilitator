import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluate,
  type VerificationRequest,
} from "../apps/dashboard/lib/verification/engine";
import { getScenario } from "../apps/dashboard/lib/verification/scenarios";
import {
  timingPlan,
  timingPhase,
} from "../apps/dashboard/lib/verification/timing";
import { runTimedVerification } from "../apps/dashboard/lib/verification/timed-verification";
import { DemoLedger } from "../apps/dashboard/lib/verification/receipts";
import { POST } from "../apps/dashboard/app/api/lab/route";

function request(
  task: VerificationRequest["task"] = "summary",
  preset = "good",
  policy: VerificationRequest["policy"] = "stepped",
): VerificationRequest {
  return {
    task,
    artifact: JSON.stringify(
      getScenario(task).presets.find((p) => p.id === preset)!.output,
    ),
    policy,
    network: "solana-devnet",
    amount: 0.05,
    judgeMode: "fixture",
  };
}

test("only authored semantic judgments incur modeled latency", () => {
  const cases = [
    request("extraction"),
    request("code"),
    request("summary", "good", "schema"),
    { ...request(), artifact: "{" },
    {
      ...request(),
      artifact: JSON.stringify({
        summary: "An edited summary without a fixture.",
      }),
    },
  ];
  for (const r of cases)
    assert.deepEqual(timingPlan(r, evaluate(r)), {
      kind: "checks",
      modeledMs: 0,
    });
  const r = request();
  assert.deepEqual(timingPlan(r, evaluate(r)), {
    kind: "single",
    modeledMs: 8000,
  });
});

test("parallel panels and sequential escalation have distinct timing", () => {
  const parallel = request("creative", "edge", "consensus");
  assert.equal(evaluate(parallel).judgeSource, "authored-fixture");
  assert.deepEqual(timingPlan(parallel, evaluate(parallel)), {
    kind: "parallel",
    modeledMs: 10000,
  });
  const stepped = request("summary", "edge");
  assert.equal(evaluate(stepped).confidence! < 0.8, true);
  const plan = timingPlan(stepped, evaluate(stepped));
  assert.deepEqual(plan, { kind: "escalation", modeledMs: 16000 });
  assert.equal(timingPhase(plan, 7999), "Evaluating the acceptance rubric");
  assert.equal(timingPhase(plan, 8000), "Escalating to an independent panel");
});

test("receipt and full challenge window begin only after paced verification", async () => {
  const r = request("summary", "good", "optimistic");
  const ledger = new DemoLedger();
  let clock = 1000;
  let complete = false;
  let resume!: () => void;
  const pending = runTimedVerification(r, () => evaluate(r), {
    now: () => clock,
    wait: (ms) =>
      new Promise<void>((resolve) => {
        assert.equal(ms, 8000);
        resume = () => {
          clock += ms;
          resolve();
        };
      }),
  }).then(({ verification, timing }) => {
    complete = true;
    return ledger.issue(r, verification, clock, timing);
  });
  await Promise.resolve();
  assert.equal(complete, false);
  resume();
  const receipt = await pending;
  assert.equal(receipt.issuedAt, 9000);
  assert.equal(receipt.notBefore, 29000);
  assert.equal(receipt.timing?.elapsedMs, 8000);
  assert.equal(receipt.timing?.basis, "illustrative");
  assert.throws(() =>
    ledger.transition(receipt.id, receipt.token, r, "release", "", 28999),
  );
  assert.equal(
    ledger.transition(receipt.id, receipt.token, r, "release", "", 29000)
      .paymentState,
    "released",
  );
});

test("live evaluation reports actual elapsed time without an artificial delay", async () => {
  const r = { ...request(), judgeMode: "live" as const };
  let clock = 0;
  const result = await runTimedVerification(
    r,
    () => {
      clock = 4321;
      return evaluate(r, getScenario("summary").presets[0]!.judgment);
    },
    {
      now: () => clock,
      wait: async () => {
        assert.fail("live calls must not add fixture latency");
      },
    },
  );
  assert.deepEqual(result.timing, {
    kind: "live",
    modeledMs: 0,
    elapsedMs: 4321,
    basis: "measured",
  });
});

test("deterministic evaluations are not padded and failures do not become receipts", async () => {
  const r = request("extraction");
  const result = await runTimedVerification(r, () => evaluate(r), {
    wait: async () => assert.fail("no timer for deterministic work"),
  });
  assert.equal(result.timing.modeledMs, 0);
  assert.equal(result.timing.basis, "measured");
  await assert.rejects(
    runTimedVerification(r, async () => {
      throw new Error("provider failed");
    }),
    /provider failed/,
  );
});

test("cancellation during pacing cannot complete verification", async () => {
  const controller = new AbortController();
  const r = request();
  await assert.rejects(
    runTimedVerification(r, () => evaluate(r), {
      signal: controller.signal,
      wait: async () => {
        controller.abort();
      },
    }),
    { name: "AbortError" },
  );
});

test("API abort during modeled judge wait returns no settlement receipt", async () => {
  const controller = new AbortController();
  const pending = POST(
    new Request("http://localhost/api/lab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "verify", request: request() }),
      signal: controller.signal,
    }),
  );
  const timer = setTimeout(() => controller.abort(), 30);
  try {
    const response = await pending;
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.id, undefined);
    assert.equal(body.token, undefined);
  } finally {
    clearTimeout(timer);
  }
});
