import test from "node:test";
import assert from "node:assert/strict";
import { validateGeneratedContent } from "../validateOutput.js";
import { goodContent } from "./helpers.js";

test("accepts a well-formed result", () => {
  const r = validateGeneratedContent(goodContent());
  assert.equal(r.ok, true);
  assert.equal(r.value.tweets.length, 10);
});

test("strips unexpected extra fields", () => {
  const c = goodContent();
  c.extra = "x";
  c.voiceProfile.secret = "y";
  const r = validateGeneratedContent(c);
  assert.equal(r.ok, true);
  assert.equal("extra" in r.value, false);
  assert.equal("secret" in r.value.voiceProfile, false);
});

test("rejects non-object output", () => {
  assert.equal(validateGeneratedContent(null).ok, false);
  assert.equal(validateGeneratedContent([]).ok, false);
  assert.equal(validateGeneratedContent("text").ok, false);
});

test("rejects 9 and 11 tweets", () => {
  const nine = goodContent();
  nine.tweets.pop();
  assert.equal(validateGeneratedContent(nine).ok, false);
  const eleven = goodContent();
  eleven.tweets.push({ text: "An extra, different tweet about nothing.", style: "witty" });
  assert.equal(validateGeneratedContent(eleven).ok, false);
});

test("rejects empty tweet text", () => {
  const c = goodContent();
  c.tweets[3].text = "   ";
  assert.equal(validateGeneratedContent(c).ok, false);
});

test("rejects over-long tweets", () => {
  const c = goodContent();
  c.tweets[0].text = "a ".repeat(200);
  const r = validateGeneratedContent(c);
  assert.equal(r.ok, false);
  assert.match(r.problems.join(" "), /limit is 280/);
});

test("rejects tweets given as plain strings (old format)", () => {
  const c = goodContent();
  c.tweets = c.tweets.map((t) => t.text);
  assert.equal(validateGeneratedContent(c).ok, false);
});

test("rejects unknown style label", () => {
  const c = goodContent();
  c.tweets[0].style = "angry";
  assert.equal(validateGeneratedContent(c).ok, false);
});

test("rejects near-duplicate tweets", () => {
  const c = goodContent();
  c.tweets[1].text = c.tweets[0].text + "!";
  const r = validateGeneratedContent(c);
  assert.equal(r.ok, false);
  assert.match(r.problems.join(" "), /near-duplicates/);
});

test("rejects a single-style set", () => {
  const c = goodContent();
  c.tweets.forEach((t) => (t.style = "informative"));
  assert.equal(validateGeneratedContent(c).ok, false);
});

test("rejects hashtags or emojis on every tweet", () => {
  const h = goodContent();
  h.tweets.forEach((t) => (t.text += " #brand"));
  assert.equal(validateGeneratedContent(h).ok, false);
  const e = goodContent();
  e.tweets.forEach((t) => (t.text += " 🚀"));
  assert.equal(validateGeneratedContent(e).ok, false);
});

test("allows hashtags and emojis on some tweets", () => {
  const c = goodContent();
  c.tweets[0].text += " #habits";
  c.tweets[1].text += " 🙂";
  assert.equal(validateGeneratedContent(c).ok, true);
});

test("summary must have 3-4 bullets", () => {
  const two = goodContent();
  two.voiceProfile.summary = ["One", "Two"];
  assert.equal(validateGeneratedContent(two).ok, false);
  const five = goodContent();
  five.voiceProfile.summary = ["1", "2", "3", "4", "5"];
  assert.equal(validateGeneratedContent(five).ok, false);
  const str = goodContent();
  str.voiceProfile.summary = "A single paragraph string.";
  assert.equal(validateGeneratedContent(str).ok, false);
});

test("rejects a missing or mistyped voiceProfile", () => {
  const a = goodContent();
  delete a.voiceProfile.summary;
  assert.equal(validateGeneratedContent(a).ok, false);
  const b = goodContent();
  b.voiceProfile = null;
  assert.equal(validateGeneratedContent(b).ok, false);
  const c = goodContent();
  c.voiceProfile.summary = [" ", "x", "y"];
  assert.equal(validateGeneratedContent(c).ok, false);
});

test("forced style: accepts only tweets in that style", () => {
  const c = goodContent();
  c.tweets.forEach((t) => (t.style = "witty"));
  assert.equal(validateGeneratedContent(c, { forcedStyle: "witty" }).ok, true);
  // same set is rejected when another style was requested
  assert.equal(validateGeneratedContent(c, { forcedStyle: "educational" }).ok, false);
  // a mixed set is rejected when a single style was requested
  assert.equal(validateGeneratedContent(goodContent(), { forcedStyle: "witty" }).ok, false);
});

test("forced style: still enforces 10 distinct tweets", () => {
  const c = goodContent();
  c.tweets.forEach((t) => (t.style = "informative"));
  c.tweets.pop();
  assert.equal(validateGeneratedContent(c, { forcedStyle: "informative" }).ok, false);
});
