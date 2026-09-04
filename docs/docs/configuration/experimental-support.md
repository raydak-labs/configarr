---
sidebar_position: 4
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
    type: movie # not checked yet
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
      type: movie # TODO: not checked yet

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

Metadata profiles support was added with [v1.19.0](https://github.com/raydak-labs/configarr/releases/tag/v1.19.0).

Configuration is mostly equal to the Sonarr or Radarr.

Following things are currently not supported or tested:

- quality definition preset is not evaluated
  ```yaml
  quality_definition:
    type: movie # not checked yet
  ```
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
    #   type: movie # Quality definition type

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

    # Metadata Profiles (since v1.19.0)
    metadata_profiles:
      - name: Standard
        min_popularity: 10
        skip_missing_date: true
        skip_missing_isbn: false
        skip_parts_and_sets: false
        skip_secondary_series: false
        allowed_languages:
          - eng # ISO 639-3 language codes
          - deu
          - null # Allow books with no language
        min_pages: 50
        must_not_contain:
          - "Abridged"
          - "Large Print"

    # Delete unmanaged metadata profiles (since v1.19.0)
    delete_unmanaged_metadata_profiles:
      enabled: true
      ignore:
        - Default
```

:::tip Language Codes
Readarr metadata profiles use **ISO 639-3** language codes (3-letter codes like `eng`, `deu`, `fra`).
:::

## Lidarr v2

Experimental support for Lidarr was added with [v1.8.0](https://github.com/raydak-labs/configarr/releases/tag/v1.8.0).

Configuration is mostly equal to the Sonarr or Radarr.

Following things are currently not supported or tested:

- quality definition preset is not evaluated
  ```yaml
  quality_definition:
    type: movie # not checked yet
  ```
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

    # Metadata Profiles (since v1.19.0)
    metadata_profiles:
      - name: Standard
        # at least one required
        primary_types:
          - Album
          - EP
          - Single
        # at least one required
        secondary_types:
          - Studio
          - Compilation
          - Soundtrack
        # at least one required
        release_statuses:
          - Official

    # Delete unmanaged metadata profiles (since v1.19.0)
    delete_unmanaged_metadata_profiles:
      enabled: true
      ignore:
        - SomeProfile
```

### Lidarr Metadata Profile Fields

| Field              | Type         | Description                                                                           |
| ------------------ | ------------ | ------------------------------------------------------------------------------------- |
| `name`             | string       | **Required.** Profile name (must be unique)                                           |
| `primary_types`    | string array | **Required.** List of enabled primary album types (Album, EP, Single, Broadcast)      |
| `secondary_types`  | string array | **Required.** List of enabled secondary album types (Studio, Live, Compilation, etc.) |
| `release_statuses` | string array | **Required.** List of enabled release statuses (Official, Promotion, Bootleg, etc.)   |

**How it works:**

- Only types/statuses listed in the arrays will be **enabled** (allowed)
- All other types/statuses will be **disabled**

**Example:**

```yaml
metadata_profiles:
  - name: Standard
    primary_types: [Album, EP] # Only Album and EP enabled
    secondary_types: [Studio, Compilation] # Only Studio and Compilation enabled
    release_statuses: [Official] # Only Official enabled
```

## Prowlarr v1

Experimental support for Prowlarr was added with [v1.31.0](https://github.com/raydak-labs/configarr/releases/tag/v1.31.0).

Prowlarr is an indexer manager, not a media manager, so it uses a dedicated `prowlarr:` block
instead of the usual `*arr` instance shape. The following are managed:

- **Tags** – ensure a set of tag labels exists (and optionally prune the rest)
- **Applications** – the Sonarr/Radarr/... sync targets Prowlarr pushes its indexers to
- **Indexers** – created from a Prowlarr schema `definition` (e.g. `1337x`), matched by `name`
- **Indexer Proxies** – FlareSolverr / HTTP / SOCKS4 / SOCKS5
- **Download Clients** – reuses the same engine as the other `*arr` download clients
- an optional **"sync indexers to apps"** trigger (`applications.sync_indexers`)

Each managed section (`applications`, `indexers`, `indexer_proxies`, `download_clients`) supports a
`delete_unmanaged: { enabled, ignore }` block. Resources are synced in dependency order: tags →
indexer proxies → indexers → applications → download clients.

Not supported (out of scope for now): indexer definitions/proxies beyond CRUD, app sync profiles,
notifications, DNS/host config.

Enable/disable all Prowlarr instances with the top-level `prowlarrEnabled` flag (defaults to enabled).

### Configuration File

```yaml title="config.yml"
prowlarrEnabled: true
prowlarr:
  main: # Instance name (can be any unique identifier)
    base_url: http://prowlarr:9696
    api_key: !secret PROWLARR_API_KEY

    # Ensure these tag labels exist (created if missing)
    tags:
      - managed
      - vip
    delete_unmanaged_tags:
      enabled: false
      ignore:
        - keep-me

    # Indexer proxies (FlareSolverr, Http, Socks4, Socks5)
    indexer_proxies:
      data:
        - name: flaresolverr
          type: FlareSolverr
          fields:
            host: http://flaresolverr:8191/
            requestTimeout: 60
          tags:
            - managed
      delete_unmanaged:
        enabled: false

    # Indexers - `definition` is the Prowlarr schema definitionName; matched on the server by `name`
    indexers:
      data:
        - name: 1337x
          definition: 1337x
          enable: true
          app_profile: Standard # resolved to appProfileId; defaults to the first profile
          priority: 25
          fields:
            torrentBaseSettings.seedRatio: 1.0
          tags:
            - managed
      delete_unmanaged:
        enabled: false
        ignore:
          - "Manual Indexer"

    applications:
      data:
        - name: Sonarr
          type: Sonarr # Prowlarr implementation name (Sonarr, Radarr, Lidarr, Readarr, Whisparr, ...)
          sync_level: fullSync # disabled | addOnly | fullSync (default: fullSync)
          fields:
            prowlarrUrl: http://prowlarr:9696
            baseUrl: http://sonarr:8989
            apiKey: !secret SONARR_API_KEY
            syncCategories: [5000, 5010, 5020, 5030, 5040, 5045, 5050]
          tags:
            - managed # tag name (auto-resolved / created)
      delete_unmanaged:
        enabled: false
        ignore:
          - "Manual App"
      # After the apps are synced, run Prowlarr's global "Sync App Indexers" command
      sync_indexers: true

    # Same shape as the other *arr download_clients (no `config` / `remote_paths` for Prowlarr)
    download_clients:
      data:
        - name: qbittorrent
          type: QBittorrent
          fields:
            host: qbittorrent
            port: 8080
      delete_unmanaged:
        enabled: false
```

## Metadata Profiles - Common Configuration

Both Readarr and Lidarr support metadata profiles to control what content is accepted.

### Delete Unmanaged Profiles

You can automatically delete metadata profiles that exist on the server but are not defined in your configuration.

**Simple form:**

```yaml
delete_unmanaged_metadata_profiles: true
```

**Full form with ignore list:**

```yaml
delete_unmanaged_metadata_profiles:
  enabled: true
  ignore:
    - LegacyProfile
    - CustomProfile
```

:::warning Built-in Protection
The `None` profile (Lidarr/Readarr) is **always** protected from deletion, even if not in the ignore list.
:::

### Templates and Metadata Profiles

Metadata profiles can be defined in templates and merged with instance configurations.

**Template:**

```yaml title="templates/readarr.yml"
metadata_profiles:
  - name: Standard
    min_popularity: 10

delete_unmanaged_metadata_profiles:
  enabled: true
  ignore: []
```

**Instance:**

```yaml title="config.yml"
readarr:
  instance1:
    include:
      - template: readarr
    metadata_profiles:
      - name: Audiobooks
        min_popularity: 5
```

**Result:** Instance has both "Standard" (from template) and "Audiobooks" (from instance).

### Best Practices

1. **Test with dry run first:**

   ```bash
   DRY_RUN=true npm start
   ```

2. **Use ISO 639-3 language codes** for Readarr (e.g., `eng`, `deu`, not `en`, `de`)

3. **Be explicit about deletion** - always specify ignore list:

   ```yaml
   delete_unmanaged_metadata_profiles:
     enabled: true
     ignore:
       - Legacy
   ```

4. **Use templates** for shared profiles across instances
