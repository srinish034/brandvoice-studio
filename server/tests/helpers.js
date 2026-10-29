// Shared test data. These are hand-written fixtures, NOT real Gemini output.
export function goodContent() {
  const styles = [
    "conversational", "conversational", "conversational",
    "promotional", "promotional",
    "witty", "witty",
    "informative", "informative", "informative",
  ];
  const texts = [
    "What does your morning routine look like?",
    "Tell us the one habit you could not give up.",
    "Which part of your day deserves a reset?",
    "Meet the new range, available now on our site.",
    "Ready to try something different? Take a look.",
    "We put the 'pro' in procrastination-proof planning.",
    "Our to-do list has a to-do list. Relatable.",
    "Tip: small, steady steps beat rare giant leaps.",
    "Consistency is quieter than motivation, and lasts longer.",
    "Start with the task you are avoiding, then build momentum.",
  ];
  return {
    voiceProfile: {
      summary: ["Warm and direct", "Encouraging, never preachy", "Plain language"],
    },
    tweets: texts.map((text, i) => ({ text, style: styles[i] })),
  };
}

export const validBrief = {
  brandName: "Test Brand",
  industry: "Technology",
  objective: "Engagement",
  products: "A habit tracking app with a daily streak counter.",
  audience: "Busy professionals",
  tone: "",
  socialPosts: "",
};
