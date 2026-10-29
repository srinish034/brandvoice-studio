import { Router } from "express";
import { generateBrandContent as defaultGenerate } from "../services/ai.js";

const allowedFields = [
  "brandName",
  "industry",
  "objective",
  "products",
  "audience",
  "tone",
  "socialPosts",
];

const fieldLimits = {
  brandName: 120,
  industry: 100,
  objective: 100,
  products: 3000,
  audience: 500,
  tone: 100,
  socialPosts: 12000,
};

const fail = (res, status, message, extra = {}) =>
  res.status(status).json({ status: "error", message, ...extra });

/** Builds the /generate router. `generate` can be swapped out in tests. */
export default function createGenerateRouter(generate = defaultGenerate) {
  const router = Router();

  router.post("/generate", async (req, res) => {
    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return fail(res, 400, "Request body must be a JSON object.");
    }

    const unexpectedFields = Object.keys(body).filter(
      (key) => !allowedFields.includes(key)
    );
    if (unexpectedFields.length > 0) {
      return fail(res, 400, "Unexpected fields in request.", {
        fields: unexpectedFields,
      });
    }

    for (const [field, value] of Object.entries(body)) {
      if (typeof value !== "string") {
        return fail(res, 400, `${field} must be a string.`);
      }
      if (value.length > fieldLimits[field]) {
        return fail(
          res,
          400,
          `${field} exceeds the ${fieldLimits[field]} character limit.`
        );
      }
    }

    const brief = Object.fromEntries(
      allowedFields.map((field) => [
        field,
        typeof body[field] === "string" ? body[field].trim() : "",
      ])
    );

    if (!brief.brandName && !brief.products) {
      return fail(res, 400, "Provide a brand name or product/campaign details.");
    }

    try {
      const result = await generate(brief);

      // Tell the client honestly what the voice was inferred from.
      const postCount = brief.socialPosts
        .split(/\n\s*\n|\n/)
        .filter((p) => p.trim()).length;

      return res.status(200).json({
        status: "success",
        aiGenerated: true,
        inferredFrom: { briefOnly: postCount === 0, examplePosts: postCount },
        voiceProfile: result.voiceProfile,
        tweets: result.tweets,
      });
    } catch (error) {
      if (error.code === "MISSING_API_KEY") {
        return fail(res, 503, "AI service is not configured.");
      }

      // Log a short, safe line for debugging. Never send details to the client.
      console.error(
        "Brand content generation failed:",
        error.name,
        error.status || "",
        error.code === "BAD_AI_OUTPUT" ? error.details?.join(" | ") : ""
      );

      if (error.status === 429) {
        return fail(res, 429, "The AI service is busy. Please try again shortly.");
      }

      return fail(res, 502, "Unable to generate brand content. Please try again.");
    }
  });

  return router;
}
