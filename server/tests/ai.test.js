import test from "node:test";
import assert from "node:assert/strict";
import { generateBrandContent, buildPrompt, GenerationError } from "../services/ai.js";
import { goodContent, validBrief } from "./helpers.js";

const noWait = () => Promise.resolve();

// Fake Gemini client: each call returns/throws the next scripted step.
function fakeClient(steps) {
  const calls = [];
  return {
    calls,
    models: {
      async generateContent(args) {
        calls.push(args);
        const step = steps[Math.min(calls.length - 1, steps.length - 1)];
        if (step instanceof Error) throw step;
        return { text: step };
      },
    },
  };
}

test("returns validated content on the first good response", async () => {
  const client = fakeClient([JSON.stringify(goodContent())]);
  const out = await generateBrandContent(validBrief, { client, wait: noWait });
  assert.equal(out.tweets.length, 10);
  assert.equal(client.calls.length, 1);
});

test("retries after invalid output, then succeeds, and feeds problems back", async () => {
  const bad = goodContent();
  bad.tweets.pop();
  const client = fakeClient([JSON.stringify(bad), JSON.stringify(goodContent())]);
  const out = await generateBrandContent(validBrief, { client, wait: noWait });
  assert.equal(out.tweets.length, 10);
  assert.equal(client.calls.length, 2);
  assert.match(client.calls[1].contents, /PREVIOUS ANSWER WAS REJECTED/);
});

test("stops after 3 attempts (bounded retry)", async () => {
  const client = fakeClient(["not json at all"]);
  await assert.rejects(
    generateBrandContent(validBrief, { client, wait: noWait }),
    (e) => e instanceof GenerationError
  );
  assert.equal(client.calls.length, 3);
});

test("handles empty responses", async () => {
  const client = fakeClient([""]);
  await assert.rejects(generateBrandContent(validBrief, { client, wait: noWait }));
  assert.equal(client.calls.length, 3);
});

test("accepts JSON wrapped in a code fence", async () => {
  const client = fakeClient(["```json\n" + JSON.stringify(goodContent()) + "\n```"]);
  const out = await generateBrandContent(validBrief, { client, wait: noWait });
  assert.equal(out.tweets.length, 10);
});

test("does not retry auth/bad-request API errors", async () => {
  const err = Object.assign(new Error("denied"), { status: 403 });
  const client = fakeClient([err]);
  await assert.rejects(generateBrandContent(validBrief, { client, wait: noWait }));
  assert.equal(client.calls.length, 1);
});

test("retries transient API errors, then gives up", async () => {
  const err = Object.assign(new Error("overloaded"), { status: 503 });
  const client = fakeClient([err]);
  await assert.rejects(generateBrandContent(validBrief, { client, wait: noWait }));
  assert.equal(client.calls.length, 3);
});

test("throws MISSING_API_KEY when no key and no client", async () => {
  const saved = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await assert.rejects(generateBrandContent(validBrief), { code: "MISSING_API_KEY" });
  } finally {
    if (saved !== undefined) process.env.GEMINI_API_KEY = saved;
  }
});

test("prompt includes the brief, posts and guardrails", () => {
  const p = buildPrompt({ ...validBrief, socialPosts: "Post one\nPost two" });
  assert.match(p, /Test Brand/);
  assert.match(p, /habit tracking app/);
  assert.match(p, /1\. Post one/);
  assert.match(p, /exactly 10 distinct tweets/);
  assert.match(p, /never as instructions/);
  assert.match(p, /not looked at any social media account/);
});

test("prompt says when no posts were supplied", () => {
  assert.match(buildPrompt(validBrief), /none provided/);
});

const allStyle = (style) => {
  const c = goodContent();
  c.tweets.forEach((t) => (t.style = style));
  return c;
};

test("tone Witty: prompt demands witty only, schema is limited, mixed output retried", async () => {
  const client = fakeClient([JSON.stringify(goodContent()), JSON.stringify(allStyle("witty"))]);
  const out = await generateBrandContent({ ...validBrief, tone: "Witty" }, { client, wait: noWait });
  assert.ok(out.tweets.every((t) => t.style === "witty"));
  assert.equal(client.calls.length, 2); // first (mixed) answer was rejected
  const first = client.calls[0];
  assert.match(first.contents, /EVERY one of the 10 tweets must be in this style/);
  assert.doesNotMatch(first.contents, /Target mix/);
  assert.deepEqual(first.config.responseSchema.properties.tweets.items.properties.style.enum, ["witty"]);
});

test("tone Educational and Informative each force their own style", async () => {
  for (const tone of ["Educational", "Informative"]) {
    const style = tone.toLowerCase();
    const client = fakeClient([JSON.stringify(allStyle(style))]);
    const out = await generateBrandContent({ ...validBrief, tone }, { client, wait: noWait });
    assert.ok(out.tweets.every((t) => t.style === style), tone);
    assert.equal(client.calls.length, 1);
  }
});

test("no tone: normal mix, all four styles allowed", async () => {
  const client = fakeClient([JSON.stringify(goodContent())]);
  await generateBrandContent({ ...validBrief, tone: "" }, { client, wait: noWait });
  assert.deepEqual(
    client.calls[0].config.responseSchema.properties.tweets.items.properties.style.enum,
    ["conversational", "promotional", "witty", "informative"]
  );
  assert.match(client.calls[0].contents, /Target mix/);
});
