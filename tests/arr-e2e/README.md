# *arr live e2e tests

Opt-in Vitest suite against real *arr containers. **Not** part of `pnpm test`. Stack lives in `tests/arr-e2e/` (not `examples/full`).

Covers: **Sonarr**, **Radarr**, **Whisparr**, **Readarr**, **Lidarr** (nightly), **Prowlarr**.

## Local

```bash
cd tests/arr-e2e
PUID=$(id -u) PGID=$(id -g) docker compose up -d
```

Wait until APIs respond (first boot ~30–90s), then from repo root:

```bash
pnpm test:e2e:arr
```

The suite only runs through its own config (`vitest.arr-e2e.config.ts`); `pnpm test` covers `src/**` and never picks it up, so there is no env flag to remember. If no container answers, the run fails immediately telling you to start the stack. Named volumes hold the DBs. Sonarr, Radarr, Readarr, Lidarr and Prowlarr get their API key from `<APP>__AUTH__APIKEY` env vars. Whisparr's eros base ignores those, so its container copies `fixtures/whisparr-config/config.xml` into the volume before starting. `/data/e2e` and `/data/e2e-b` are bind-mounted, so `PUID`/`PGID` must be your own user or *arr refuses the root folders.

## Layout and run order

One file per *arr, each owning its container end to end. The regular suite runs the six per-*arr files in parallel, then the cross-arr pipeline and version matrix runs:

- `pnpm test:e2e:arr:parallel` — the six per-*arr files, in parallel (~40s). Its config excludes the pipeline file, so a direct `vitest run --config vitest.arr-e2e.config.ts` cannot mix the two.
- `pnpm test:e2e:arr:pipeline` — `pipeline.e2e.test.ts` alone through `vitest.arr-e2e.pipeline.config.ts`, since it drives every container from one config.yml (~15s).
- `pnpm test:e2e:arr:sonarr-v5` — reruns the Sonarr feature file against the v5 container.
- `pnpm test:e2e:arr:radarr` — reruns the Radarr feature file sequentially against v5, v6 and v7, asserting the connected major version. Uses its own setup, so only the three Radarr containers are needed.
- `pnpm test:e2e:arr` — all stages in that order; Sonarr v4/v5 and Radarr v5/v6/v7 are included.

`globalSetup.ts` waits for all APIs once and warms the Recyclarr/TRaSH clone; each file then copies that clone, because configarr checks out its pinned revision on every run and two files sharing one clone would race on `.git/index.lock`.

Each file cleans its *arr in `beforeAll`, snapshots the server-wide settings it overwrites (UI, media management, naming, default delay profile, quality definitions, download-client config), and restores plus cleans again in `afterAll` — regardless of which test failed.

## Ports / API key

Override with `SONARR_BASE_URL`, `SONARR_API_KEY`, …, `PROWLARR_BASE_URL`, `PROWLARR_API_KEY`. The normal suite tests Sonarr v4 and v5. The v5 stage defaults to port `18990` and the test API key; override it independently with `SONARR_V5_BASE_URL` and `SONARR_V5_API_KEY`. To run just the v5 Sonarr feature file:

```bash
pnpm test:e2e:arr:sonarr-v5
```

To run only the Radarr matrix:

```bash
PUID=$(id -u) PGID=$(id -g) docker compose -f tests/arr-e2e/docker-compose.yml up -d radarr radarr-v5 radarr-v7
pnpm test:e2e:arr:radarr
```

Individual stages are `pnpm test:e2e:arr:radarr-v5`, `:radarr-v6` and `:radarr-v7`.
Override their connections with `RADARR_V5_BASE_URL` / `RADARR_V5_API_KEY`
(and `V6` / `V7` equivalents). The ordinary suite still uses `RADARR_BASE_URL`.
V7 is pinned to 7.0.0.10815 by image digest; refresh it together with
the API specification in `generate-api.ts`. The full Radarr coverage column below
runs on each major, including templates, settings and CRUD/idempotency. Profile-language
coverage selects Irish on v7 and English on v5/v6, then verifies updates and idempotency.

The Radarr versions and the two Sonarr containers use separate config/database volumes. Do not share their volumes or use `docker compose down -v` if the local test databases should be retained.

| App          | URL                    | API key                            |
| ------------ | ---------------------- | ---------------------------------- |
| Sonarr v4    | http://127.0.0.1:18989 | `e2etestapikey0123456789abcdef012` |
| Sonarr v5    | http://127.0.0.1:18990 | same                               |
| Radarr v6    | http://127.0.0.1:17878 | same                               |
| Radarr v5    | http://127.0.0.1:17879 | same                               |
| Radarr v7    | http://127.0.0.1:17880 | same                               |
| Whisparr     | http://127.0.0.1:16969 | same                               |
| Readarr      | http://127.0.0.1:18787 | same                               |
| Lidarr       | http://127.0.0.1:18686 | same                               |
| Prowlarr     | http://127.0.0.1:19696 | same                               |
| FlareSolverr | http://127.0.0.1:18191 | — (Prowlarr proxy only)            |

## File map

| File                   | Role                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.yml`   | Media *arr + Sonarr/Radarr version fixtures + Prowlarr + FlareSolverr                                                |
| `globalSetup.ts`       | Wait for every API, warm the template repo clone                                                                     |
| `helpers.ts`           | Clients, configarr runner, assertions, cleanup, snapshot/restore                                                     |
| `config.ts`            | Only the config fragments that are identical for every *arr                                                          |
| `sonarr.e2e.test.ts`   | All Sonarr features + Recyclarr `WEB-1080p` include                                                                  |
| `radarr.e2e.test.ts`   | All Radarr features + Recyclarr `HD Bluray + WEB` include                                                            |
| `whisparr.e2e.test.ts` | All Whisparr features                                                                                                |
| `readarr.e2e.test.ts`  | All Readarr features + metadata profiles, object root folders                                                        |
| `lidarr.e2e.test.ts`   | All Lidarr features + metadata profiles, `items[]` delay profiles (#481)                                             |
| `prowlarr.e2e.test.ts` | Tags, sync profiles, proxies, indexers, applications, download clients                                               |
| `pipeline.e2e.test.ts` | All six instances in one config.yml, twice, plus the cross-cutting instance `tags:` / `delete_unmanaged_tags:` block |

Per-*arr files are deliberately duplicated instead of generated from a shared factory: the payloads differ per app, and `if (kind === …)` in a test hides which app is actually being asserted. Only *arr-agnostic code is shared (`helpers.ts`, `config.ts`).

## Coverage

Feature × arr × create / update / delete / idempotent (second run Diff Report `(up to date - no changes)` + GET). `C` create, `U` update, `D` delete, `I` idempotent. `—` not applicable.

| Feature                        | Sonarr   | Radarr   | Whisparr | Readarr  | Lidarr   | Prowlarr |
| ------------------------------ | -------- | -------- | -------- | -------- | -------- | -------- |
| Custom formats                 | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     | —        |
| Quality profiles               | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     | —        |
| Quality definitions            | CUI      | CUI      | CUI      | CUI      | CUI      | —        |
| Root folders                   | CDI      | CDI      | CDI      | CUDI     | CUDI     | —        |
| Media settings (MM/naming/UI)  | CUI      | CUI      | CUI      | CUI      | CUI      | —        |
| Delay profiles                 | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     | —        |
| Release profiles               | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     | —        |
| Download clients (blackhole)   | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     |
| DC config / remote paths       | CUI / CD | CUI / CD | CUI / CD | CUI / CD | CUI / CD | —        |
| Metadata profiles              | —        | —        | —        | CUDI     | CUDI     | —        |
| Tags                           | CDI      | CDI      | —        | —        | —        | CDI      |
| Sync profiles                  | —        | —        | —        | —        | —        | CUDI     |
| Applications                   | —        | —        | —        | —        | —        | CUDI     |
| Indexer proxies (FlareSolverr) | —        | —        | —        | —        | —        | CUDI     |
| Indexers                       | —        | —        | —        | —        | —        | CUDI     |
| TRaSH/Recyclarr templates      | C        | C        | —        | —        | —        | —        |

Letters = asserted GET after a configarr write/omit. Root-folder **update** for Sonarr/Radarr/Whisparr is N/A (path identity). Lidarr/Readarr update the folder `name` via YAML. Tags have no update API. Media-arr **CD** is the instance `tags:` / `delete_unmanaged_tags:` block, asserted on Sonarr in `pipeline.e2e.test.ts` and on each Radarr major in `radarr.e2e.test.ts`: it drops a seeded orphan tag while keeping a label listed in `tags` and a label referenced only by a managed delay profile. It is the same schema on all five, so Whisparr, Readarr and Lidarr are not re-asserted. Download clients and indexers stay `enable: false` (configuration only; no live download/search). Prowlarr indexer fields are matched ignoring case and underscores: `prowlarr.e2e.test.ts` writes `single_file_release_use_filename` on a live schema that spells it that way, then updates it through the camelCase alias. DC **U** is `priority`. The delay-profile mapper is additionally exercised directly per *arr (legacy payload, or `items[]` for Lidarr).

## Rules for new sync features

- Extend every `tests/arr-e2e/<arr>.e2e.test.ts` the feature applies to. Copy the block and adjust the payload; do not add an `if` on the *arr type.
- Prefix managed names `e2e-`. Ignore lists for `delete_unmanaged_*` come from `nonE2eNames(...)`, never from the raw server list. Never `root_folders: []` — keep the pre-existing folders in the YAML.
- Assert GET + second-run diff up to date. Do not regex stdout for `Created`/`Updated`/`Deleted`.
- Poll with `waitUntil` where the *arr applies a write asynchronously (quality definitions, remote paths).
- Snapshot anything server-wide you overwrite and restore it in `afterAll`.
- Construct clients with `new SonarrClient(...)` (etc.). Do not call `configureApi`.
- See this README as the coverage source of truth.

## Known gaps

- **No qBittorrent / usenet backend.** Download-client e2e uses TorrentBlackhole with `enable: false`. Disabled clients are saved with `forceSave` so *arr does not connection-test a downloader.
- **Indexers** are created `enable: false` (config only). FlareSolverr is in compose for the Prowlarr proxy, same image as `examples/full`.
- **TRaSH/Recyclarr templates** are a Sonarr/Radarr create-only smoke (`WEB-1080p` / `HD Bluray + WEB`). No CUDI.
- **Whisparr 3.5.0 rejects its own default naming config** (`movieFolderFormat` / `sceneFolderFormat` must start with a literal subfolder, `sceneImportFolderFormat` must not be empty). A `PUT /config/naming` that carries those defaults 400s, so `media_naming_api` on Whisparr needs valid folder formats in the YAML. `restoreMediaBaseline` therefore skips writes that would not change anything.
- **Prowlarr applications** point at the Sonarr and Radarr containers. Prowlarr may create indexers there; nothing in those files manages indexers, so it does not affect their assertions.
- **In-use tags are never asserted against a live server.** A `delete_unmanaged_tags` run that hits a 409 needs a tag held by a resource configarr does not manage (import list, notification, indexer), and no client in this repo exposes those endpoints. The `onInUse: "skip"` and `onInUse: "throw"` policies are covered in `src/tags/tags.test.ts` instead.
