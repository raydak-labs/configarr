---
sidebar_position: 3
description: "Examples of Configarr usage and configuration"
keywords: [configarr, examples, configuration, sonarr, radarr]
---

# Examples

## Full Example

A complete example demonstrating all Configarr features is available in our GitHub repository. This example includes:

- Docker Compose configuration
- Complete Sonarr and Radarr setup
- Custom format configurations
- Quality profile settings
- Template usage

You can find the full example at: [configarr/examples/full](https://github.com/raydak-labs/configarr/tree/main/examples/full)

### Quick Start with the Full Example

1. Start the Arr containers:

   ```bash
   docker-compose up -d
   ```

   This will:

   - Create required networks
   - Launch Sonarr instance
   - Launch Radarr instance
   - Configure API keys using provided XML configs

2. Run Configarr:
   ```bash
   docker-compose -f docker-compose.jobs.yml run --rm configarr
   ```

### Access Points

Once running, you can access the services at:

- Sonarr: http://localhost:6500
- Radarr: http://localhost:6501

### Cleanup

To remove all containers and volumes:

```bash
docker-compose down -v
```
