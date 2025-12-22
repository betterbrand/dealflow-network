import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    // Increase timeouts for CI database operations
    testTimeout: 30000, // 30s per test
    hookTimeout: 30000, // 30s for beforeAll/afterAll
  },
});
