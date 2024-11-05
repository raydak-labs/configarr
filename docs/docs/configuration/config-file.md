---
sidebar_position: 1
title: Configuration File
description: "Learn how to configure Configarr using config.yml and secrets.yml"
keywords: [configarr configuration, yaml config, secrets management, custom formats]
---

# Configuration Files

Configarr uses two main configuration files:

- `config.yml` - Contains your main configuration
- `secrets.yml` - Stores sensitive information like API keys

## Configuration Structure

We try to be mostly compatible with Recyclarr, but with some small differences.
We started this fork since Recyclarr V7 and will not always support newer features.
Additionally we implement new features which recyclarr does not support at all like custom formats definitions directly in config or support local folders.

### Templates

Configarr supports two types of templates:

1. **Recyclarr Templates**: Used to define reusable configuration blocks

   - Documentation: [Recyclarr Templates Wiki](https://github.com/recyclarr/recyclarr/wiki/Templates)
   - Location: Place template files in the directory specified by `localConfigTemplatesPath`

2. **TRaSH Guide Templates**: Standard templates from TRaSH Guides
   - These are automatically pulled from the TRaSH Guide repository
   - Can be overridden using `trashGuideUrl` in config.yml
   - See [Trash Radarr](https://github.com/TRaSH-Guides/Guides/tree/master/docs/json/radarr/quality-profiles) and [Trash Sonarr](https://github.com/TRaSH-Guides/Guides/tree/master/docs/json/sonarr/quality-profiles) for more information

## Custom Formats

Custom formats can be defined in two ways:

1. **Direct in config.yml**: Define custom formats directly in your configuration file
2. **Separate files**: Store custom formats in separate files in the `localCustomFormatsPath` directory

Example custom format definition:

```yaml title="config.yml"
# ...
customFormatDefinitions:
  - trash_id: custom-de-only # Unique identifier
    trash_scores:
      default: -10000 # Default score for this format
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
# ...
```

## Configuration Files Reference

### config.yml

The main configuration file that defines your Sonarr and Radarr instances, custom formats, and template includes.

```yaml title="config.yml"
# Optional: Override default repositories
#trashGuideUrl: https://github.com/BlackDark/fork-TRASH-Guides
#recyclarrConfigUrl: https://github.com/BlackDark/fork-recyclarr-configs

# Optional: Paths for custom formats and templates
localCustomFormatsPath: /app/cfs
localConfigTemplatesPath: /app/templates

# Custom Format Definitions (optional)
customFormatDefinitions:
  []
  # ... custom format definitions ...

# Sonarr Configuration
sonarr:
  instance1: # Instance name (can be any unique identifier)
    base_url: http://sonarr:8989 # Sonarr instance URL
    api_key: !secret SONARR_API_KEY # Reference to API key in secrets.yml
    # api_key: !env SONARR_API_KEY # load from environment variable

    quality_definition:
      type: series # Quality definition type for Sonarr

    include: # Template includes
      - template: sonarr-cf
      - template: sonarr-quality
      - template: d1498e7d189fbe6c7110ceaabb7473e6
        source: TRASH # RECYCLARR (default) or TRASH

    custom_formats: # Custom format assignments
      - trash_ids:
          - 9f6cbff8cfe4ebbc1bde14c7b7bec0de # IMAX Enhanced
        assign_scores_to: # quality_profiles is deprecated
          - name: ExampleProfile
            score: 0
    quality_profiles:
      - name: Remux + WEB 1080p
        upgrade:
          min_format_score: 10000

# Radarr Configuration empty
radarr: {}
```

### secrets.yml

Store sensitive information like API keys in this file. Never commit this file to version control.

```yaml title="secrets.yml"
SONARR_API_KEY: your_sonarr_api_key_here
RADARR_API_KEY: your_radarr_api_key_here
```

## Usage

1. Create both `config.yml` and `secrets.yml` files
2. Place them in your Configarr configuration directory
3. For Docker installations, mount these files as volumes
4. For Kubernetes deployments, create ConfigMaps/Secrets from these files

Configarr will automatically load these configurations on startup and apply them to your Sonarr/Radarr instances.
