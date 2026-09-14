# Prowlarr examples/full live test plan

Date: 2026-09-15
Scope: `examples/full` Prowlarr instance only (`sonarrEnabled`/`radarrEnabled`/`whisparrEnabled`/`readarrEnabled`/`lidarrEnabled` = false).
Stack: `docker compose up -d` then configarr against live Prowlarr (`localhost:6505`, API key from `prowlarr.xml`).

## Success criteria

1. Run 1 exits 0 and creates every managed resource from `config.yml`.
2. Prowlarr API matches the config (tags, proxy, indexer, apps, download client).
3. Run 2 (no config change) reports **no resource creates/updates/deletes**. API payloads stay the same aside from timestamps/ids that Prowlarr itself mutates.
4. Configarr does not sync Sonarr/Radarr/Whisparr/Readarr/Lidarr.

## Setup

1. Start `examples/full` compose (Prowlarr + FlareSolverr + Sonarr/Radarr — apps must be up because Prowlarr application sync talks to them).
2. Wait until `GET /api/v1/system/status` succeeds for Prowlarr `:6505`, Sonarr `:6500`, Radarr `:6501`.
3. Snapshot empty/baseline Prowlarr: `/tag`, `/indexerproxy`, `/indexer`, `/applications`, `/downloadclient`, `/appprofile`.

## Run 1 — apply

Expect creates:

| Resource        | Name / identity               | Checks                                                                                   |
| --------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| Tag             | `configarr`                   | exists                                                                                   |
| Indexer proxy   | `flaresolverr` / FlareSolverr | `host` = `http://flaresolverr:8191/`, tagged `configarr`                                 |
| Indexer         | `The Pirate Bay`              | `enable=true`, `priority=25`, tagged, definition matches                                 |
| Application     | `Sonarr`                      | `syncLevel=fullSync`, `baseUrl=http://sonarr:8989`, categories include 5000…5050, tagged |
| Application     | `Radarr`                      | `syncLevel=fullSync`, `baseUrl=http://radarr:7878`, categories include 2000…2060         |
| Download client | `qBittorrent`                 | `enable=false`, host `qbittorrent`, port `8080`                                          |

Also: `applications.sync_indexers: true` should POST the App Indexer Sync command.

## Run 2 — idempotency

Logs must show `no changes needed` (or Create/Update/Unchanged = 0/0/N) for:

- Tags
- IndexerProxies
- Indexers
- Applications (resource CRUD)
- Download clients

Failures:

- Any `Created` / `Updated` / `Deleted` of a managed resource
- Field diffs (especially masked `apiKey` `********` rewritten every run)
- Tag wipe / tag recreate
- Diff report listing resource updates when the API is unchanged

Note: `sync_indexers: true` re-triggers the command every run. That is a command, not a resource mutation. It must **not** be reported as an Application resource update if no apps actually changed.

## API verification (after each run)

```
X-Api-Key: a1b2c3d4e5f6470891234567890abcde
GET http://localhost:6505/api/v1/tag
GET http://localhost:6505/api/v1/indexerproxy
GET http://localhost:6505/api/v1/indexer
GET http://localhost:6505/api/v1/applications
GET http://localhost:6505/api/v1/downloadclient
GET http://localhost:6505/api/v1/command   # last commands; App Indexer Sync
```

Compare run1 vs run2 JSON (strip `********` secrets, command timestamps).

## Out of scope

delete_unmanaged, dry-run, unknown app_profile, omitted-tags preservation — covered by unit tests, not this example.
