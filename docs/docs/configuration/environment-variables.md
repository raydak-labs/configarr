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

| Variable Name                           | Default Value             | Required | Description                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LOG_LEVEL`                             | `"info"`                  | No       | Sets the logging level. Options are `trace`, `debug`, `info`, `warn`, `error`, and `fatal`.                                                                                                                                                                                                                                          |
| `LOG_STACKTRACE`                        | `"false"`                 | No       | (Experimental, v1.11.0) Outputs additionally stacktraces of underlying errors.                                                                                                                                                                                                                                                       |
| `CONFIG_LOCATION`                       | `"./config/config.yml"`   | No       | Specifies the path to the configuration file.                                                                                                                                                                                                                                                                                        |
| `SECRETS_LOCATION`                      | `"./config/secrets.yml"`  | No       | Specifies the path to the secrets file. Since `v1.21.0`, can be a comma-separated list and/or glob patterns; later files override earlier ones.                                                                                                                                                                                      |
| `CUSTOM_REPO_ROOT`                      | `"./repos"`               | No       | Defines the root directory for custom repositories.                                                                                                                                                                                                                                                                                  |
| `ROOT_PATH`                             | Current working directory | No       | Sets the root path for the application. Defaults to the current working directory.                                                                                                                                                                                                                                                   |
| `DRY_RUN`                               | `"false"`                 | No       | When set to `"true"`, runs the application in dry run mode without making changes. The [diff report](general.md#diff-reports) printed to the console has the same content as a real run.                                                                                                                                             |
| `CONFIGARR_DIFF_OUTPUT_FILE`            | `undefined`               | No       | If set, writes the full run's [diff report](general.md#diff-reports) (every instance, across every \*arr type) as a single JSON document to this file path once the run completes, in addition to the console output.                                                                                                                |
| `LOAD_LOCAL_SAMPLES`                    | `"false"`                 | No       | If `"true"`, loads local sample data for testing purposes.                                                                                                                                                                                                                                                                           |
| `DEBUG_CREATE_FILES`                    | `"false"`                 | No       | Enables debugging for file creation processes when set to `"true"`.                                                                                                                                                                                                                                                                  |
| `TZ`                                    | `"Etc/UTC"`               | No       | Timezone for the container.                                                                                                                                                                                                                                                                                                          |
| `STOP_ON_ERROR`                         | `"false"`                 | No       | (Experimental, v1.11.0) Stop execution on any error on any instance.                                                                                                                                                                                                                                                                 |
| `TELEMETRY_ENABLED`                     | `undefined`               | No       | Enables anonymous telemetry tracking of feature usage. Takes precedence over config file setting.                                                                                                                                                                                                                                    |
| `CONFIGARR_DISABLE_GIT_CLONE_OPTIONS`   | `undefined`               | No       | Disables custom git clone options (`--filter=blob:none` and `--sparse`). Use this if you encounter errors like "Function not implemented" or "index-pack failed" with legacy kernels. See [troubleshooting](../faq.md#git-clone-errors-with-legacy-kernels) for more details.                                                        |
| `CONFIGARR_ENABLE_MERGE`                | `"false"`                 | No       | When set to `"true"`, enables YAML merge keys (`<<`) when parsing the main config file, so you can use anchors and merge keys to share and override config blocks. See [config file](config-file.md) for details.                                                                                                                    |
| `CONFIGARR_ENFORCE_CONFIG_VALIDATION`   | `"false"`                 | No       | (Experimental) When `"false"` (default), an invalid `config.yml` only logs a warning and Configarr continues with what it parsed. Set to `"true"` to make Configarr stop with an error instead, so config mistakes are caught immediately rather than silently ignored.                                                              |
| `CONFIGARR_ENFORCE_EXTERNAL_VALIDATION` | `"false"`                 | No       | (Experimental) Same as `CONFIGARR_ENFORCE_CONFIG_VALIDATION`, but for external data pulled from the TRaSH-Guides repo (custom formats, quality profiles, quality definitions, naming files, conflicts). Set to `"true"` to stop with an error if that data doesn't match the expected shape, instead of just warning and continuing. |

## Usage

To use these environment variables, set them in your shell or include them in your deployment configuration via docker or kubernetes.

## Examples

- For example you change the default path for all configs, repos with the `ROOT_PATH` variables.
  As default it would store them inside the application directory (in the container this is `/app`)

## References

Check the `.env.template` file in the repository [Github](https://github.com/raydak-labs/configarr/blob/main/.env.template)
