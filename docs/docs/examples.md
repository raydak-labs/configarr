---
sidebar_position: 6
description: "Examples of Configarr usage and configuration"
keywords: [configarr, examples, configuration, sonarr, radarr]
---

# HowTo / Examples

## How To's

### Implementation of TRaSH-Guide Profiles

**Q: I want to implement the German Radarr Profile**

Let's say we want to implement the German Profile for Radarr.
Visit the [TRaSH-Guide page](https://trash-guides.info/Radarr/radarr-setup-quality-profiles-german-en/) and read through the requirements.
Some parts have to be done via UI like configuring naming, repacks/proper etc.
Once those parts are done, we can start with the Custom Formats and QualityProfiles.

For this approach, we can do 3 different things:

<details>
  <summary>Use existing TRaSH-Guide profile</summary>

TRaSH-Guide provides predefined profiles via JSON, available in the [Github Repository](https://github.com/TRaSH-Guides/Guides/tree/master/docs/json/radarr/quality-profiles).
To load QualityProfiles from TRaSH-Guide, use the `trash_id` defined in the profile and specify `source` as `TRASH` in the config.

In this example, we want `german-hd-bluray-web.json`

```yml title="config.yml"
# ...
radarr:
  instance1:
    # ...

    include:
      - template: 2b90e905c99490edc7c7a5787443748b
        source: TRASH
```

And that's it.
Now you can adjust custom formats if needed.

```yml title="config.yml"
# ...
radarr:
  instance1:
    # ...

    custom_formats:
      - trash_ids:
          - 3bc8df3a71baaac60a31ef696ea72d36
        assign_scores_to:
          - name: "[German] HD Bluray + WEB"
            score: 400
```

</details>

<details>
  <summary>Use existing Recyclarr templates</summary>

You can use existing Recyclarr templates if available.
Check the [Recyclarr Wiki](https://recyclarr.dev/wiki/guide-configs/) or [Github Repository](https://github.com/recyclarr/config-templates/tree/master/radarr).

Two possibility here:

1. Copy & paste the provided template from the wiki
2. use only the templates (if templates for everything are provided. Must be in the includes dir.)

(Hint: the value in the template field is the file name of the Recyclarr template without the extension)

1. For this example, we try to implement `German HD Bluray + WEB`.

```yml title="copy&paste"
# ...existing code...
radarr:
  hd-bluray-web-ger:
    # ...
    include:
      - template: radarr-quality-definition-movie
      - template: radarr-custom-formats-hd-bluray-web-german
      - template: radarr-quality-profile-hd-bluray-web-german

    quality_profiles:
      - name: HD Bluray + WEB (GER)
        # min_format_score: 10000 # Uncomment this line to skip English Releases

    custom_formats:
      ### Optional
      - trash_ids:
        #  - b6832f586342ef70d9c128d40c07b872 # Bad Dual Groups
        #  - 90cedc1fea7ea5d11298bebd3d1d3223 # EVO (no WEBDL)
        #  - ae9b7c9ebde1f3bd336a8cbd1ec4c5e5 # No-RlsGroup
        #  - 7357cf5161efbf8c4d5d0c30b4815ee2 # Obfuscated
        #  - 5c44f52a8714fdd79bb4d98e2673be1f # Retags
        #  - f537cf427b64c38c8e36298f657e4828 # Scene
        assign_scores_to:
          - name: HD Bluray + WEB (GER)

      ### Movie Versions
      - trash_ids:
        # Uncomment any of the following lines to prefer these movie versions
        #  - 570bc9ebecd92723d2d21500f4be314c # Remaster
        #  - eca37840c13c6ef2dd0262b141a5482f # 4K Remaster
        #  - e0c07d59beb37348e975a930d5e50319 # Criterion Collection
        #  - 9d27d9d2181838f76dee150882bdc58c # Masters of Cinema
        #  - db9b4c4b53d312a3ca5f1378f6440fc9 # Vinegar Syndrome
        #  - 957d0f44b592285f26449575e8b1167e # Special Edition
        #  - eecf3a857724171f968a66cb5719e152 # IMAX
        #  - 9f6cbff8cfe4ebbc1bde14c7b7bec0de # IMAX Enhanced
        assign_scores_to:
          - name: HD Bluray + WEB (GER)

      ### Others
      - trash_ids:
        # - 839bea857ed2c0a8e084f3cbdbd65ecb # Uncomment this line to allow HDR/DV x265 HD releases
        assign_scores_to:
          - name: HD Bluray + WEB (GER)

      - trash_ids:
        #  - dc98083864ea246d05a42df0d05f81cc # Uncomment this line to allow any x265 HD releases
        #  - e6886871085226c3da1830830146846c # Uncomment this line to allow Generated Dynamic HDR
        assign_scores_to:
          - name: HD Bluray + WEB (GER)
            score: 0
```

2. For this example, we try to implement `HD Bluray + WEB`.

```yml title="only templates"
# ...existing code...
radarr:
hd-bluray-web-ger:
  # ...
  include:
    - template: radarr-quality-definition-movie
    - template: radarr-custom-formats-hd-bluray-web
    - template: radarr-quality-profile-hd-bluray-web
```

</details>

<details>
  <summary>Write your own profiles</summary>

Instead of using existing templates, you can create them yourself and use custom formats from TRaSH (or define your own if required, see [CustomFormatDefinition](./configuration/config-file.md)).
As a starting point, you can use templates from Recyclarr and modify them as required.
[Recyclarr Github](https://github.com/recyclarr/config-templates/tree/master/radarr).

For this example, we try to implement an `Anime` profile.
Check every dir from the includes for anime-related content: CustomFormats, Definition, and Profile.
Copy those into the config.

```yml
# ...existing code...
radarr:
  instance1:
    custom_formats:
      # Scores from TRaSH json
      - trash_ids:
          # Anime CF/Scoring
          - fb3ccc5d5cc8f77c9055d4cb4561dded # Anime BD Tier 01 (Top SeaDex Muxers)
          - 66926c8fa9312bc74ab71bf69aae4f4a # Anime BD Tier 02 (SeaDex Muxers)
          - fa857662bad28d5ff21a6e611869a0ff # Anime BD Tier 03 (SeaDex Muxers)
          - f262f1299d99b1a2263375e8fa2ddbb3 # Anime BD Tier 04 (SeaDex Muxers)
          - ca864ed93c7b431150cc6748dc34875d # Anime BD Tier 05 (Remuxes)
          - 9dce189b960fddf47891b7484ee886ca # Anime BD Tier 06 (FanSubs)
          - 1ef101b3a82646b40e0cab7fc92cd896 # Anime BD Tier 07 (P2P/Scene)
          - 6115ccd6640b978234cc47f2c1f2cadc # Anime BD Tier 08 (Mini Encodes)
          - 8167cffba4febfb9a6988ef24f274e7e # Anime Web Tier 01 (Muxers)
          - 8526c54e36b4962d340fce52ef030e76 # Anime Web Tier 02 (Top FanSubs)
          - de41e72708d2c856fa261094c85e965d # Anime Web Tier 03 (Official Subs)
          - 9edaeee9ea3bcd585da9b7c0ac3fc54f # Anime Web Tier 04 (Official Subs)
          - 22d953bbe897857b517928f3652b8dd3 # Anime Web Tier 05 (FanSubs)
          - a786fbc0eae05afe3bb51aee3c83a9d4 # Anime Web Tier 06 (FanSubs)
          - b0fdc5897f68c9a68c70c25169f77447 # Anime LQ Groups
          - c259005cbaeb5ab44c06eddb4751e70c # v0
          - 5f400539421b8fcf71d51e6384434573 # v1
          - 3df5e6dfef4b09bb6002f732bed5b774 # v2
          - db92c27ba606996b146b57fbe6d09186 # v3
          - d4e5e842fad129a3c097bdb2d20d31a0 # v4
          - 06b6542a47037d1e33b15aa3677c2365 # Anime Raws
          - 9172b2f683f6223e3a1846427b417a3d # VOSTFR
          - b23eae459cc960816f2d6ba84af45055 # Dubs Only

          # Anime Streaming Services
          - 60f6d50cbd3cfc3e9a8c00e3a30c3114 # VRV

          # Main Guide Remux Tier Scoring
          - 3a3ff47579026e76d6504ebea39390de # Remux Tier 01
          - 9f98181fe5a3fbeb0cc29340da2a468a # Remux Tier 02
          - 8baaf0b3142bf4d94c42a724f034e27a # Remux Tier 03

          # Main Guide WEB Tier Scoring
          - c20f169ef63c5f40c2def54abaf4438e # WEB Tier 01
          - 403816d65392c79236dcb6dd591aeda4 # WEB Tier 02
          - af94e0fe497124d1f9ce732069ec8c3b # WEB Tier 03
        assign_scores_to:
          - name: Anime

    # if no anime use default
    quality_definition:
      type: movie

    quality_profiles:
      - name: Anime
        reset_unmatched_scores:
          enabled: true
        upgrade:
          allowed: true
          until_quality: Remux-1080p
          until_score: 10000
        min_format_score: 100
        score_set: anime-radarr
        quality_sort: top
        qualities:
          - name: Remux-1080p
            qualities:
              - Bluray-1080p
              - Remux-1080p
          - name: WEB 1080p
            qualities:
              - WEBDL-1080p
              - WEBRip-1080p
              - HDTV-1080p
          - name: Bluray-720p
          - name: WEB 720p
            qualities:
              - WEBDL-720p
              - WEBRip-720p
              - HDTV-720p
          - name: Bluray-576p
          - name: Bluray-480p
          - name: WEB 480p
            qualities:
              - WEBDL-480p
              - WEBRip-480p
          - name: DVD
          - name: SDTV
```

</details>

### Adjusting provided templates by TRaSH-Guides/Recyclarr

It is common to use existing templates from TRaSH-Guides or Recyclarr and modify them with either your own scores or additional custom formats.
Configarr supports both use cases and allows adding custom formats when needed.

```yaml
# Define a new custom format (can also be done via file)
customFormatDefinitions:
  - trash_id: example-in-config-cf
    trash_scores:
      default: 10000
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
    base_url: !secret sonarr_url
    api_key: !secret sonarr_apikey

    include:
      # Use existing templates from Recyclarr as base
      - template: sonarr-quality-definition-series
      - template: sonarr-v4-quality-profile-web-1080p
      - template: sonarr-v4-custom-formats-web-1080p

      # HINT: To use TRaSH-Guides templates, you can use them too
      #- template: d1498e7d189fbe6c7110ceaabb7473e6
      #  source: TRASH # RECYCLARR (default) or TRASH

    # Adjust the custom formats as needed per profile
    custom_formats:
      - trash_ids:
          - example-in-config-cf
        quality_profiles:
          - name: WEB-1080p # name must match with given profiles (found in Recyclarr or TRaSH-Guides)
            # score: 0 # Uncomment this line to add custom scoring

      # Overwrite existing scores
      - trash_ids:
          - e6258996055b9fbab7e9cb2f75819294 # WEB Tier 01
        quality_profiles:
          - name: WEB-1080p # name must match with given profiles (found in Recyclarr or TRaSH-Guides)
            score: 123
```

### Using templates from TRaSH-Guides/Recyclarr but different names

Some features are available others not yet.

- renaming quality profiles. How to implement see here: [Renaming Feature](./configuration/config-file.md##quality-profile-rename)
- clone [#115](https://github.com/raydak-labs/configarr/issues/115)
- duplicate templates:
  You can copy those templates and paste them into a locally mounted folder.
  Then you can rename them in the templates as required.

```yaml
# The path in the container for your templates for copy & paste templates with slight modifications in the files.
localConfigTemplatesPath: /app/templates

sonarr:
  instance1:
    base_url: !secret sonarr_url
    api_key: !secret sonarr_apikey

    include:
      # Assuming we copied 3 templates for quality definition, profile, and formats to those file names (file ending .yml)
      - template: my-local-quality-definition-series
      - template: my-local-quality-profile
      - template: my-local-custom-formats

      # HINT: To use TRaSH-Guides templates, you can use them too
      #- template: d1498e7d189fbe6c7110ceaabb7473e6
      #  source: TRASH # RECYCLARR (default) or TRASH

    # Adjust the custom formats as needed per profile
    custom_formats:
      # Overwrite existing scores
      - trash_ids:
          - e6258996055b9fbab7e9cb2f75819294 # WEB Tier 01
        quality_profiles:
          - name: MyLocalProfile # name must match with given profiles (found in Recyclarr or TRaSH-Guides)
            score: 123
```

## Code Examples

### Full Example

A complete example demonstrating all Configarr features is available in our GitHub repository. This example includes:

- Docker Compose configuration
- Complete Sonarr and Radarr setup
- Custom format configurations
- Quality profile settings
- Template usage

You can find the full example at: [configarr/examples/full](https://github.com/raydak-labs/configarr/tree/main/examples/full)

#### Quick Start with the Full Example

1. Start the Arr containers:

   ```bash
   docker-compose up -d
   ```

   This will:

   - Create required networks
   - Launch \*Arr instances
   - Configure API keys using provided XML configs

2. Run Configarr:
   ```bash
   docker-compose -f docker-compose.jobs.yml run --rm configarr
   ```

#### Access Points

Once running, you can access the services at:

- Sonarr: http://localhost:6500
- Radarr: http://localhost:6501
- Other instances check `docker-compose.yml`

#### Cleanup

To remove all containers and volumes:

```bash
docker-compose down -v
```

### Scheduled Example

This is an example of how to execute Configarr in a scheduled manner.

You can find the full example at: [configarr/examples/scheduled](https://github.com/raydak-labs/configarr/tree/main/examples/scheduled)

Please check the documentation for how to configure and use the variants.
