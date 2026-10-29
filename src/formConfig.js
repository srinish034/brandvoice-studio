// Shared form configuration: options, defaults and validation.
// Keeping this in one place means the form and the preview never disagree.

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Fashion",
  "Finance",
  "Health",
  "Education",
  "Food & Beverage",
  "Other",
];

export const OBJECTIVE_OPTIONS = [
  "Brand awareness",
  "Product launch",
  "Engagement",
  "Website traffic",
  "Lead generation",
  "Product promotion",
];

export const TONE_OPTIONS = [
  "Professional",
  "Witty",
  "Friendly",
  "Bold",
  "Educational",
  "Informative",
  "Inspirational",
];

export const INITIAL_VALUES = {
  brandName: "",
  industry: "",
  objective: "",
  details: "",
  audience: "",
  tone: "",
  existingPosts: "",
};

export const LIMITS = {
  brandName: 60,
  details: 1000,
  audience: 200,
  existingPosts: 3000,
};

// Returns an object of { fieldName: "message" }. Empty object means valid.
export function validateBrief(values) {
  const errors = {};
  const hasBrandName = values.brandName.trim().length > 0;
  const details = values.details.trim();

  if (!hasBrandName && !details) {
    errors.details =
      "Add a brand name above, or describe your product or campaign here.";
  } else if (details && details.length < 20) {
    errors.details =
      "Add a little more detail (at least 20 characters) so the brief is useful.";
  }

  Object.entries(LIMITS).forEach(([field, max]) => {
    if (values[field].length > max && !errors[field]) {
      errors[field] = `Please keep this under ${max} characters.`;
    }
  });

  return errors;
}

// Turn pasted posts into a clean list (one post per non-empty line block).
export function splitPosts(text) {
  return text
    .split(/\n\s*\n|\n/)
    .map((post) => post.trim())
    .filter(Boolean);
}
