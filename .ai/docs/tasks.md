# Active follow-ups

- [ ] **Sonarr v5 release references:** Verify the stable tag; update beta labels/pins in the README, `examples/full/`, `tests/arr-e2e/docker-compose.yml`, and `generate-api.ts`. Use the [official API reference](https://sonarr.tv/docs/api/) and [Sonarr releases](https://github.com/Sonarr/Sonarr/releases). Re-run v4/v5 e2e; keep dated beta research historical.

- [ ] **Radarr v7 stable release references:** Once v7 is stable, verify the [official release](https://github.com/Radarr/Radarr/releases), update prerelease labels in the README, configuration docs and `AGENTS.md`, and refresh the pinned contract/image in `generate-api.ts` and `tests/arr-e2e/docker-compose.yml`. Re-run `pnpm test:e2e:arr:radarr`; keep dated compatibility research historical.
