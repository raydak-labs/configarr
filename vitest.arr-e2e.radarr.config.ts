import { defineConfig } from "vitest/config";
import { arrE2eTestOptions } from "./vitest.arr-e2e.base";

// Reuse the complete feature suite against one isolated Radarr version at a time.
export default defineConfig({
  test: {
    ...arrE2eTestOptions,
    globalSetup: ["tests/arr-e2e/radarrGlobalSetup.ts"],
    include: ["tests/arr-e2e/radarr.e2e.test.ts"],
    maxWorkers: 1,
  },
});
