import "dotenv/config";
import { createApp } from "./app.js";

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("Warning: GEMINI_API_KEY is not set. /api/generate will return 503.");
  }
});
