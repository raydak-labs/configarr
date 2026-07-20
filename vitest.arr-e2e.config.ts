import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/arr-e2e/**/*.e2e.test.ts"],
    testTimeout: 600_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
