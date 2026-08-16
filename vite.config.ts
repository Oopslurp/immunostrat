import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative URLs keep the production build compatible with GitHub Pages,
  // including project sites served from /<repository>/.
  base: "./",
  plugins: [react()],
  build: {
    // Phaser is a deliberate single runtime dependency; keep production output
    // warning-free while retaining deterministic scene initialization.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: "node",
    globals: true,
  },
});
