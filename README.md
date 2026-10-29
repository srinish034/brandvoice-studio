# BrandVoice Studio

Turn a short brand brief into a **3-4 bullet brand voice summary** and **10 on-brand tweets**, powered by Google Gemini.

- **Frontend:** React + Vite (plain CSS)
- **Backend:** Node.js + Express
- **AI:** Gemini via `@google/genai` (default model `gemini-3.5-flash-lite`)

> The voice is **inferred from the brief and any example posts you paste**. The app does not fetch anything from social media and does not verify a brand's real-world voice.

See [APPROACH.md](APPROACH.md) for how the voice analysis, prompt and validation work.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
# open .env and set GEMINI_API_KEY to your own key
```

Start the backend and the frontend in two terminals:

```bash
npm run server:dev        # API on http://localhost:3000  (or: npm run server)
npm run dev               # App on http://localhost:5173
```

In development Vite forwards `/api/*` to port 3000, so no frontend configuration is needed. Open http://localhost:5173.

Check the backend is up: http://localhost:3000/api/health

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (frontend) |
| `npm run server:dev` | Express with auto-restart (backend) |
| `npm run build` | Production build of the frontend into `dist/` |
| `npm start` | Runs Express; serves `dist/` and the API together (production) |
| `npm test` | Backend tests (validation, retry, routes, CORS, rate limit). They do **not** call Gemini |
| `npm run test:brands` | Runs two contrasting brands through the real API and saves results to `evidence/` (needs your key) |

## Live demo

**Try it here: [ https://your-app.onrender.com**](https://brandvoice-studio.onrender.com)

The app is hosted on Render's free plan, so it sleeps when idle. If the page takes up to a minute to load the first time, please wait and it will start.

### How to test it

1. Open the live link above.
2. In **Brand name**, enter a brand you want to test (for example, *Nike* or *Apple*). Everything else is optional.
3. Optionally choose an **Industry**, a **Campaign objective** and a **Preferred tone**, and add **Product or campaign details**, **Target audience** or **Existing social media posts** for a more tailored result.
4. Click **Generate** and wait a few seconds.[5s-20s]
5. On the right, you will see:
   - a **Brand voice summary** that describes the brand's tone, personality, audience and content themes, and
   - **10 tweet drafts**, each with its style label, character count and a **Copy tweet** button.

### Notes

- If you leave **Preferred tone** blank, the 10 tweets use a mix of conversational, promotional, witty and informative styles. If you choose a tone, all 10 tweets are written in that tone. The brand voice summary is not affected by the tone you choose.
- The voice is inferred only from the information you enter. No social media accounts are checked.
- To keep the AI quota safe, each visitor can generate up to 20 times every 15 minutes.



## Environment variables

Copy `.env.example` to `.env` (it is in `.gitignore`).

| Variable | Where | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | server | Required. Your Gemini key. Never exposed to the browser |
| `GEMINI_MODEL` | server | Optional. Defaults to `gemini-3.5-flash-lite` |
| `PORT` | server | Optional. Defaults to 3000 |
| `CORS_ORIGIN` | server | Comma-separated frontend origins allowed to call the API. Needed only when the frontend is on a different domain |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` | server | Optional. Default 20 generate calls per IP per 15 minutes |
| `VITE_API_BASE_URL` | frontend build | Optional. Only if the API is on a different domain than the frontend |

## Deploy (one service on Render)

Express serves both the built frontend and the API from the same URL, so no CORS setup is needed.

1. Push this project to a **private or public GitHub repo**. Check first that `.env` is not included (`git status` should not list it).
2. In Render choose **New + > Blueprint** and select the repo (it reads `render.yaml`), or create a **Web Service** by hand with:
   - Build command: `npm install --include=dev && npm run build`
   - Start command: `npm start`
   - Health check path: `/api/health`
3. In the Render dashboard set the environment variable **`GEMINI_API_KEY`** to your key, plus `NODE_ENV=production`.
4. After the deploy finishes, open the Render URL and check:
   - `https://<your-app>/api/health` returns `{"status":"ok", "aiConfigured": true ...}`
   - The form shows a voice summary and 10 tweets.

Free Render services sleep when idle, so the first request after a pause can take about a minute. Open the URL once before a reviewer tests it.

**Split hosting** (frontend on Vercel/Netlify, backend elsewhere): set `VITE_API_BASE_URL=https://<backend>` when building the frontend and `CORS_ORIGIN=https://<frontend>` on the backend.

## Project layout

```
server/
  index.js              starts the server
  app.js                Express app: CORS, JSON errors, rate limit, static files
  routes/generate.js    POST /api/generate: validates the request
  services/ai.js        Gemini prompt, call, bounded retry
  outputSchema.js       JSON schema sent to Gemini + limits (10 tweets, 280 chars)
  validateOutput.js     checks Gemini's answer before it reaches the user
  middleware/rateLimit.js
  tests/                node:test suites
src/
  App.jsx               state, submit logic, API call
  formConfig.js         form options, limits, client-side validation
  components/           form, workspace, results
scripts/run-brand-tests.mjs   two-brand test run
evidence/               saved test outputs
render.yaml             Render deployment blueprint
```

## API

`POST /api/generate` with JSON (all strings; `brandName` or `products` required):

```json
{ "brandName": "", "industry": "", "objective": "", "products": "", "audience": "", "tone": "", "socialPosts": "" }
```

The form's "Product or campaign details" is sent as `products` and "Existing social media posts" as `socialPosts`. Unknown fields are rejected.

Success: `{ "status": "success", "inferredFrom": {...}, "voiceProfile": {...}, "tweets": [{ "text", "style" }] }`
Failure: `{ "status": "error", "message": "..." }` with HTTP 400, 413, 429, 502 or 503.

## If your API key was ever exposed

Revoke it in [Google AI Studio](https://aistudio.google.com/apikey) (delete the key), create a new one, and put the new one only in `.env` locally and in your host's environment settings. Deleting a file from a Git repo does not remove it from history, so a leaked key must always be revoked, not just removed.
