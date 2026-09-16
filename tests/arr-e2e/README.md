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

One file per *arr, each owning its container end to end. That is also what makes the run parallel:

- `pnpm test:e2e:arr:parallel` — the six per-*arr files, in parallel (~40s).
- `pnpm test:e2e:arr:pipeline` — `pipeline.e2e.test.ts` alone, since it drives every container from one config.yml (~15s).
- `pnpm test:e2e:arr` — both, in that order.

`globalSetup.ts` waits for all APIs once and warms the Recyclarr/TRaSH clone; each file then copies that clone, because configarr checks out its pinned revision on every run and two files sharing one clone would race on `.git/index.lock`.

Each file cleans its *arr in `beforeAll`, snapshots the server-wide settings it overwrites (UI, media management, naming, default delay profile, quality definitions, download-client config), and restores plus cleans again in `afterAll` — regardless of which test failed.

## Ports / API key

Override with `SONARR_BASE_URL`, `SONARR_API_KEY`, …, `PROWLARR_BASE_URL`, `PROWLARR_API_KEY`.

| App          | URL                    | API key                            |
| ------------ | ---------------------- | ---------------------------------- |
| Sonarr       | http://127.0.0.1:18989 | `e2etestapikey0123456789abcdef012` |
| Radarr       | http://127.0.0.1:17878 | same                               |
| Whisparr     | http://127.0.0.1:16969 | same                               |
| Readarr      | http://127.0.0.1:18787 | same                               |
| Lidarr       | http://127.0.0.1:18686 | same                               |
| Prowlarr     | http://127.0.0.1:19696 | same                               |
| FlareSolverr | http://127.0.0.1:18191 | — (Prowlarr proxy only)            |

## File map

| File                   | Role                                                                     |
| ---------------------- | ------------------------------------------------------------------------ |
| `docker-compose.yml`   | Five media *arr + Prowlarr + FlareSolverr                                |
| `globalSetup.ts`       | Wait for every API, warm the template repo clone                         |
| `helpers.ts`           | Clients, configarr runner, assertions, cleanup, snapshot/restore         |
| `config.ts`            | Only the config fragments that are identical for every *arr              |
| `sonarr.e2e.test.ts`   | All Sonarr features + Recyclarr `WEB-1080p` include                      |
| `radarr.e2e.test.ts`   | All Radarr features + Recyclarr `HD Bluray + WEB` include                |
| `whisparr.e2e.test.ts` | All Whisparr features                                                    |
| `readarr.e2e.test.ts`  | All Readarr features + metadata profiles, object root folders            |
| `lidarr.e2e.test.ts`   | All Lidarr features + metadata profiles, `items[]` delay profiles (#481) |
| `prowlarr.e2e.test.ts` | Tags, sync profiles, proxies, indexers, applications, download clients   |
| `pipeline.e2e.test.ts` | All six instances in one config.yml, twice                               |

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
| Download clients (blackhole)   | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     |
| DC config / remote paths       | CUI / CD | CUI / CD | CUI / CD | CUI / CD | CUI / CD | —        |
| Metadata profiles              | —        | —        | —        | CUDI     | CUDI     | —        |
| Tags                           | —        | —        | —        | —        | —        | CDI      |
| Sync profiles                  | —        | —        | —        | —        | —        | CUDI     |
| Applications                   | —        | —        | —        | —        | —        | CUDI     |
| Indexer proxies (FlareSolverr) | —        | —        | —        | —        | —        | CUDI     |
| Indexers                       | —        | —        | —        | —        | —        | CUDI     |
| TRaSH/Recyclarr templates      | C        | C        | —        | —        | —        | —        |

Letters = asserted GET after a configarr write/omit. Root-folder **update** for Sonarr/Radarr/Whisparr is N/A (path identity). Lidarr/Readarr update the folder `name` via YAML. Tags have no update API. Download clients and indexers stay `enable: false` (configuration only; no live download/search). DC **U** is `priority`. The delay-profile mapper is additionally exercised directly per *arr (legacy payload, or `items[]` for Lidarr).

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
