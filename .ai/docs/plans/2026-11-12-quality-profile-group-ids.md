# Quality profile group ids implementation plan

[Design](../specs/2026-11-12-quality-profile-group-ids-design.md)

1. Add the optional `id` field to `InputConfigQualityProfileItemSchema` with the `>= 1000` bound.
2. Thread the existing server items into `mapQualities()` and resolve group ids by explicit config
   id, then server id by name, then a fresh `1000 + index`, skipping claimed ids.
3. Compare `id` in `isOrderOfQualitiesEqual()` and fix the duplicated `items1.length` guard.
4. Add unit tests for reuse, allocation, explicit ids, validation errors and the diff contract; add
   an idempotency test that runs the diff twice after a group reorder.
5. Add the same reorder scenario to the live Lidarr, Sonarr and Radarr e2e files.
6. Document the behaviour and the optional `id` in `docs/docs/configuration/config-file.md`.
7. Run build, unit tests, formatting and typecheck; leave the pre-existing `cloneGitRepo` timeout
   failure in `src/util.test.ts` as-is unless it reproduces in isolation.
