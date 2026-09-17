/** Settings shared by both live *arr passes (the per-*arr files, then the pipeline file). */
export const arrE2eTestOptions = {
  testTimeout: 600_000,
  hookTimeout: 180_000,
  globalSetup: ["tests/arr-e2e/globalSetup.ts"],
  maxWorkers: 6,
};
