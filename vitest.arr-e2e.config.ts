import { defineConfig } from "vitest/config";
import { arrE2eTestOptions } from "./vitest.arr-e2e.base";

// One file per *arr, so files own separate containers and run at the same time.
// pipeline.e2e.test.ts drives all of them and has its own config, run afterwards.
export default defineConfig({
  test: {
    ...arrE2eTestOptions,
    include: ["tests/arr-e2e/**/*.e2e.test.ts"],
    exclude: ["tests/arr-e2e/pipeline.e2e.test.ts"],
  },
});
