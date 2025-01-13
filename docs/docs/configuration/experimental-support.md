---
sidebar_position: 3
title: Experimental Support
description: "Experimental and testing support for other *Arr tools"
keywords: [configarr configuration, yaml config, custom formats, expermintal, whisparr, readarr, lidarr]
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
- no available presets because nothings provided in TRaSH-Guides or recyclarr -> needs to be done manually with local templates and custom formats

### Configuration File

Check [configuration file reference](/docs/configuration/config-file#custom-format-definitions) for more information.

```yaml title="config.yml"
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

# experimental support: check https://configarr.rayak.de/docs/configuration/experimental-support
whisparr:
  instance1: # Instance name (can be any unique identifier)
    base_url: http://whisparr:6969 # instance URL
    api_key: !secret WHISPARR_API_KEY # Reference to API key in secrets.yml

    quality_definition:
      type: movies # TODO: not checked yet

    include:
      # only custom defined templates available
      - template: whisparr

    custom_formats: # Custom format assignments
      - trash_ids:
          - example-in-config-cf
        assign_scores_to:
          - name: ExampleProfile
            score: 1000

    quality_profiles:
      # TODO: language not correctly mapped
      - name: ExampleProfile
        upgrade:
          until_score: 200
          # Not supported in whisparr
          #min_format_score: 200
```

## Readarr v1

Experimental support for Readarr was added with [v1.4.0](https://github.com/raydak-labs/configarr/releases/tag/v1.4.0).

Configuration is mostly equal to the Sonarr or Radarr.

Following things are currently not supported or tested:

- quality definition preset is not evaluated
  ```yaml
  quality_definition:
    type: movies # not checked yet
  ```
- metadata profiles are not supported. This is a specific thing to readarr and requires custom implementation and breaking out of some abstraction layer we have in the code
- no available presets because nothings provided in TRaSH-Guides or recyclarr -> needs to be done manually with local templates and custom formats

### Configuration File

Check [configuration file reference](/docs/configuration/config-file#custom-format-definitions) for more information.

```yaml title="config.yml"
localCustomFormatsPath: /app/cfs
localConfigTemplatesPath: /app/templates

customFormatDefinitions:
  - trash_id: example-release-title-cf
    trash_scores:
      default: 0
    name: ExampleReleaseTitleCF
    includeCustomFormatWhenRenaming: false
    specifications:
      - name: Preferred Words
        implementation: ReleaseTitleSpecification
        negate: false
        required: false
        fields:
          value: "\\b(SPARKS|Framestor)\\b"

# experimental support: check https://configarr.rayak.de/docs/configuration/experimental-support
readarr:
  instance1: # Instance name (can be any unique identifier)
    base_url: http://readarr:8787 # instance URL
    api_key: !secret READARR_API_KEY # Reference to API key in secrets.yml

    # not supported
    # quality_definition:
    #   type: movies # Quality definition type

    include:
      # only custom defined templates available
      - template: readarr

    custom_formats: # Custom format assignments
      - trash_ids:
          - example-release-title-cf
        assign_scores_to:
          - name: ExampleProfile
            score: 1000

    quality_profiles:
      - name: ExampleProfile
        upgrade:
          until_score: 200
```

## Lidarr v2

Experimental support for Lidarr was added with [v1.8.0](https://github.com/raydak-labs/configarr/releases/tag/v1.8.0).

Configuration is mostly equal to the Sonarr or Radarr.

Following things are currently not supported or tested:

- quality definition preset is not evaluated
  ```yaml
  quality_definition:
    type: movies # not checked yet
  ```
- metadata profiles are not supported. This is a specific thing to lidarr and requires custom implementation and breaking out of some abstraction layer we have in the code
- no available presets because nothings provided in TRaSH-Guides or recyclarr -> needs to be done manually with local templates and custom formats

### Configuration File

Check [configuration file reference](/docs/configuration/config-file#custom-format-definitions) for more information.

```yaml title="config.yml"
localCustomFormatsPath: /app/cfs
localConfigTemplatesPath: /app/templates

customFormatDefinitions:
  - trash_id: example-release-title-cf
    trash_scores:
      default: 0
    name: ExampleReleaseTitleCF
    includeCustomFormatWhenRenaming: false
    specifications:
      - name: Preferred Words
        implementation: ReleaseTitleSpecification
        negate: false
        required: false
        fields:
          value: "\\b(SPARKS|Framestor)\\b"

# experimental support: check https://configarr.rayak.de/docs/configuration/experimental-support
lidarr:
  instance1:
    # Set the URL/API Key to your actual instance
    base_url: http://lidarr:8686
    api_key: !secret LIDARR_API_KEY

    # not supported
    # quality_definition:
    #   type: movie # Quality definition type

    include:
      # only custom defined templates available
      - template: lidarr

    custom_formats: # Custom format assignments
      - trash_ids:
          - example-release-title-cf
        assign_scores_to:
          - name: ExampleProfile
            score: 1000

    quality_profiles:
      # TODO: language not correctly mapped
      - name: ExampleProfile
        upgrade:
          until_score: 200
          # Not supported
          #min_format_score: 200
```
