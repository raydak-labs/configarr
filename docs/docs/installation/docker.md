---
sidebar_position: 1
title: Docker Installation
description: "Learn how to install and configure Configarr using Docker"
keywords: [configarr docker, docker installation, docker setup, configarr configuration]
---

import CodeBlock from "@theme/CodeBlock";
import DockerBasicConf from "!!raw-loader!./\_include/docker-basic-conf.yml";

# Docker Installation

This guide will walk you through setting up Configarr using Docker.

:::tip
For quick starting and testing you can use the `latest` tag.
But if you are ready and finished switch to fixed tag like `1.9.0` so you can update and do required changes if we release new versions.
Solutions like `Renovate` are good for keeping your dependencies updated.
:::

## Quick Start

The fastest way to get started is using the official Docker image:

```bash title="shell"
docker run -d \
  --name=configarr \
  -v /path/to/config:/config \
  ghcr.io/raydak-labs/configarr:latest

# Or use dockerhub image:

docker run -d \
  --name=configarr \
  -v /path/to/config:/config \
  configarr/configarr:latest
```

## Docker Compose (Recommended)

For a more maintainable setup, we recommend using Docker Compose:

```yaml title="compose.yml"
#version: "3.8"
services:
  configarr:
    image: ghcr.io/raydak-labs/configarr:latest
    container_name: configarr
    #user: 1000:1000 # Optional, defaults to root:root
    environment:
      - TZ=Etc/UTC
    volumes:
      - ./config:/app/config # Contains the config.yml and secrets.yml
      - ./dockerrepos:/app/repos # Cache repositories
      - ./custom/cfs:/app/cfs # Optional if custom formats locally provided
      - ./custom/templates:/app/templates # Optional if custom templates
    # restart: "no" # optional make sure this is set to no or removed. Default is no
```

Save this as `docker-compose.yml` and run:

```bash title="shell"
docker-compose run --rm configarr
```

## Configuration

### Volume Mappings

| Volume           | Description                                                                           |
| ---------------- | ------------------------------------------------------------------------------------- |
| `/app/config`    | Contains all configuration files and data. Can be changed with Environment Variables. |
| `/app/repos`     | Contains cached repos. Can be changed with Environment Variables.                     |
| `/app/cfs`       | Contains custom cfs. Can be changed with Environment Variables.                       |
| `/app/templates` | Contains templates. Can be changed with Environment Variables.                        |

### Environment Variables

See [Environment Variables](../configuration/environment-variables.md)

## Basic Configuration

Create a configuration file at `/path/to/config/config.yaml` more information about the config file can be found [here](../configuration/config-file.md).
You can also test everything with the [Full Example](../examples.md) locally.

<details>
  <summary>Very basic configuration</summary>
  <CodeBlock language="yml">{DockerBasicConf}</CodeBlock>
</details>

## Updating

To update to the latest version:

```bash title="shell"
docker-compose pull
docker-compose run --rm configarr
```

## Troubleshooting

Running the container will output logs to the console.
With those you can see what is happening and if there are any issues.
Increase the log level with the `LOG_LEVEL` environment variable to get more detailed logs.

### Common Issues

- **Permission Issues**

  - Ensure user matches your required user
  - Check folder permissions on the config directory
  - after changing the user, adjust the user in the git repos (TRaSH-Guides, recyclarr) to match

- **Connection Issues**

  - Verify Sonarr/Radarr URLs are accessible from the container
  - Confirm API keys are correct
  - Check network connectivity between containers if using Docker networks

- **Configuration Issues**

  - Validate your YAML syntax
  - Ensure all required fields are present in config.yaml

- **Container restarting**
  - Ensure you have not set restart policies and running with `docker-compose up -d`. This triggers the docker daemon to restart the container every minute.
  - Scheduling is NOT implemented into configarr as described [here](../configuration/scheduled.md). Therefore please check the [Scheduled example](../examples.md)

Need more help? [open an issue](https://github.com/raydak-labs/configarr/issues).
