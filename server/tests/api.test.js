import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";
import { goodContent, validBrief } from "./helpers.js";

let server;
let base;
let generateCalls = 0;
let generateImpl;

before(async () => {
  const app = createApp({
    generate: async (brief) => {
      generateCalls += 1;
      return generateImpl(brief);
    },
    env: { NODE_ENV: "test", RATE_LIMIT_MAX: "1000", GEMINI_API_KEY: "placeholder" },
  });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const post = (body, raw = false) =>
  fetch(`${base}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? body : JSON.stringify(body),
  });

test("health check", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, "ok");
  assert.equal(json.aiConfigured, true);
  assert.equal(JSON.stringify(json).includes("placeholder"), false);
});

test("rejects malformed JSON with a clean 400 and no stack trace", async () => {
  const res = await post("{not json", true);
  assert.equal(res.status, 400);
  const text = await res.text();
  assert.match(text, /valid JSON/);
  assert.equal(/at .*\.js|node_modules|SyntaxError/.test(text), false);
});

test("rejects arrays, unexpected fields, wrong types, long fields", async () => {
  assert.equal((await post([])).status, 400);

  const extra = await post({ ...validBrief, hack: "x" });
  assert.equal(extra.status, 400);
  assert.deepEqual((await extra.json()).fields, ["hack"]);

  assert.equal((await post({ ...validBrief, tone: 5 })).status, 400);
  assert.equal((await post({ ...validBrief, brandName: "a".repeat(121) })).status, 400);
  assert.equal((await post({ ...validBrief, products: "a".repeat(3001) })).status, 400);
  assert.equal((await post({ ...validBrief, socialPosts: "a".repeat(12001) })).status, 400);
});

test("requires brand name or product details", async () => {
  generateCalls = 0;
  const res = await post({ brandName: "  ", products: "", industry: "Fashion" });
  assert.equal(res.status, 400);
  assert.equal(generateCalls, 0);
});

test("optional fields may be empty", async () => {
  generateImpl = async () => goodContent();
  const res = await post({ brandName: "Solo" });
  assert.equal(res.status, 200);
});

test("success maps fields and reports what the voice was inferred from", async () => {
  let seen;
  generateImpl = async (brief) => {
    seen = brief;
    return goodContent();
  };
  const res = await post({ ...validBrief, socialPosts: "One\nTwo\n\nThree" });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, "success");
  assert.equal(json.tweets.length, 10);
  assert.deepEqual(json.inferredFrom, { briefOnly: false, examplePosts: 3 });
  assert.equal(seen.products, validBrief.products);

  generateImpl = async () => goodContent();
  const none = await (await post(validBrief)).json();
  assert.deepEqual(none.inferredFrom, { briefOnly: true, examplePosts: 0 });
});

test("AI failure returns a generic 502 with no internals", async () => {
  generateImpl = async () => {
    throw new Error("secret internal detail key=abc123");
  };
  const res = await post(validBrief);
  assert.equal(res.status, 502);
  const text = await res.text();
  assert.equal(text.includes("abc123"), false);
  assert.equal(text.includes("secret"), false);
});

test("missing API key returns 503", async () => {
  generateImpl = async () => {
    throw Object.assign(new Error("x"), { code: "MISSING_API_KEY" });
  };
  assert.equal((await post(validBrief)).status, 503);
});

test("upstream rate limit returns 429", async () => {
  generateImpl = async () => {
    throw Object.assign(new Error("x"), { status: 429 });
  };
  assert.equal((await post(validBrief)).status, 429);
});

test("unknown API route returns JSON 404", async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).status, "error");
});

test("rate limiter blocks excess requests", async () => {
  const app = createApp({
    generate: async () => goodContent(),
    env: { NODE_ENV: "test", RATE_LIMIT_MAX: "2" },
  });
  const s = await new Promise((r) => {
    const x = app.listen(0, () => r(x));
  });
  const url = `http://127.0.0.1:${s.address().port}/api/generate`;
  const send = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBrief),
    });
  assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 200);
  const blocked = await send();
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get("retry-after"));
  s.close();
});

test("CORS: allows the dev origin, not unknown origins", async () => {
  const ok = await fetch(`${base}/api/health`, {
    headers: { Origin: "http://localhost:5173" },
  });
  assert.equal(ok.headers.get("access-control-allow-origin"), "http://localhost:5173");
  const bad = await fetch(`${base}/api/health`, {
    headers: { Origin: "https://evil.example" },
  });
  assert.equal(bad.headers.get("access-control-allow-origin"), null);
});

test("CORS_ORIGIN env controls allowed origins in production", async () => {
  const app = createApp({
    generate: async () => goodContent(),
    env: { NODE_ENV: "production", CORS_ORIGIN: "https://app.example.com/" },
  });
  const s = await new Promise((r) => {
    const x = app.listen(0, () => r(x));
  });
  const u = `http://127.0.0.1:${s.address().port}/api/health`;
  const ok = await fetch(u, { headers: { Origin: "https://app.example.com" } });
  assert.equal(ok.headers.get("access-control-allow-origin"), "https://app.example.com");
  const dev = await fetch(u, { headers: { Origin: "http://localhost:5173" } });
  assert.equal(dev.headers.get("access-control-allow-origin"), null);
  s.close();
});
