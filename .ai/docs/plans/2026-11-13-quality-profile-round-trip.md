# Quality profile round-trip implementation plan

[Design](../specs/2026-11-13-quality-profile-round-trip-design.md)

1. Add `mergeUndeclaredQualities()` and use it when mapping an existing profile, leaving create
   behaviour untouched.
2. Use `upgrade.until_score ?? 1` for `cutoffFormatScore` on create and update when upgrades are
   disabled.
3. Add unit tests for position preservation and `cutoffFormatScore`, plus an idempotent diff test
   with undeclared qualities on the server.
4. Document the ordering contract and the position guarantee in
   `docs/docs/configuration/config-file.md`.
5. Re-validate against a live Lidarr profile that mixes groups with undeclared qualities; run build,
   tests, lint and typecheck.
