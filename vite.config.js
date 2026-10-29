import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, forward /api calls to the Express server so the frontend can
// use relative URLs. In production the same server hosts both.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
