import { defineConfig } from "vitest/config";
import { arrE2eTestOptions } from "./vitest.arr-e2e.base";

// Runs alone: one config.yml drives every container, so nothing else may touch them.
export default defineConfig({
  test: {
    ...arrE2eTestOptions,
    include: ["tests/arr-e2e/pipeline.e2e.test.ts"],
  },
});
