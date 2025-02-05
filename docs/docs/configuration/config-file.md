---
sidebar_position: 2
title: Configuration File
description: "Learn how to configure Configarr using config.yml and secrets.yml"
keywords: [configarr configuration, yaml config, secrets management, custom formats]
---

import CodeBlock from "@theme/CodeBlock";
import ConfigFileSample from "!!raw-loader!./\_include/config-file-sample.yml";

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
   - `language` field support added with `1.7.0`
   - Can be overridden using `trashGuideUrl` in config.yml
   - See [TRaSH-Guides Radarr](https://github.com/TRaSH-Guides/Guides/tree/master/docs/json/radarr/quality-profiles) and [TRaSH-Guides Sonarr](https://github.com/TRaSH-Guides/Guides/tree/master/docs/json/sonarr/quality-profiles) for more information

## Custom Formats Definitions {#custom-format-definitions}

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

<details>
  <summary>Config.yml</summary>
  <CodeBlock language="yml" title="config.yml">{ConfigFileSample}</CodeBlock>
</details>

### secrets.yml

Store sensitive information like API keys in this file. Never commit this file to version control.

```yaml title="secrets.yml"
SONARR_API_KEY: your_sonarr_api_key_here
RADARR_API_KEY: your_radarr_api_key_here
```

### Enable/Disable

You can configure enabled `*Arr` instance with options in the `config.yml` file.
Default everything is `true`.

```yml
# true or false
sonarrEnabled: false
radarrEnabled: false
whisparrEnabled: false
readarrEnabled: false
lidarrEnabled: false

# You can also disable on per instance basis
sonarr:
  instance1:
    # ...
    enabled: false
```

## Quality Definition / Size

Support has been added to allow configuring quality definitions manually if required.
(Hint: Currently evaluation if the current function with `type: string` which represents the filename in the TRaSH-Guide should be deprecated in favor of the more consistent `trash_id`. See [Github Issue](https://github.com/raydak-labs/configarr/issues/155)).

```yml
# ...

sonarr:
  instance1:
    # ...
    quality_definition:
      qualities:
        - quality: "HDTV-720p" # this must always match with the available name / identifier in the *arr
          title: AdjustedName # optional
          min: 17.1
          preferred: 500
          max: 1000

# other file template.yml
---
quality_definition:
  qualities:
    - quality: "HDTV-1080p"
      min: 20
      preferred: 500
      max: 1000
```

Notes:

- `preferredRatio` only applies to TRaSH/Recyclarr imported templates
- works also with template and `include`
- merged order is like: TRaSH/Recyclarr templates -> local templates -> config file
- experimental, available since `v1.9.0`

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

## Quality Profile Rename {#quality-profile-rename}

Support has been added to allow renaming quality profiles.
This is useful if you use existing templates for example from TRaSH-Guides but want to adjust the naming to your liking.

We achieve the renaming by modifying all names in the quality_profiles fields and custom formats score mappings.

```yml
# ...

sonarr:
  instance1:
    # ...

    # Ability to rename profiles
    renameQualityProfiles:
      - from: ExampleProfile # must be the exact name of the existing profile
        to: RenamedExampleProfile # will be the new profile
```

Notes:

- not supported in templates and will therefore not be merged!
- rename order will be displayed in `DEBUG` log like: `DEBUG [16:37:09.377]: Will rename quality profiles in this order: 'ExampleProfile' -> 'RenamedExampleProfile','[German] HD Bluray + WEB' -> 'RenamedProfile'`
- **experimental**, available since `v1.10.0`

## Quality Profile Cloning {#quality-profile-clone}

Support has been added to allow cloning quality profiles.
This is useful if you use existing templates for example from TRaSH-Guides but want to duplicate and slightly adjust some Custom Format scores or mappings.

We achieve the clone by duplicating all quality profiles and duplicating all profile references in the custom formats.

:::tip
The **ordering** of `rename` and `clone` is important. At the moment we `rename` first and then `clone`!
:::

```yml
# ...

sonarr:
  instance1:
    # ...

    # Ability to clone profiles
    cloneQualityProfiles:
      - from: ExampleProfile # must be the exact name of the existing profile
        to: ClonedProfile1 # will be the new profile
```

Notes:

- not supported in templates and will therefore not be merged!
- clone order will be displayed in `DEBUG` log
- **experimental**, available since `v1.10.0`

## Cleanup / Deleting CustomFormats {#cleanup-custom-formats}

You can now enable the option to delete all custom formats which are not managed and used in the quality profiles.
Additionally you can provide exceptions which should be ignored from deletions.

```yml
# ...

sonarr:
  instance1:
    # ...

    # (experimental) since v1.12.0. Optional
    delete_unmanaged_custom_formats:
      enabled: true
      ignore: # optional
        - some-cf
```

Notes:

- **experimental**, available since `v1.12.0`

## CustomFormatGroups {#custom-format-groups}

Support has been added to allow using the TRaSH-Guide custom format groups: [see here](https://github.com/TRaSH-Guides/Guides/tree/master/docs/json/sonarr/cf-groups).
Those are logically bundled together CustomFormats which will be applied together.
TRaSH-Guide is using them in an interactive manner with Notifiarr therefore there are also non required CustomFormats.
Configarr will only load required ones (`required: true`).

If you need some optional ones just add them with the existing `custom_formats` mapping.
Also the `quality_profiles` mapping in the JSON file is ignored because it does not make sense in Configarr.

```yml
# ...

sonarr:
  instance1:
    # ...

    # (experimental) since v1.12.0
    # allows using the cf-groups from TRaSH-Guide.
    custom_format_groups:
      - id: c4735e1d02e8738044ad4ad1bf58670c # Multiple CFs, default only required=true are loaded
        #include_unrequired: true # if you want to load all set this to true
      - trash_ids:
          - c4735e1d02e8738044ad4ad1bf58670c # Multiple CFs, only where required=true are loaded
        assign_scores_to:
          - name: MyProfile
```

Notes:

- **experimental**, available since `v1.12.0`

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
  - https://lidarr.audio/docs/api/#/NamingConfig/get_api_v1_config_naming

  MediaManagement APIs:

  - https://radarr.video/docs/api/#/MediaManagementConfig/get_api_v3_config_mediamanagement
  - https://sonarr.tv/docs/api/#/MediaManagementConfig/get_api_v3_config_mediamanagement
  - https://whisparr.com/docs/api/#/MediaManagementConfig/get_api_v3_config_mediamanagement
  - https://readarr.com/docs/api/#/MediaManagementConfig/get_api_v1_config_mediamanagement
  - https://lidarr.audio/docs/api/#/MediaManagementConfig/get_api_v1_config_mediamanagement
