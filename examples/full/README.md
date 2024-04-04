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
