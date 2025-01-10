# Configarr - Full example

This example contains every feature provided by configarr.

1. Start arr containers with `docker-compose up -d`
   - Create network for containers
   - Creates sonarr instance
   - Creates radarr instance
   - API keys are provided with the `xml` configs
2. Run configarr with `docker-compose -f docker-compose.jobs.yml run --rm configarr`

URLs:

- sonarr: http://localhost:6500
- radarr: http://localhost:6501

Cleanup: `docker-compose down -v`

## Development

You can also use this full example template as testing environment by utilizing the `docker-compose.local.yml` file.

- Build image: `docker-compose -f docker-compose.local.yml build`
- Run image: `docker-compose -f docker-compose.local.yml run --rm configarr`
  - This will run always with the current code changes; no need to rebuild for simple code changes because the code will be mounted into the container
