---
sidebar_position: 2
title: Experimental Support
description: "Experimental and testing support for other *Arr tools"
keywords: [configarr configuration, yaml config, custom formats, expermintal, whisparr]
---

# Experimental support

This section describes experimental support for other \*Arr tools.
This means that some features of configarr are working as expected but not every feature must be supported.

:::warning
This is experimental and testing support. Support could be dropped in the future.
:::

## Whisparr v3

Experimental support for Whisparr was added with [v1.4.0](https://github.com/raydak-labs/configarr/releases/tag/v1.4.0).

Configuration is mostly equal to the Sonarr or Radarr.

Following things are currently not supported or tested:

- quality definition preset is not evaluated
  ```yaml
  quality_definition:
    type: movies # not checked yet
  ```
- initial language of quality profiles is not correct -> `0`
- no available presets because nothings provided in trash guide or recyclarr -> needs to be done manually with local templates and custom formats
