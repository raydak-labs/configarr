---
sidebar_position: 1
title: Docker Installation
description: "Learn how to install and configure Configarr using Docker"
keywords: [configarr docker, docker installation, docker setup, configarr configuration]
---

# Docker Installation

This guide will walk you through setting up Configarr using Docker.

## Quick Start

The fastest way to get started is using the official Docker image:

```bash title="shell"
docker run -d \
  --name=configarr \
  -v /path/to/config:/config \
  ghcr.io/raydak-labs/configarr:latest
```

## Docker Compose (Recommended)

For a more maintainable setup, we recommend using Docker Compose:

```yaml title="compose.yml"
#version: "3.8"
services:
  configarr:
    image: ghcr.io/raydak-labs/configarr:latest
    container_name: configarr
    user: 1000:1000 # Optional, defaults to root:root
    environment:
      - TZ=Etc/UTC
    volumes:
      - ./config:/app/config # Contains the config.yml and secrets.yml
      - ./dockerrepos:/app/repos # Cache repositories
      - ./custom/cfs:/app/cfs # Optional if custom formats locally provided
      - ./custom/templates:/app/templates # Optional if custom templates
    restart: unless-stopped
```

Save this as `docker-compose.yml` and run:

```bash title="shell"
docker-compose run --rm configarr
```

## Configuration

### Volume Mappings

| Volume    | Description                               |
| --------- | ----------------------------------------- |
| `/config` | Contains all configuration files and data |

### Environment Variables

| Variable    | Description | Default   |
| ----------- | ----------- | --------- |
| `TZ`        | Timezone    | `Etc/UTC` |
| `LOG_LEVEL` | Log level   | `info`    |

## Basic Configuration

1. Create a configuration file at `/path/to/config/config.yaml` more information about the config file can be found [here](../configuration/config-file.md):

```yaml title="config.yml (with examples and comments)"
#trashGuideUrl: https://github.com/BlackDark/fork-TRASH-Guides
#recyclarrConfigUrl: https://github.com/BlackDark/fork-recyclarr-configs
localCustomFormatsPath: /app/cfs
localConfigTemplatesPath: /app/templates

customFormatDefinitions:
  - trash_id: example-in-config-cf
    trash_scores:
      default: -10000
    trash_description: "Language: German Only"
    name: "Language: Not German"
    includeCustomFormatWhenRenaming: false
    specifications:
      - name: Not German Language
        implementation: LanguageSpecification
        negate: true
        required: false
        fields:
          value: 4

sonarr:
  instance1:
    # Set the URL/API Key to your actual instance
    base_url: http://sonarr:8989
    #base_url: https://sonarr.oci.eduard-marbach.de/
    api_key: !secret SONARR_API_KEY

    quality_definition:
      type: series

    include:
      #### Custom
      - template: sonarr-cf # template name
      - template: sonarr-quality

    custom_formats:
      # Movie Versions
      - trash_ids:
          - 9f6cbff8cfe4ebbc1bde14c7b7bec0de # IMAX Enhanced
        quality_profiles:
          - name: ExampleProfile
            # score: 0 # Uncomment this line to disable prioritised IMAX Enhanced releases

radarr: {} # no radarr instance
```

## Updating

To update to the latest version:

```bash title="shell"
docker-compose pull
docker-compose up -d
```

## Troubleshooting

Running the container will output logs to the console.
With those you can see what is happening and if there are any issues.
Increase the log level with the `LOG_LEVEL` environment variable to get more detailed logs.

### Common Issues

1. **Permission Issues**

   - Ensure user matches your required user
   - Check folder permissions on the config directory
   - after changing the user, adjust the user in the git repos (trash guide, recyclarr) to match

2. **Connection Issues**

   - Verify Sonarr/Radarr URLs are accessible from the container
   - Confirm API keys are correct
   - Check network connectivity between containers if using Docker networks

3. **Configuration Issues**
   - Validate your YAML syntax
   - Ensure all required fields are present in config.yaml

Need more help? [open an issue](https://github.com/raydak-labs/configarr/issues).
