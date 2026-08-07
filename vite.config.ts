import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative URLs keep the production build compatible with GitHub Pages,
  // including project sites served from /<repository>/.
  base: "./",
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
  },
});
