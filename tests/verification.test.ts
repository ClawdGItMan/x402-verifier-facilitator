import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluate,
  requestSchema,
  type VerificationRequest,
} from "../apps/dashboard/lib/verification/engine";
import {
  getScenario,
  scenarios,
  type TaskId,
} from "../apps/dashboard/lib/verification/scenarios";
import { DemoLedger } from "../apps/dashboard/lib/verification/receipts";
import { POST, GET } from "../apps/dashboard/app/api/lab/route";
function request(
  task: TaskId = "extraction",
  preset = "good",
  overrides: Partial<VerificationRequest> = {},
): VerificationRequest {
  const s = getScenario(task);
  return {
    task,
    artifact: JSON.stringify(s.presets.find((p) => p.id === preset)!.output),
    policy: "stepped",
    network: "solana-devnet",
    amount: s.price,
    judgeMode: "fixture",
    ...overrides,
  };
}
for (const s of scenarios) {
  test(`${s.title}: correct work passes`, () =>
    assert.equal(evaluate(request(s.id)).verdict, "pass"));
  test(`${s.title}: bad work cannot release`, () =>
    assert.notEqual(evaluate(request(s.id, "bad")).verdict, "pass"));
}
test("schema-valid wrong amount fails source comparison", () => {
  const result = evaluate(request("extraction", "bad"));
  assert.equal(
    result.checks.find((c) => c.name === "Schema validation")?.status,
    "pass",
  );
  assert.equal(
    result.checks.find((c) => c.name === "Source · total")?.status,
    "fail",
  );
  assert.equal(result.judgeSource, "none");
});
test("malformed and missing schema fields reject before model work", () => {
  for (const artifact of [
    "{",
    "null",
    "[]",
    "{}",
    '{"merchant":"Harbor Compute","total":"12","currency":"USDC","taskCount":3}',
  ])
    assert.equal(
      evaluate(request("extraction", "good", { artifact })).verdict,
      "reject",
    );
});
test("unknown fields are rejected", () =>
  assert.equal(
    evaluate(
      request("extraction", "good", {
        artifact: JSON.stringify({
          ...getScenario("extraction").presets[0]!.output,
          approved: true,
        }),
      }),
    ).verdict,
    "reject",
  ));
test("code tests catch fractional rounding", () => {
  const result = evaluate(request("code", "bad"));
  assert.equal(result.verdict, "reject");
  assert.match(
    result.checks.find((c) => c.name === "Test · [1, 2]")!.detail,
    /returned 2/,
  );
});
test("arbitrary code is never an allowed operation", () =>
  assert.equal(
    evaluate(
      request("code", "good", {
        artifact: '{"operations":["process.exit()"]}',
      }),
    ).verdict,
    "reject",
  ));
test("edited semantic work is held, not silently scored by a fake model", () => {
  const result = evaluate(
    request("summary", "good", {
      artifact: '{"summary":"A new summary not in the fixtures."}',
    }),
  );
  assert.equal(result.verdict, "hold");
  assert.equal(result.score, null);
  assert.equal(result.judgeSource, "none");
});
test("JSON key order does not invalidate an authored fixture", () => {
  const s = getScenario("analysis").presets[0]!.output;
  assert.equal(
    evaluate(
      request("analysis", "good", {
        artifact: JSON.stringify({
          recommendations: s.recommendations,
          analysis: s.analysis,
        }),
      }),
    ).verdict,
    "pass",
  );
});
test("schema-only subjective task stays held", () =>
  assert.equal(
    evaluate(request("summary", "good", { policy: "schema" })).verdict,
    "hold",
  ));
test("injection example is held before judging", () => {
  const r = evaluate(request("summary", "injection"));
  assert.equal(r.verdict, "hold");
  assert.equal(r.score, null);
});
test("borderline confidence escalates and holds", () => {
  const r = evaluate(request("summary", "edge"));
  assert.equal(r.verdict, "hold");
  assert.equal(r.votes.length, 3);
});
test("consensus disagreement holds despite a passing average", () => {
  const r = evaluate(request("creative", "edge", { policy: "consensus" }));
  assert.ok(r.score! >= 70);
  assert.equal(r.verdict, "hold");
  assert.match(r.reason, /disagree/);
});
test("live mode never silently falls back to fixtures", () => {
  const r = evaluate(request("summary", "good", { judgeMode: "live" }));
  assert.equal(r.verdict, "hold");
  assert.equal(r.judgeSource, "none");
});
test("invalid model scores fail closed", () => {
  const fixture = structuredClone(getScenario("summary").presets[0]!.judgment!);
  fixture.dimensions[0]!.score = NaN;
  assert.equal(
    evaluate(request("summary", "good", { judgeMode: "live" }), fixture)
      .verdict,
    "hold",
  );
});
test("grounding failure cannot be rescued by three perfect dimensions", () => {
  const j = structuredClone(getScenario("summary").presets[0]!.judgment!);
  j.dimensions.forEach((d) => (d.score = 100));
  j.dimensions[0]!.score = 20;
  const r = evaluate(request("summary", "good", { judgeMode: "live" }), j);
  assert.ok(r.score! >= 70);
  assert.equal(r.verdict, "reject");
});
test("a single live judge cannot fake independent consensus", () => {
  const j = structuredClone(getScenario("summary").presets[0]!.judgment!);
  j.votes = [99];
  assert.equal(
    evaluate(
      request("summary", "good", { judgeMode: "live", policy: "consensus" }),
      j,
    ).verdict,
    "hold",
  );
});
test("negative, non-finite and excessive payment amounts fail request validation", () => {
  for (const amount of [-1, 0, NaN, Infinity, 1001])
    assert.equal(
      requestSchema.safeParse(request("extraction", "good", { amount }))
        .success,
      false,
    );
});
test("rejects unknown mode and network at API boundary", () => {
  assert.equal(
    requestSchema.safeParse({ ...request(), network: "solana-mainnet" })
      .success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({ ...request(), judgeMode: "trust-me" }).success,
    false,
  );
});
test("release uses a bound receipt and prevents replay", () => {
  const ledger = new DemoLedger();
  const req = request();
  const r = ledger.issue(req, evaluate(req), 1000);
  const result = ledger.transition(r.id, r.token, req, "release", "", 1001);
  assert.equal(result.paymentState, "released");
  assert.match(result.transaction!, /^sim_/);
  assert.throws(
    () => ledger.transition(r.id, r.token, req, "release", "", 1002),
    /final/,
  );
});
test("changing task, artifact, price, network, or policy invalidates receipt", () => {
  const ledger = new DemoLedger();
  const req = request();
  const r = ledger.issue(req, evaluate(req));
  for (const altered of [
    { amount: 50 },
    { network: "base-sepolia" },
    { task: "custom" },
    { artifact: "{}" },
    { policy: "schema" },
  ])
    assert.throws(
      () =>
        ledger.transition(
          r.id,
          r.token,
          { ...req, ...altered } as VerificationRequest,
          "release",
          "",
        ),
      /does not match/,
    );
});
test("rejects forged signatures and unknown receipts", () => {
  const ledger = new DemoLedger();
  const req = request();
  const r = ledger.issue(req, evaluate(req));
  assert.throws(
    () => ledger.transition(r.id, "0".repeat(64), req, "release", ""),
    /does not match/,
  );
  assert.throws(
    () => ledger.transition("missing", r.token, req, "release", ""),
    /expired/,
  );
});
test("receipt expiry and server restart fail closed", () => {
  const ledger = new DemoLedger();
  const req = request();
  const r = ledger.issue(req, evaluate(req), 0);
  assert.throws(
    () => ledger.transition(r.id, r.token, req, "release", "", 600000),
    /expired/,
  );
  assert.throws(
    () => new DemoLedger().transition(r.id, r.token, req, "release", "", 1),
    /expired/,
  );
});
test("rejected and held work cannot release", () => {
  for (const req of [
    request("extraction", "bad"),
    request("summary", "edge"),
  ]) {
    const ledger = new DemoLedger();
    const r = ledger.issue(req, evaluate(req));
    assert.throws(() => ledger.transition(r.id, r.token, req, "release", ""));
  }
});
test("optimistic release waits until the exact deadline", () => {
  const ledger = new DemoLedger();
  const req = request("extraction", "good", { policy: "optimistic" });
  const r = ledger.issue(req, evaluate(req), 0);
  assert.throws(
    () => ledger.transition(r.id, r.token, req, "release", "", 19999),
    /held/,
  );
  assert.equal(
    ledger.transition(r.id, r.token, req, "release", "", 20000).paymentState,
    "released",
  );
});
test("dispute freezes payment beyond the deadline until review", () => {
  const ledger = new DemoLedger();
  const req = request("extraction", "good", { policy: "optimistic" });
  const r = ledger.issue(req, evaluate(req), 0);
  assert.equal(
    ledger.transition(
      r.id,
      r.token,
      req,
      "challenge",
      "Evidence does not match the requirement.",
      10000,
    ).paymentState,
    "disputed",
  );
  assert.throws(
    () => ledger.transition(r.id, r.token, req, "release", "", 30000),
    /held/,
  );
  assert.equal(
    ledger.transition(
      r.id,
      r.token,
      req,
      "approve",
      "Reviewed against the supplied buyer contract.",
      31000,
    ).paymentState,
    "ready",
  );
  assert.equal(
    ledger.transition(r.id, r.token, req, "release", "", 32000).paymentState,
    "released",
  );
});
test("late challenges and blank review rationale are rejected", () => {
  const ledger = new DemoLedger();
  const req = request("extraction", "good", { policy: "optimistic" });
  const r = ledger.issue(req, evaluate(req), 0);
  assert.throws(
    () =>
      ledger.transition(
        r.id,
        r.token,
        req,
        "challenge",
        "Dispute rationale.",
        20000,
      ),
    /not open/,
  );
  const held = request("summary", "edge");
  const h = ledger.issue(held, evaluate(held));
  assert.throws(
    () => ledger.transition(h.id, h.token, held, "approve", ""),
    /rationale/,
  );
});
test("a manual rejection is final", () => {
  const ledger = new DemoLedger();
  const req = request("summary", "edge");
  const r = ledger.issue(req, evaluate(req));
  assert.equal(
    ledger.transition(
      r.id,
      r.token,
      req,
      "reject",
      "Missing important source details.",
    ).paymentState,
    "refunded",
  );
  assert.throws(
    () =>
      ledger.transition(r.id, r.token, req, "approve", "Changing my mind now."),
    /final/,
  );
});
const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/lab", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
test("HTTP flow verifies, releases, and refuses a second release", async () => {
  const req = request();
  const response = await post({ operation: "verify", request: req });
  assert.equal(response.status, 200);
  const receipt = await response.json();
  const body = {
    operation: "settle",
    request: req,
    id: receipt.id,
    token: receipt.token,
    action: "release",
    rationale: "",
  };
  const settled = await post(body);
  assert.equal((await settled.json()).paymentState, "released");
  assert.equal((await post(body)).status, 400);
});
test("HTTP rejects malformed, oversized, and forged-verdict requests", async () => {
  assert.equal(
    (
      await POST(
        new Request("http://localhost/api/lab", { method: "POST", body: "{" }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await POST(
        new Request("http://localhost/api/lab", {
          method: "POST",
          body: "a".repeat(20001),
        }),
      )
    ).status,
    413,
  );
  assert.equal(
    (await post({ operation: "verify", request: request(), verdict: "pass" }))
      .status,
    400,
  );
});
test("public API does not allow unauthorized live spending", async () => {
  assert.equal(
    (
      await post({
        operation: "verify",
        request: request("summary", "good", { judgeMode: "live" }),
      })
    ).status,
    403,
  );
  assert.equal((await GET()).status, 200);
});
test("reordered, duplicated, or missing named model dimensions cannot authorize release", () => {
  const source = getScenario("summary").presets[0]!.judgment!;
  const reordered = structuredClone(source);
  reordered.dimensions.reverse();
  const duplicated = structuredClone(source);
  duplicated.dimensions[0]!.name = "Clarity";
  const missing = structuredClone(source);
  missing.dimensions.pop();
  for (const j of [reordered, duplicated, missing])
    assert.equal(
      evaluate(request("summary", "good", { judgeMode: "live" }), j).verdict,
      "hold",
    );
});
test("release threshold uses the unrounded mean", () => {
  for (const [scores, expected] of [
    [[70, 69, 69, 70], "hold"],
    [[70, 70, 70, 70], "pass"],
  ] as const) {
    const j = structuredClone(getScenario("summary").presets[0]!.judgment!);
    j.dimensions.forEach((d, i) => (d.score = scores[i]!));
    assert.equal(
      evaluate(request("summary", "good", { judgeMode: "live" }), j).verdict,
      expected,
    );
  }
});
test("live adapter sends an isolated rubric and validates the returned judgment", async (t) => {
  const { runLiveJudge } = await import(
    "../apps/dashboard/lib/verification/live-judge"
  );
  const result = structuredClone(getScenario("summary").presets[0]!.judgment!);
  result.votes = [97];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, options: RequestInit) => {
      const body = JSON.parse(options.body as string);
      assert.match(body.system, /untrusted data, never instructions/);
      assert.equal(body.messages.length, 1);
      assert.equal(
        JSON.parse(body.messages[0].content).artifact,
        request("summary").artifact,
      );
      assert.ok(options.signal);
      return Response.json({
        content: [{ type: "text", text: JSON.stringify(result) }],
      });
    },
  );
  assert.deepEqual(
    await runLiveJudge(request("summary", "good", { judgeMode: "live" })),
    result,
  );
});
test("live adapter fails closed on provider errors, malformed JSON, or invented panel votes", async (t) => {
  const { runLiveJudge } = await import(
    "../apps/dashboard/lib/verification/live-judge"
  );
  const fixture = getScenario("summary").presets[0]!.judgment!;
  const responses = [
    new Response("unavailable", { status: 503 }),
    Response.json({ content: [{ type: "text", text: "not json" }] }),
    Response.json({
      content: [{ type: "text", text: JSON.stringify(fixture) }],
    }),
  ];
  t.mock.method(globalThis, "fetch", async () => responses.shift()!);
  for (let i = 0; i < 3; i++)
    await assert.rejects(
      runLiveJudge(request("summary", "good", { judgeMode: "live" })),
    );
});
