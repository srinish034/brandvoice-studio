# BrandVoice Studio: Approach

## Problem and solution

Marketers need social copy that sounds like their brand, but writing a voice guide and a batch of posts from scratch is slow. BrandVoice Studio takes a short brand brief (plus optional example posts), asks Gemini to infer the brand's voice, and returns a concise voice summary and exactly 10 tweets that follow it.

## Input and validation

The form collects: brand name (optional), industry, campaign objective, product/campaign details, target audience, preferred tone, and optional previous posts.

- **Browser:** the form requires either a brand name or product details (min. 20 characters), and enforces character limits (`src/formConfig.js`).
- **Server:** `POST /api/generate` checks that the body is a JSON object, rejects unknown fields, requires every field to be a string within its limit (brand name 120, products 3000, posts 12,000, etc.), and requires a brand name or product details. Malformed JSON and oversized bodies return clean JSON errors. A per-IP rate limit protects the Gemini quota.

## How brand voice is inferred

The app uses **prompt-based inference**. It does not scrape or query any social platform. The only evidence the model gets is the brief and the pasted example posts. The prompt asks it to read the stated tone, audience and objective, and, when posts are given, their sentence length, punctuation, humour, vocabulary and emoji/hashtag habits. The interface states what the voice was inferred from ("brief only" or "brief and N example posts") and that no social media accounts were checked. That label is set by the server from the request, not by the model.

## Prompt design (`server/services/ai.js`)

1. **Role and task:** brand strategist and copywriter; infer a voice, then write exactly 10 tweets.
2. **Inference rules:** use only the supplied evidence; make modest inferences for blank fields; for a well-known brand use general familiarity only for overall energy, never for facts.
3. **Delimited data:** the brief and example posts sit inside `<brief>` and `<example_posts>` tags and are declared to be data, not instructions, which limits prompt injection through pasted text.
4. **Summary requirement:** 3-4 short bullets describing the voice (tone, personality, audience, themes). The model reasons about these internally, but only the summary is returned.
5. **Tweet requirements:** 10 distinct tweets, at most 280 characters, each labelled `conversational`, `promotional`, `witty` or `informative`. Target mix 3 / 2 / 2 / 3, with at least 3 styles and no more than 5 of one. "Witty" adapts to the brand (dry wordplay for a premium brand; memes only where suitable) and may drop to one tweet if humour would damage the brand.
6. **Tone selection:** if the user picks a Preferred tone (Professional, Witty, Friendly, Bold, Educational, Informative or Inspirational), the prompt requires all 10 tweets in that one style, the response schema only allows that label, and the validator rejects any tweet that differs. With no tone selected, the 3 / 2 / 2 / 3 mix above is used.
7. **Truthfulness:** no invented features, offers, prices, statistics, awards, testimonials or dates; generic calls to action only. Hashtags and emojis only where they fit the voice.

## Structured output and validation

Gemini is called with `responseMimeType: application/json` and a response schema (`server/outputSchema.js`). The server then **re-validates** the parsed result (`server/validateOutput.js`) because a schema cannot express every rule:

- the voice summary is present and has 3-4 non-empty bullets
- exactly 10 tweets, each an object with non-empty `text` and a valid `style`
- every tweet at most 280 characters; no near-duplicate tweets
- with a chosen tone: every tweet carries exactly that style; otherwise at least 3 styles and no style above 5 tweets; not every tweet carrying a hashtag or an emoji
- unexpected extra fields are dropped

If parsing or validation fails, the model is called again with the list of problems appended (**at most 3 attempts in total**). Authentication and bad-request errors are not retried. After the last attempt the API returns a generic error; internal details and the API key never reach the client.

## Generation and display

The React app posts the brief, shows a loading state, and renders just two things: the 3-4 bullet brand voice summary and the 10 tweets, each with its style label, character count and a **Copy tweet** button. Copy feedback is announced to screen readers and shows "Could not copy" if copying actually fails. Errors (network, timeout, server) appear with a way back to the form, which keeps what the user typed.

## Architecture and technology

```
Browser (React + Vite)  --POST /api/generate-->  Express (Node.js)
                                                   |- request validation, rate limit
                                                   |- prompt + Gemini call (@google/genai)
                                                   |- output validation + bounded retry
                                                   '- serves the built frontend in production
```

The Gemini key lives only in server environment variables. In production a single service hosts the frontend and API on one origin. Locally, Vite proxies `/api` to the Express server.

## Example input and output structure

The values below only illustrate the **shape**; they are not real generated output. Real runs are saved in `evidence/`.

Request:

```json
{
  "brandName": "Example Co",
  "industry": "Technology",
  "objective": "Engagement",
  "products": "A habit tracking app with a daily streak counter.",
  "audience": "Busy professionals",
  "tone": "Friendly",
  "socialPosts": "Start small.\nOne step at a time."
}
```

Response:

```json
{
  "status": "success",
  "aiGenerated": true,
  "inferredFrom": { "briefOnly": false, "examplePosts": 2 },
  "voiceProfile": {
    "summary": ["bullet 1", "bullet 2", "bullet 3"]
  },
  "tweets": [
    { "text": "...", "style": "conversational" },
    { "text": "...", "style": "promotional" }
  ]
}
```

## Limitations

- Posts are **not fetched automatically**; voice quality improves when the user pastes real examples.
- The voice is a model's inference from a short brief, not a verified brand guideline.
- Output is non-deterministic: the same brief can produce different tweets each time.
- Tweets are drafts for human review; they are not published anywhere.
- The rate limiter is in memory and per server instance.
- 280 characters is the standard X post limit; longer-post accounts are not covered.

## Setup

See the [README](README.md) for local setup, environment variables and deployment.
