# Generated contracts as the write type (no `as`)

Status: plan (2026-09-15). Not implemented.

## Why `as Generated` exists

We keep a second JSON type (`MediaDownloadClientResource`, `QualityProfileRadarrResource`, …) that is _like_ OpenAPI but uses `string` where swagger emitted a **string enum** (`DownloadProtocol`, `QualitySource`, `PrivacyLevel`). `string` is not assignable to that enum, so the client does `profile as QualityProfileResource`.

A runtime `toContract` / enum-mapper layer is the same hole with more code. Do not do that.

`as` is also used when OpenAPI is missing a real field (Lidarr delay `items[]`) or when a Generic handler calls `getClient(arrType)` with a union — each arr’s `DownloadProtocol` is a **different type** even when values match.

## Rule

The object passed into swagger **is** that arr’s generated resource type. No assertion.

- Client method: `createQualityProfile(profile: QualityProfileResource)` from `__generated__/radarr`.
- Handler in `qualityProfileRadarr.ts` uses that same type.
- `this.api.v3QualityprofileCreate(profile)` typechecks because the parameter is already the contract.

YAML/TRaSH stays in `config.types.ts` / `trashguide.types.ts`. Conversion into the contract happens once in the **arr-specific mapper** (`mapToServer`, `resolveConfig`), not at the HTTP call.

## Enums (YAML `string` → contract)

In that arr’s mapper, a switch on the generated enum members — not `as DownloadProtocol`:

```ts
function toRadarrDownloadProtocol(value: string | undefined): DownloadProtocol | undefined {
  switch (value) {
    case DownloadProtocol.Usenet:
    case DownloadProtocol.Torrent:
    case DownloadProtocol.Unknown:
      return value;
    default:
      return undefined;
  }
}
```

If regen drops `Usenet`, the case fails typecheck. That is the desired break.

Optional generated fields we do not need (`Quality.source`) can be omitted on create. Do not invent a parallel `source?: string` on a shared `QualityItem` just to round-trip them.

## OpenAPI gaps

Only in that arr’s file, as an intersection of the contract:

```ts
// delayProfileLidarr.ts
type LidarrDelayProfile = DelayProfileResource & { items: DelayProfileProtocolItem[] };
```

GET: read extra JSON with a type guard (`"items" in profile && Array.isArray(...)`), build a `LidarrDelayProfile`. Do not `as { items?: ... }`.

When Lidarr OpenAPI grows `items`, delete the intersection.

## Where types live

| Kind                   | Where                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Generated resource     | `__generated__/<arr>/data-contracts` — import in that arr’s client + handler file                                            |
| OpenAPI extra          | intersection in that arr’s handler file                                                                                      |
| YAML / TRaSH / diff    | `src/<feature>/*.types.ts` or `src/types/config.types.ts`                                                                    |
| Structural base subset | unnamed fields on the base (`{ id?: number; name?: string \| null }`) that **generated types are assignable to** (read/diff) |

Do **not** add `ProwlarrDownloadClientResource`, `QualityProfileRadarrResource`, `DelayProfileLidarrResource` to a shared `*.types.ts`. Prowlarr uses `__generated__/prowlarr` `DownloadClientResource` in `downloadClientProwlarr.ts` and `prowlarr-client.ts`.

We invented those mapping types so one Generic/`getClient(arrType)` could ignore per-arr enums. That is obsolete: Pattern A is already one class + literal `getClient("RADARR")`.

## Generic handlers vs literals

`getClient(arrType)` returns a **union**. Parameter types become an intersection. Five `DownloadProtocol` enums do not unify → `as` comes back.

`*Generic.ts` + variable `arrType` is allowed only when the generated write types are mutually assignable (no enums, same fields). Enum-bearing writes: **one class per arr**, `getClient("SONARR")`.

Today that means splitting `MediaDownloadClientSync(arrType)` and `DelayProfileGenericSync(arrType)` the same way QP already is. `QualityDefinitionGenericSync` likewise if `Quality.source` is an enum (or omit `source` on write and keep Generic).

Pattern B (custom formats): one module is fine **if** `CustomFormatRequest` is a structural subtype of each arr’s `CustomFormatResource` (align `fields.value` etc.). Then each client accepts that subtype and passes it to swagger with no `as`. If it is not a subtype, fix the request type — do not cast.

## ServerCache

Pipeline is one arr instance. Cache the arrays returned by that instance’s client (`QualityProfileResource[]` for that arr). Do not store a named 5-way `QualityProfilePayload` union. A per-run generic (`ServerCache` constructed with those arrays) is enough.

## Phases (ack before code)

1. **Prowlarr DC** — delete `ProwlarrDownloadClientResource`; Prowlarr client + `downloadClientProwlarr.ts` import generated `DownloadClientResource`. Shared `downloadClient.types.ts` keeps diff/result only.
2. **Naming/MM, root, metadata, tags** — already generated on the client; delete leftover `as never` by persisting on the same handler instance (union correlation).
3. **QP / QD / delay / media DC** — client methods take generated (or Lidarr delay intersection). One class per arr where Generic+`arrType` forces `as`. Mapper switch for enums. `mapQualities` omits `source` if that unblocks assignability.
4. **CF** — make `CustomFormatRequest` assignable to each `CustomFormatResource`; drop `as CustomFormatResource`.
5. **Gate** — no `as QualityProfileResource` / `as DelayProfileResource` / `as CustomFormatResource` / `as GeneratedDownloadClientResource` / `as QualityDefinitionResource` / `as never` in `src/clients` or feature syncers. Type guards for OpenAPI extras only.

Do not: `toContract`, module-level handler cache, DI, `Merged*` types, product mash in shared `*.types.ts`.
