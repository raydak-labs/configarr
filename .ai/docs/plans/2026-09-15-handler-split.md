# Handler split (no mixed *arr bags)

Status: implemented (2026-09-15). Spec: [2026-09-15-specific-clients-design.md](../specs/2026-09-15-specific-clients-design.md).

Goal: factory + specialized handlers where **fields** differ (rootFolder shape). One shared module only when **method set and field set** are identical. Kill 5-way `asGenerated` write switches, `arr/cast.ts`, `arr/features.ts`, mixed `*Payload` supersets, and `'x' in` on generated unions.

Pipeline keeps `MediaArrType` **variables**. The **one** allowed switch is a factory that returns a typed handler. After that, `getClient("LIDARR")` is a literal.

Do not rebuild UnifiedClient. Do not thread `update<T extends MediaArrType>` through `index.ts`.

## Split table

| Feature                   | Pattern              | Handlers                                                                                                                                                                                                                |
| ------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Custom formats, tags      | B — identical fields | One module. Capability param is the feature mapping type. Client casts to generated **once** internally. `getClient(arrType).createCustomFormat(request)` type-checks.                                                  |
| Quality profiles          | A                    | Base (scores/qualities/cutoff). `QualityProfileSonarrSync` (minUpgrade). `QualityProfileRadarrWhisparrSync` (language + minUpgrade). `QualityProfileLidarrReadarrSync` (neither). Factory in `qualityProfileSyncer.ts`. |
| Quality definitions       | A                    | Generic (preferredSize) + `QualityDefinitionReadarrSync`.                                                                                                                                                               |
| Delay profiles            | A                    | Generic (usenet/torrent) + `DelayProfileLidarrSync` (`items[]`).                                                                                                                                                        |
| Naming / media management | A                    | One class per media arr — generated naming/MM fields differ. Factory.                                                                                                                                                   |
| Download clients          | A                    | `MediaDownloadClientSync` vs `ProwlarrDownloadClientSync`. No 6-way generated union in the generic.                                                                                                                     |
| Root folders, metadata    | keep                 | Already correct.                                                                                                                                                                                                        |

## Types

- Feature mapping types only in `src/<feature>/<name>.types.ts`. No types in logic files. No 2-letter type params (`QualityProfile` not `QP`).
- Shared only: `ArrType`, `MediaArrType`, `Tag`.
- Move `Tag` to `src/tags/tag.types.ts`. Capabilities import it.
- Move CF aliases out of `common.types.ts` into `customFormat.types.ts`.
- Move `types/download-client.types.ts` → `downloadClients/downloadClient.types.ts`. Split media vs Prowlarr resource types (no 6-way mixin).
- Kill e2e `ArrKind`; use `MediaArrType` + `Lowercase<MediaArrType>` for env keys.
- Delete empty `types/arr.types.ts`.
- Delete `arr/cast.ts` and `arr/features.ts` after handlers own fields.

## QP handler contract

Base owns `calculateQualityProfilesDiff` / mapQualities / CF scoring. Subclasses **override** language and minUpgrade attach/diff (no-op vs real). No boolean feature flags. Create/update call the subclass’s literal client with that arr’s generated `QualityProfileResource` (no `asGenerated` at the feature layer; client method already typed).

Lidarr/Readarr: warn+ignore config `language`; never write `minUpgradeFormatScore` or `language`.

## Validation per phase

`pnpm typecheck && pnpm test && pnpm lint` after each phase. No leftover 5-way write switches when the matching feature is done.
