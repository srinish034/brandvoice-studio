import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import createGenerateRouter from "./routes/generate.js";
import { rateLimit } from "./middleware/rateLimit.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, "..", "dist");

/**
 * Builds the Express app. Kept separate from index.js so tests can start it
 * without opening a fixed port or calling Gemini.
 */
export function createApp({ generate, env = process.env } = {}) {
  const app = express();
  const isProduction = env.NODE_ENV === "production";

  app.disable("x-powered-by");
  // Behind Render/Railway/etc. the real client IP is in X-Forwarded-For.
  app.set("trust proxy", 1);

  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    });
    next();
  });

  // CORS: CORS_ORIGIN is a comma-separated list of allowed frontend origins.
  // Unset in production = same-origin only (Express serves the frontend itself).
  // Unset in development = the Vite dev server.
  const configured = (env.CORS_ORIGIN || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const allowedOrigins =
    configured.length > 0
      ? configured
      : isProduction
        ? []
        : ["http://localhost:5173", "http://127.0.0.1:5173"];

  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header = same-origin request or a tool like curl.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
    })
  );

  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      message: "BrandVoice Studio backend is running",
      aiConfigured: Boolean(env.GEMINI_API_KEY),
    });
  });

  const windowMs = Number(env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
  const max = Number(env.RATE_LIMIT_MAX) || 20;
  app.use("/api/generate", rateLimit({ windowMs, max }));
  app.use("/api", createGenerateRouter(generate));

  // Unknown API routes get JSON, not an HTML page.
  app.use("/api", (req, res) => {
    res.status(404).json({ status: "error", message: "Not found." });
  });

  // In production, serve the built frontend from the same server.
  if (fs.existsSync(path.join(distDir, "index.html"))) {
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.method !== "GET") return next();
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  // Error handler: malformed JSON, oversized bodies, anything unexpected.
  // Never returns stack traces or internal details.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
      return res
        .status(400)
        .json({ status: "error", message: "Request body must be valid JSON." });
    }
    if (err.type === "entity.too.large") {
      return res
        .status(413)
        .json({ status: "error", message: "Request body is too large." });
    }
    console.error("Unexpected server error:", err.name);
    res.status(500).json({ status: "error", message: "Something went wrong." });
  });

  return app;
}
