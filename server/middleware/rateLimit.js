// Tiny in-memory rate limiter (no extra dependency).
// Protects your Gemini quota once the app has a public URL.
// It resets when the server restarts, which is fine for a single instance.
export function rateLimit({ windowMs, max }) {
  const hits = new Map(); // ip -> { count, resetAt }

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) if (entry.resetAt <= now) hits.delete(ip);
  }, windowMs);
  timer.unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || "unknown";
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({
        status: "error",
        message: "Too many requests. Please wait a few minutes and try again.",
      });
    }

    next();
  };
}
