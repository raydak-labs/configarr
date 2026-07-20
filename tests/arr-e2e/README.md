# *arr live e2e tests

Opt-in Vitest suite against real *arr containers. **Not** part of `pnpm test`.

Covers: **Sonarr**, **Radarr**, **Whisparr**, **Readarr**, **Lidarr** (nightly for `items[]`).

## Start stack

```bash
cd tests/arr-e2e
PUID=$(id -u) PGID=$(id -g) docker compose up -d
```

Runtime data lives in named Docker volumes; only `fixtures/*/config.xml` is bind-mounted.

Wait until APIs respond (first boot can take ~30–90s), then:

```bash
ARR_E2E=1 pnpm test:e2e:arr
```

Default URLs / key (override with `SONARR_BASE_URL`, `SONARR_API_KEY`, …):

| App      | URL                    | API key                            |
| -------- | ---------------------- | ---------------------------------- |
| Sonarr   | http://127.0.0.1:18989 | `e2etestapikey0123456789abcdef012` |
| Radarr   | http://127.0.0.1:17878 | same                               |
| Whisparr | http://127.0.0.1:16969 | same                               |
| Readarr  | http://127.0.0.1:18787 | same                               |
| Lidarr   | http://127.0.0.1:18686 | same                               |

`ARR_E2E=1` required; without it the suite is skipped.

## What is asserted

1. **Full pipeline smoke** (`full-pipeline.e2e.test.ts`): runs real `configarr` twice against all five *arrs (CF/QP/delay/… pipeline). Asserts exit `0` and `Execution Summary` success `(1/0/0)` per type. Not field-level.
2. **Delay profiles** (`delay-profiles.e2e.test.ts`):
   - Sonarr / Radarr / Whisparr / Readarr — legacy delay-profile payload via `mapToServerDelayProfile`
   - Lidarr nightly — legacy → 400; `items` → success (#481)

## GitHub Actions (optional)

Workflow **Arr E2E** is `workflow_dispatch` only (Actions → Arr E2E → Run workflow). Does not run on every PR.
