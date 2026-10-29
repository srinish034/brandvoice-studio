import {
  TWEET_COUNT,
  TWEET_MAX_LENGTH,
  TWEET_STYLES,
} from "./outputSchema.js";

const SUMMARY_RULE = [3, 4];
const SUMMARY_BULLET_MAX = 200;
const MAX_TWEETS_PER_STYLE = 5;
const MIN_DISTINCT_STYLES = 3;

const emojiPattern = /\p{Extended_Pictographic}/u;
const hashtagPattern = /(^|\s)#\w/;

const words = (text) =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

function similarity(a, b) {
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / Math.min(wa.size, wb.size);
}

function cleanList(value, name, [min, max], maxLength, problems) {
  if (!Array.isArray(value)) {
    problems.push(`${name} must be an array of strings.`);
    return [];
  }
  const items = value.map((v) => (typeof v === "string" ? v.trim() : ""));
  if (items.some((v) => !v)) {
    problems.push(`${name} contains an empty or non-string item.`);
  }
  if (items.length < min || items.length > max) {
    problems.push(`${name} must have ${min}-${max} items (got ${items.length}).`);
  }
  if (maxLength && items.some((v) => v.length > maxLength)) {
    problems.push(`${name} has an item longer than ${maxLength} characters.`);
  }
  return items;
}

/**
 * Checks Gemini's parsed JSON against the contract.
 * Returns { ok: true, value } with a cleaned copy (only the expected fields),
 * or { ok: false, problems: [...] } listing everything that was wrong.
 */
export function validateGeneratedContent(result, { forcedStyle = null } = {}) {
  const problems = [];

  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return { ok: false, problems: ["Output is not a JSON object."] };
  }

  const profile = result.voiceProfile;
  const cleanProfile = {};

  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    problems.push("voiceProfile is missing or not an object.");
  } else {
    cleanProfile.summary = cleanList(
      profile.summary,
      "voiceProfile.summary",
      SUMMARY_RULE,
      SUMMARY_BULLET_MAX,
      problems
    );
  }

  const cleanTweets = [];

  if (!Array.isArray(result.tweets)) {
    problems.push("tweets must be an array.");
  } else {
    if (result.tweets.length !== TWEET_COUNT) {
      problems.push(
        `Expected exactly ${TWEET_COUNT} tweets but got ${result.tweets.length}.`
      );
    }

    result.tweets.forEach((tweet, i) => {
      const label = `tweets[${i}]`;
      if (!tweet || typeof tweet !== "object" || Array.isArray(tweet)) {
        problems.push(`${label} must be an object with text and style.`);
        return;
      }
      const text = typeof tweet.text === "string" ? tweet.text.trim() : "";
      if (!text) problems.push(`${label}.text is empty.`);
      if (text.length > TWEET_MAX_LENGTH) {
        problems.push(
          `${label}.text is ${text.length} characters; the limit is ${TWEET_MAX_LENGTH}.`
        );
      }
      if (forcedStyle) {
        if (tweet.style !== forcedStyle) {
          problems.push(`${label}.style must be "${forcedStyle}" (got "${tweet.style}").`);
        }
      } else if (!TWEET_STYLES.includes(tweet.style)) {
        problems.push(`${label}.style must be one of ${TWEET_STYLES.join(", ")}.`);
      }
      cleanTweets.push({ text, style: tweet.style });
    });

    // Distinctness
    for (let i = 0; i < cleanTweets.length; i += 1) {
      for (let j = i + 1; j < cleanTweets.length; j += 1) {
        if (
          cleanTweets[i].text &&
          cleanTweets[j].text &&
          similarity(cleanTweets[i].text, cleanTweets[j].text) > 0.9
        ) {
          problems.push(`tweets[${i}] and tweets[${j}] are near-duplicates.`);
        }
      }
    }

    // Style mix
    const counts = {};
    for (const t of cleanTweets) counts[t.style] = (counts[t.style] || 0) + 1;
    const distinct = Object.keys(counts).filter((s) => TWEET_STYLES.includes(s));
    if (!forcedStyle && cleanTweets.length === TWEET_COUNT) {
      if (distinct.length < MIN_DISTINCT_STYLES) {
        problems.push(
          `Use at least ${MIN_DISTINCT_STYLES} different tweet styles (got ${distinct.length}).`
        );
      }
      for (const [style, n] of Object.entries(counts)) {
        if (n > MAX_TWEETS_PER_STYLE) {
          problems.push(`Too many "${style}" tweets (${n}); the maximum is ${MAX_TWEETS_PER_STYLE}.`);
        }
      }
    }

    // Do not decorate every tweet automatically.
    if (cleanTweets.length === TWEET_COUNT) {
      if (cleanTweets.every((t) => hashtagPattern.test(t.text))) {
        problems.push("Every tweet has a hashtag; use them sparingly.");
      }
      if (cleanTweets.every((t) => emojiPattern.test(t.text))) {
        problems.push("Every tweet has an emoji; use them sparingly.");
      }
    }
  }

  if (problems.length > 0) return { ok: false, problems };

  return {
    ok: true,
    value: { voiceProfile: cleanProfile, tweets: cleanTweets },
  };
}
