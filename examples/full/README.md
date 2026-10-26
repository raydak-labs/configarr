# Configarr - Full example

This example contains every feature provided by configarr.

1. Start arr containers with `docker compose up -d`
   - Starts Sonarr v4 and the pinned Sonarr v5 beta side by side, each with a separate config volume
   - Starts Radarr v6 and v7 side by side with separate config volumes
   - Creates the shared network and starts the other arr containers
   - Whisparr seeds `whisparr.xml` because its image ignores the API-key environment overrides
2. Run Configarr with `docker compose -f docker-compose.jobs.yml run --rm configarr`
   - The Radarr v7 instance imports the HD Bluray + WEB profile.
   - The example syncs both Sonarr instances and imports the TRaSH Guides WEB-1080p profile on v5.
   - To run the source in this checkout instead of the published image, use `docker compose -f docker-compose.local.yml run --build --rm configarr`.
   - The API keys in `config/secrets.yml` are example-only.

URLs:

- sonarr: http://localhost:6500
- sonarr-v5 (beta): http://localhost:6506
- radarr (v6): http://localhost:6501
- radarr-v7: http://localhost:6507
- whisparr: http://localhost:6502
- readarr: http://localhost:6503
- lidarr: http://localhost:6504
- prowlarr: http://localhost:6505

Cleanup: `docker compose down -v`

The v5 image is pinned to the same beta build used by the e2e tests. Its sample config covers TRaSH template import, quality definitions and per-profile sizes, release-profile controls, media-management settings, root folders, UI settings, and media naming. Update the image digest when choosing a newer beta.

The Radarr v7 image is pinned to 7.0.0.10815, matching the live compatibility tests. Its YAML uses the same settings as v5/v6. Keep the v6 and v7 config volumes separate.

## Development

You can also use this full example template as testing environment by utilizing the `docker-compose.local.yml` file.

- Build image: `docker-compose -f docker-compose.local.yml build`
- Run image: `docker-compose -f docker-compose.local.yml run --rm configarr`
  - This will run always with the current code changes; no need to rebuild for simple code changes because the code will be mounted into the container
