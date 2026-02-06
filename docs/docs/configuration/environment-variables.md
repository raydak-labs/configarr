---
sidebar_position: 3
title: Environment Variables
description: "Learn about the environment variables used in our application configuration."
keywords: [environment variables, configuration, setup]
---

# Environment Variables

This document outlines the available environment variables for configuring Configarr besides the config files.
Each variable can be set to customize the behavior of the application.

## Available Environment Variables

| Variable Name                         | Default Value             | Required | Description                                                                                                                                                                                                                                                                   |
| ------------------------------------- | ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LOG_LEVEL`                           | `"info"`                  | No       | Sets the logging level. Options are `trace`, `debug`, `info`, `warn`, `error`, and `fatal`.                                                                                                                                                                                   |
| `LOG_STACKTRACE`                      | `"false"`                 | No       | (Experimental, v1.11.0) Outputs additionally stacktraces of underlying errors.                                                                                                                                                                                                |
| `CONFIG_LOCATION`                     | `"./config/config.yml"`   | No       | Specifies the path to the configuration file.                                                                                                                                                                                                                                 |
| `SECRETS_LOCATION`                    | `"./config/secrets.yml"`  | No       | Specifies the path to the secrets file. Since `v1.21.0`, can be a comma-separated list and/or glob patterns; later files override earlier ones.                                                                                                                               |
| `CUSTOM_REPO_ROOT`                    | `"./repos"`               | No       | Defines the root directory for custom repositories.                                                                                                                                                                                                                           |
| `ROOT_PATH`                           | Current working directory | No       | Sets the root path for the application. Defaults to the current working directory.                                                                                                                                                                                            |
| `DRY_RUN`                             | `"false"`                 | No       | When set to `"true"`, runs the application in dry run mode without making changes.                                                                                                                                                                                            |
| `LOAD_LOCAL_SAMPLES`                  | `"false"`                 | No       | If `"true"`, loads local sample data for testing purposes.                                                                                                                                                                                                                    |
| `DEBUG_CREATE_FILES`                  | `"false"`                 | No       | Enables debugging for file creation processes when set to `"true"`.                                                                                                                                                                                                           |
| `TZ`                                  | `"Etc/UTC"`               | No       | Timezone for the container.                                                                                                                                                                                                                                                   |
| `STOP_ON_ERROR`                       | `"false"`                 | No       | (Experimental, v1.11.0) Stop execution on any error on any instance.                                                                                                                                                                                                          |
| `TELEMETRY_ENABLED`                   | `undefined`               | No       | Enables anonymous telemetry tracking of feature usage. Takes precedence over config file setting.                                                                                                                                                                             |
| `CONFIGARR_DISABLE_GIT_CLONE_OPTIONS` | `undefined`               | No       | Disables custom git clone options (`--filter=blob:none` and `--sparse`). Use this if you encounter errors like "Function not implemented" or "index-pack failed" with legacy kernels. See [troubleshooting](../faq.md#git-clone-errors-with-legacy-kernels) for more details. |

## Usage

To use these environment variables, set them in your shell or include them in your deployment configuration via docker or kubernetes.

## Examples

- For example you change the default path for all configs, repos with the `ROOT_PATH` variables.
  As default it would store them inside the application directory (in the container this is `/app`)

## References

Check the `.env.template` file in the repository [Github](https://github.com/raydak-labs/configarr/blob/main/.env.template)
