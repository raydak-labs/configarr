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

2. **TRaSH-Guides Templates**: Standard templates from TRaSH-Guides
   - These are automatically pulled from the TRaSH-Guides repository
   - Can be overridden using `trashGuideUrl` in config.yml
   - See [TRaSH-Guides Radarr](https://github.com/TRaSH-Guides/Guides/tree/master/docs/json/radarr/quality-profiles) and [TRaSH-Guides Sonarr](https://github.com/TRaSH-Guides/Guides/tree/master/docs/json/sonarr/quality-profiles) for more information

## Custom Formats Definitions

Custom formats can be defined in two ways:

1. **Direct in config.yml**: Define custom formats directly in your configuration file
2. **Separate files**: Store custom formats in separate files in the `localCustomFormatsPath` directory
3. **Local templates**: Store custom formats in local templates folder which can be included per instance (at the moment only for local templates and not recyclarr git templates)

Example custom format definition:

```yaml title="config.yml"
# Directly in the main config.yml
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

```yaml title="local-templates/template1.yml"
# or in templates which can be included per instance
customFormatDefinitions:
  - trash_id: custom-de-only2 # Unique identifier
    trash_scores:
      default: -10000 # Default score for this format
    trash_description: "Language: German Only 2"
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

If you want to deep dive into available values and parameters you can always check the direct source code reference for available configurations: [Source Code](https://github.com/raydak-labs/configarr/blob/main/src/types/config.types.ts)

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

      # WEB-1080p (recyclarr template)
      - template: sonarr-quality-definition-series
      - template: sonarr-v4-quality-profile-web-1080p
      - template: sonarr-v4-custom-formats-web-1080p

    # experimental available in all *arr
    #media_management: {}

    # experimental available in all *arr
    #media_naming_api: {}

    # naming from recyclarr: https://recyclarr.dev/wiki/yaml/config-reference/media-naming/
    #media_naming: {}

    custom_formats: # Custom format assignments
      - trash_ids:
          - 47435ece6b99a0b477caf360e79ba0bb # x265 (HD)
        assign_scores_to:
          - name: WEB-1080p
            score: 0
      - trash_ids:
          - a3d82cbef5039f8d295478d28a887159 # block HDR10+
          - 2b239ed870daba8126a53bd5dc8dc1c8 # block DV HDR10+
        assign_scores_to:
          - name: WEB-1080p
            score: -10000
      - trash_ids:
          - example-in-config-cf # custom format defined in config.yml
        assign_scores_to:
          - name: WEB-1080p
            score: -5000

    quality_profiles:
      - name: WEB-1080p
        upgrade:
          min_format_score: 10000

# Radarr Configuration
radarr:
  instance1: # Instance name (can be any unique identifier)
    base_url: http://radarr:7878 # Radarr instance URL
    api_key: !secret RADARR_API_KEY # Reference to API key in secrets.yml

    quality_definition:
      type: movies # Quality definition type for Radarr

    include:
      # Comment out any of the following includes to disable them
      - template: radarr-quality-definition-movie
      - template: radarr-quality-profile-hd-bluray-web
      - template: radarr-custom-formats-hd-bluray-web

    custom_formats: # Custom format assignments
      - trash_ids:
          - 9f6cbff8cfe4ebbc1bde14c7b7bec0de # IMAX Enhanced
        assign_scores_to:
          - name: HD Bluray + WEB
            score: 0
    quality_profiles:
      - name: HD Bluray + WEB
        upgrade:
          min_format_score: 200

# experimental support: check https://configarr.rayak.de/docs/configuration/experimental-support
whisparr: {}

# experimental support: check https://configarr.rayak.de/docs/configuration/experimental-support
readarr: {}
```

### secrets.yml

Store sensitive information like API keys in this file. Never commit this file to version control.

```yaml title="secrets.yml"
SONARR_API_KEY: your_sonarr_api_key_here
RADARR_API_KEY: your_radarr_api_key_here
```

## Media Naming

You can use the predefined naming configurations from TRaSH-Guide like in recyclarr with the `media_naming` key.

- [TRaSH-Guide Sonarr Naming](https://github.com/TRaSH-Guides/Guides/blob/master/docs/json/sonarr/naming/sonarr-naming.json)
- [TRaSH-Guide Radarr Naming](https://github.com/TRaSH-Guides/Guides/blob/master/docs/json/radarr/naming/radarr-naming.json)
- [Recyclarr Wiki](https://recyclarr.dev/wiki/yaml/config-reference/media-naming/)

The configuration values differs between Radarr and Sonarr.

**Radarr**

```yml
radarr:
  instance1:
    # Media Naming Configuration
    media_naming:
      folder: default
      movie:
        rename: true
        standard: default
```

| **Property**     | **Description**                                                               | **Default** |
| ---------------- | ----------------------------------------------------------------------------- | ----------- |
| `folder`         | Key for "Movie Folder Format". Check debug logs or TRaSH-Guide for values.    | Not synced  |
| `movie.rename`   | If set to `true`, this enables the "Rename Movies" checkbox in the Radarr UI. | Not synced  |
| `movie.standard` | Key for "Standard Movie Format". Check debug logs or TRaSH-Guide for values.  | Not synced  |

All configurations above directly affect the "Movie Naming" settings under **Settings > Media Management** in the Radarr UI. If a property is _not specified_, Configarr will not sync that setting, allowing manual configuration.

---

**Sonarr**

```yml
sonarr:
  instance1:
    # Media Naming Configuration
    media_naming:
      series: default
      season: default
      episodes:
        rename: true
        standard: default
        daily: default
        anime: default
```

| **Property**        | **Description**                                                                 | **Default** |
| ------------------- | ------------------------------------------------------------------------------- | ----------- |
| `series`            | Key for "Series Folder Format". Check debug logs or TRaSH-Guide for values.     | Not synced  |
| `season`            | Key for "Season Folder Format". Check debug logs or TRaSH-Guide for values.     | Not synced  |
| `episodes.rename`   | If set to `true`, this enables the "Rename Episodes" checkbox in the Sonarr UI. | Not synced  |
| `episodes.standard` | Key for "Standard Episode Format". Check debug logs or TRaSH-Guide for values.  | Not synced  |
| `episodes.daily`    | Key for "Daily Episode Format". Check debug logs or TRaSH-Guide for values.     | Not synced  |
| `episodes.anime`    | Key for "Anime Episode Format". Check debug logs or TRaSH-Guide for values.     | Not synced  |

All configurations above directly affect the "Episode Naming" settings under **Settings > Media Management** in the Sonarr UI. If a property is _not specified_, Configarr will not sync that setting, allowing manual configuration.

## Usage

1. Create both `config.yml` and `secrets.yml` files
2. Place them in your Configarr configuration directory
3. For Docker installations, mount these files as volumes
4. For Kubernetes deployments, create ConfigMaps/Secrets from these files

Configarr will automatically load these configurations on startup and apply them to your Sonarr/Radarr instances.

## Experimental supported fields

- Experimental support for `media_management` and `media_naming_api` (since v1.5.0)
  With those you can configure different settings in the different tabs available per *arr.
  Both fields are under experimental support.
  The supports elements in those are dependent on the *arr used.
  Check following API documentation of available fields:

  Naming APIs:

  - https://radarr.video/docs/api/#/NamingConfig/get_api_v3_config_naming
  - https://sonarr.tv/docs/api/#/NamingConfig/get_api_v3_config_naming
  - https://whisparr.com/docs/api/#/NamingConfig/get_api_v3_config_naming
  - https://readarr.com/docs/api/#/NamingConfig/get_api_v1_config_naming

  MediaManagement APIs:

  - https://radarr.video/docs/api/#/MediaManagementConfig/get_api_v3_config_mediamanagement
  - https://sonarr.tv/docs/api/#/MediaManagementConfig/get_api_v3_config_mediamanagement
  - https://whisparr.com/docs/api/#/MediaManagementConfig/get_api_v3_config_mediamanagement
  - https://readarr.com/docs/api/#/MediaManagementConfig/get_api_v1_config_mediamanagement
