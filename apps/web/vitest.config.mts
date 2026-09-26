import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@catalog": path.resolve(__dirname, "../../packages/catalog"),
    },
  },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
