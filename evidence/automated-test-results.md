# Automated test results

Run on 2026-10-29 in a sandbox that **cannot reach the Gemini API**. Everything below used a stubbed Gemini client, so it verifies the app's logic, NOT the quality of real AI output.

## Backend: `npm test` (node:test) - 37 passed, 0 failed
Covers: output validator (10 tweets, empty text, 280 limit, duplicates, style mix, hashtag/emoji spam, 3-4 bullet summary, missing/mistyped profile fields), bounded retry (3 attempts, no retry on 401/403), fenced JSON, missing API key, request validation (types, limits, unknown fields, malformed JSON with no stack trace), generic 502/503/429 errors with no internals leaked, JSON 404, rate limiter, CORS (dev origin, CORS_ORIGIN, unknown origin blocked), health check.

## Browser: Playwright against the real Express app serving the built frontend, Gemini stubbed - 22 of 22 passed after the results screen was simplified to summary + tweets
Covers: validation error on empty submit, loading state, 10 tweet cards, 3-bullet summary, all profile sections, style labels, honest "inferred from" note, request field mapping (`details` -> `products`, `existingPosts` -> `socialPosts`), copy to clipboard (verified clipboard text), accessible "copied" announcement, honest "Could not copy" on failure, safe error state, form values kept after a failure, retry after failure, network failure message, HTML error page handling, no horizontal scroll at 375 px, SPA fallback, JSON 404.

## Production smoke test (`NODE_ENV=production npm start`)
Health check OK; built frontend served; generate without a key returns 503 `AI service is not configured.`; malformed JSON returns 400; no `Access-Control-Allow-Origin` for an unknown origin.

## NOT run (needs a Gemini key and network access)
- Live generation with the real Gemini API
- The two-brand comparison: run `npm run test:brands` locally to create real evidence files here
- Public deployment and live-URL test
