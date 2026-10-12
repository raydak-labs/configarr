# Sonarr v5 API support

Spec: [2026-10-12-sonarr-v5-api-support-design.md](../specs/2026-10-12-sonarr-v5-api-support-design.md)

Each slice is independently reviewable and lands in its own commit. Foundation first, then the
one consumer that makes it real, then the behavior slices.

## Slice 1: generated v5 contract

- `generate-api.ts`: add
  `sonarr-v5: "https://raw.githubusercontent.com/Sonarr/Sonarr/develop/src/Sonarr.Api.V5/openapi.json"`.
- Regenerate only `sonarr-v5`; leave `sonarr` untouched (it is still the v3 contract).
- Verify the generated `Api` class exposes `v5*` methods and that `data-contracts.ts` holds
  `QualityProfileQualityItemResource.minSize` and `ReleaseProfileResource.indexerIds`.
- No source imports yet.

Check: `pnpm generateApi sonarr-v5 && pnpm typecheck`.

## Slice 2: contract discriminator (foundation)

- `src/types/common.types.ts`: add `SonarrApiVersion = "v3" | "v5"`, with a doc comment stating
  that it selects the API contract, not the arr, and that `ArrType` stays `"SONARR"`.
- `src/clients/sonarr-client.ts`: construct both generated clients. Implement the contract probe
  (`GET /api/v5/system/status`, 404 or connection error means v3). Add the resolution order:
  explicit per-instance override, then probe result. Every existing method keeps its signature and
  routes to the delegate matching the resolved contract.
- Calls the v5 contract cannot serve must throw rather than silently succeed:
  quality definition size limits (`minSize`/`maxSize`/`preferredSize`) and root folder updates.
  Root folder update already throws for Sonarr; extend that error to name the v5 contract.
- `src/clients/client.ts`: unchanged, still one `case "SONARR"`.

Behavioral test first, against the real client class with both generated `Api` delegates stubbed
by method name:

- probe hits `/api/v5/system/status` first and resolves v5 on success.
- probe falls back to v3 when v5 returns 404.
- an explicit override wins over the probe.
- `updateQualityDefinitions` with size limits set throws on a v5 contract and succeeds on v3.
- a settings-group call (`updateMediamanagement`) issues one request to the settings path
  matching the resolved contract.

## Slice 3: consumer, release profiles

First behavioral consumer, chosen because it is the only feature whose request shape changes
(`indexerId` to `indexerIds`).

- `src/releaseProfiles/releaseProfileBase.ts`: `mapToServer` and `updateReleaseProfile` branch on
  the client's contract. The v3 branch is byte-for-byte today's code. The v5 branch writes
  `indexerIds`, may set `excludedTags`, and must not read `airDateRestriction` or
  `allowSeasonPackWithoutAllEpisodesAired` as inputs until a design decision covers them.
- `contentKey`/`profileKey` keep working because `indexerIds: []` reduces to the same identity as
  `indexerId: 0`; assert that in a test.

Test: config with `indexer: "MyIndexer"` produces `indexerIds: [id]` on a v5 contract and
`indexerId: id` on v3; a nameless profile still matches by content on both.

## Slice 4: config plumbing

- `src/types/config.types.ts`: optional `api_version: z.enum(["v3", "v5"]).optional()` on the
  media instance schema. Default is v3.
- `src/config.ts`: carry it through `transformConfig`; keep the Recyclarr/TRaSH gate keyed on arr
  type, not contract. `mapConfigMediaNamingToApi` needs no contract parameter; the v5 naming
  settings field set is identical to v3 and only the path moved.

Test: a Sonarr block with `api_version: v5` resolves through `transformConfig` and is passed to
the client; omitting it resolves to v3.

## Slice 5: e2e

- `tests/arr-e2e/docker-compose.yml`: add `sonarr-v5` on `linuxserver/sonarr:5.0.0-develop`, port
  `18990`, plus a named volume.
- `tests/arr-e2e/config.ts`: `DEFAULT_BASE_URL` gains the contract axis so both Sonarr services
  resolve. `STATUS_PATHS` gains `/api/v5/system/status`.
- `tests/arr-e2e/sonarrV5.e2e.test.ts`: mirror `sonarr.e2e.test.ts`. Exclude the quality
  definition size-limit assertions, which the v5 contract does not serve.
- `tests/arr-e2e/README.md`: add the row and the port, and note the size-limit exclusion.
- `.github/workflows/arr-e2e.yml`: add the `wait_one` line.

## Slice 6: docs

- `docs/docs/intro.mdx`, `README.md`, `AGENTS.md`: state Sonarr v4 and v5 beta support, and that
  v5 uses the v5 API while v4 keeps the v3 API.
- `docs/docs/configuration/config-file.md`: document `api_version` under the Sonarr block.
- `.ai/docs/specs/...`: add `Status: implemented (YYYY-MM-DD)` when this lands.

## Not in scope

- Radarr v6, Lidarr v4 and the other arrs. Same technique applies later; nothing here is built
  for it beyond the discriminator being contract-shaped rather than Sonarr-shaped.
- Recyclarr v5 templates and TRaSH v5 guides. They key on arr, and the shared pipeline serves
  them.
- Release profile `airDateRestriction`, `airDateGracePeriod`,
  `allowSeasonPackWithoutAllEpisodesAired`: they land in the v5 resource but configarr has no
  config input for them yet. Writing them would invent config surface that was not asked for.
- Quality size limits under the v5 contract: v5 moves them to profile items, so they need their
  own design, not a port.

## Verification

Per slice: targeted tests, then `pnpm build && pnpm test && pnpm lint && pnpm typecheck` at the
end. Slice 5 additionally needs `pnpm test:e2e:arr` with the compose stack up, and the new
sonarr-v5 service must reach `api_version: v5` with the features under test.
