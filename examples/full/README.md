# Configarr - Full example

This example contains every feature provided by configarr.

1. Start arr containers with `docker-compose up -d`
   - Create network for containers
   - Creates sonarr instance
   - To try the optional Sonarr v5 beta instance, set `enabled: true` for `sonarr.instance-v5` in `config/config.yml`, then run `docker compose --profile sonarr-v5 up -d`
   - Creates radarr instance
   - API keys are provided with environment variables (e.g. `SONARR__AUTH__APIKEY`)
   - Whisparr still seeds `whisparr.xml` because its image ignores those env vars
2. Run configarr with `docker-compose -f docker-compose.jobs.yml run --rm configarr`

URLs:

- sonarr: http://localhost:6500
- sonarr-v5 (optional beta): http://localhost:6506
- radarr: http://localhost:6501
- whisparr: http://localhost:6502
- readarr: http://localhost:6503
- lidarr: http://localhost:6504
- prowlarr: http://localhost:6505

Cleanup: `docker-compose down -v`

The v5 container and Configarr instance are both opt-in; v5 has a separate config/database volume from v4. The example config includes a disabled second `sonarr` instance with sample per-profile quality sizes, release-profile controls, and media-management settings. The v5 image is pinned to the same beta build used by the e2e tests; update that digest when choosing a newer build.

## Development

You can also use this full example template as testing environment by utilizing the `docker-compose.local.yml` file.

- Build image: `docker-compose -f docker-compose.local.yml build`
- Run image: `docker-compose -f docker-compose.local.yml run --rm configarr`
  - This will run always with the current code changes; no need to rebuild for simple code changes because the code will be mounted into the container
