import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/arr-e2e/**/*.e2e.test.ts"],
    testTimeout: 600_000,
    hookTimeout: 180_000,
    globalSetup: ["tests/arr-e2e/globalSetup.ts"],
    // One file per *arr, so files own separate containers and can run at the same time.
    // pipeline.e2e.test.ts touches all of them and runs in its own pass (see test:e2e:arr).
    maxWorkers: 6,
  },
});
