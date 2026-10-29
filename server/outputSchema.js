// The shape we ask Gemini to return, plus the limits the server enforces.
// Keeping the schema and the validator in one place means they cannot drift apart.

export const TWEET_MAX_LENGTH = 280; // X/Twitter's standard post limit
export const TWEET_COUNT = 10;

// The four content styles required by the project brief.
export const TWEET_STYLES = [
  "conversational",
  "promotional",
  "witty",
  "informative",
];

// Target mix for 10 tweets. "Witty" is deliberately flexible: for a serious or
// premium brand it means dry, subtle wordplay rather than memes, and the model
// may shift one of those slots to another style if humour would feel wrong.
export const TARGET_MIX = {
  conversational: 3,
  promotional: 2,
  witty: 2,
  informative: 3,
};

// Styles a user can force by choosing a "Preferred tone". When one is chosen,
// ALL 10 tweets must use that style. Keys are the lowercase tone names.
export const TONE_STYLES = {
  professional: "polished, credible and clear; no slang or jokes",
  witty: "clever, playful humour, wordplay or meme-style jokes that still fit the brand",
  friendly: "warm, welcoming and conversational, like talking to a friend",
  bold: "confident, punchy, high-energy statements",
  educational: "teaches the reader something useful: tips, how-tos, explainers",
  inspirational: "uplifting and motivating, encouraging the reader to act or believe",
  informative: "clear, value-driven information or insight that helps the reader",
};

/** Returns the forced style for a tone string, or null if none/unknown. */
export function forcedStyleFor(tone) {
  const key = typeof tone === "string" ? tone.trim().toLowerCase() : "";
  return Object.hasOwn(TONE_STYLES, key) ? key : null;
}

const stringArray = { type: "ARRAY", items: { type: "STRING" } };

// Builds the schema passed to Gemini (responseSchema). `styles` limits the allowed labels. Counts and lengths are enforced by
// validateGeneratedContent() because the API schema cannot express all of them.
export const buildResponseSchema = (styles = TWEET_STYLES) => ({
  type: "OBJECT",
  properties: {
    voiceProfile: {
      type: "OBJECT",
      properties: {
        summary: stringArray, // 3-4 short bullet points
      },
      required: ["summary"],
      propertyOrdering: ["summary"],
    },
    tweets: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          style: { type: "STRING", enum: styles },
        },
        required: ["text", "style"],
        propertyOrdering: ["text", "style"],
      },
    },
  },
  required: ["voiceProfile", "tweets"],
  propertyOrdering: ["voiceProfile", "tweets"],
});
