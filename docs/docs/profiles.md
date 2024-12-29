---
sidebar_position: 4
description: "Sample profiles"
keywords: [configarr, examples, configuration, profiles]
---

# Quality profiles

Profiles you can copy and paste to use for your desired profiles. You can always modify and create own profiles just copy the existing configs as base and modify as wanted.

For example you like the base for the german custom formats:

- you can either just adjust scorings for specific custom formats
- or you can copy everything as base and maintain the scores without the need of a forked templates repo

## Existing base templates

You can use existing base templates from:

- Recyclarr: https://github.com/recyclarr/config-templates
- TRaSH-Guides:
  - [Radarr](https://github.com/TRaSH-Guides/Guides/tree/master/docs/json/radarr/quality-profiles)
  - [Sonarr](https://github.com/TRaSH-Guides/Guides/tree/master/docs/json/sonarr/quality-profiles)

## German profiles

- TRaSH-Guides:
  - [Radarr](https://trash-guides.info/Radarr/radarr-setup-quality-profiles-german-en/)
- Recyclarr Configs:
  - https://github.com/recyclarr/config-templates/pull/102
  - https://github.com/recyclarr/config-templates/pull/103

<!-- prettier-ignore-start -->
- Profiles:
  <details>
    <summary>HD Bluray + WEB</summary>
    
  ```yaml
  ###################################################################################################
  # Recyclarr Configuration Template: HD Bluray + WEB (GER)                                         #
  # Updated: 2024-12-28                                                                             #
  # Documentation: https://recyclarr.dev                                                            #
  # Note: If you are using multiple profiles in a single instance, please read the following        #
  # documentation about file merging:                                                               #
  # https://recyclarr.dev/wiki/yaml/config-examples/#merge-single-instance                          #
  ###################################################################################################

  # Instance Definition: https://recyclarr.dev/wiki/yaml/config-reference/basic/

  radarr:
    hd-bluray-web-ger:
      base_url: Put your Radarr URL here
      api_key: Put your API key here

      include:
        - template: radarr-quality-definition-movie
        - template: radarr-custom-formats-hd-bluray-web-german

      quality_profiles:
        - name: HD Bluray + WEB (GER)
          reset_unmatched_scores:
            enabled: false
          upgrade:
            allowed: true
            until_quality: Merged QPs
            until_score: 25000
  # Uncomment one of the next 2 lines dependent on if you want English Releases
          min_format_score: 1600 # Get English Releases and Upgrade to German when available
  #        min_format_score: 10000 # Skip English Releases
          quality_sort: top
          qualities:
            - name: Merged QPs
  # Comment any qualities you are not interested in
              qualities:
  #              - Bluray-2160p
  #              - WEBDL-2160p
  #              - WEBRip-2160p
                - Bluray-1080p
                - WEBRip-1080p
                - WEBDL-1080p
                - Bluray-720p
                - WEBDL-720p
                - WEBRip-720p

      custom_formats:

  ### Optional
        - trash_ids:
  #          - b6832f586342ef70d9c128d40c07b872 # Bad Dual Groups
  #          - 90cedc1fea7ea5d11298bebd3d1d3223 # EVO (no WEBDL)
  #          - ae9b7c9ebde1f3bd336a8cbd1ec4c5e5 # No-RlsGroup
  #          - 7357cf5161efbf8c4d5d0c30b4815ee2 # Obfuscated
  #          - 5c44f52a8714fdd79bb4d98e2673be1f # Retags
  #          - f537cf427b64c38c8e36298f657e4828 # Scene
          assign_scores_to:
            - name: HD Bluray + WEB (GER)

  ### Resolution Boosters
  # Uncomment any ID corresponding to resolutions you are not interested in
        - trash_ids:
            - 3bc8df3a71baaac60a31ef696ea72d36 # German 1080p Booster
            - cc7b1e64e2513a6a271090cdfafaeb55 # German 2160p Booster
            - b2be17d608fc88818940cd1833b0b24c # 720p
            - 820b09bb9acbfde9c35c71e0e565dad8 # 1080p
            - fb392fb0d61a010ae38e49ceaa24a1ef # 2160p
          assign_scores_to:
            - name: HD Bluray + WEB (GER)

  ### Generated Dynamic HDR
  # Uncomment the next 5 lines if you dont care about Generated Dynamic HDR and/or want to grab VECTOR
  #      - trash_ids:
  #          - e6886871085226c3da1830830146846c # Generated Dynamic HDR
  #        assign_scores_to:
  #          - name: HD Bluray + WEB (GER)
  #            score: 0

  ### x265 Releases
  #      - trash_ids:
  # Uncomment the next six lines to allow x265 HD releases with HDR/DV
  # Uncomment the next four lines to allow any x265 HD releases
  #          - dc98083864ea246d05a42df0d05f81cc # x265 (HD)
  #        assign_scores_to:
  #          - name: HD Bluray + WEB (GER)
  #            score: 0
  #      - trash_ids:
  #          - 839bea857ed2c0a8e084f3cbdbd65ecb # x265 (no HDR/DV)
  ```
  </details>


  <details>
    <summary>UHD Bluray + WEB</summary>

  ```yaml
  ###################################################################################################
  # Recyclarr Configuration Template: HD Bluray + WEB (GER)                                         #
  # Updated: 2024-12-28                                                                             #
  # Documentation: https://recyclarr.dev                                                            #
  # Note: If you are using multiple profiles in a single instance, please read the following        #
  # documentation about file merging:                                                               #
  # https://recyclarr.dev/wiki/yaml/config-examples/#merge-single-instance                          #
  ###################################################################################################

  # Instance Definition: https://recyclarr.dev/wiki/yaml/config-reference/basic/

  radarr:
    uhd-bluray-web-ger:
      base_url: Put your Radarr URL here
      api_key: Put your API key here

      include:
        - template: radarr-quality-definition-movie
        - template: radarr-custom-formats-uhd-bluray-web-german

      quality_profiles:
        - name: UHD Bluray + WEB (GER)
          reset_unmatched_scores:
            enabled: false
          upgrade:
            allowed: true
            until_quality: Merged QPs
            until_score: 25000
  # Uncomment one of the next 2 lines dependent on if you want English Releases
          min_format_score: 1600 # Get English Releases and Upgrade to German when available
  #        min_format_score: 10000 # Skip English Releases
          quality_sort: top
          qualities:
            - name: Merged QPs
  # Comment any qualities you are not interested in
              qualities:
                - Bluray-2160p
                - WEBDL-2160p
                - WEBRip-2160p
  #              - Bluray-1080p
  #              - WEBRip-1080p
  #              - WEBDL-1080p
  #              - Bluray-720p
  #              - WEBDL-720p
  #              - WEBRip-720p

      custom_formats:

  ### Audio
        - trash_ids:
  # Uncomment the next section to enable Advanced Audio Formats
  #          - 496f355514737f7d83bf7aa4d24f8169 # TrueHD Atmos
  #          - 2f22d89048b01681dde8afe203bf2e95 # DTS X
  #          - 417804f7f2c4308c1f4c5d380d4c4475 # ATMOS (undefined)
  #          - 1af239278386be2919e1bcee0bde047e # DD+ ATMOS
  #          - 3cafb66171b47f226146a0770576870f # TrueHD
  #          - dcf3ec6938fa32445f590a4da84256cd # DTS-HD MA
  #          - a570d4a0e56a2874b64e5bfa55202a1b # FLAC
  #          - e7c2fcae07cbada050a0af3357491d7b # PCM
  #          - 8e109e50e0a0b83a5098b056e13bf6db # DTS-HD HRA
  #          - 185f1dd7264c4562b9022d963ac37424 # DD+
  #          - f9f847ac70a0af62ea4a08280b859636 # DTS-ES
  #          - 1c1a4c5e823891c75bc50380a6866f73 # DTS
  #          - 240770601cc226190c367ef59aba7463 # AAC
  #          - c2998bd0d90ed5621d8df281e839436e # DD
          assign_scores_to:
            - name: UHD Bluray + WEB (GER)

  ### Movie Versions
        - trash_ids:
  # Uncomment any of the following lines to prefer these movie versions
  #          - 570bc9ebecd92723d2d21500f4be314c # Remaster
  #          - eca37840c13c6ef2dd0262b141a5482f # 4K Remaster
  #          - e0c07d59beb37348e975a930d5e50319 # Criterion Collection
  #          - 9d27d9d2181838f76dee150882bdc58c # Masters of Cinema
  #          - db9b4c4b53d312a3ca5f1378f6440fc9 # Vinegar Syndrome
  #          - 957d0f44b592285f26449575e8b1167e # Special Edition
  #          - eecf3a857724171f968a66cb5719e152 # IMAX
  #          - 9f6cbff8cfe4ebbc1bde14c7b7bec0de # IMAX Enhanced
          assign_scores_to:
            - name: UHD Bluray + WEB (GER)
  ### Optional
        - trash_ids:
  #          - b6832f586342ef70d9c128d40c07b872 # Bad Dual Groups
  #          - 90cedc1fea7ea5d11298bebd3d1d3223 # EVO (no WEBDL)
  #          - ae9b7c9ebde1f3bd336a8cbd1ec4c5e5 # No-RlsGroup
  #          - 7357cf5161efbf8c4d5d0c30b4815ee2 # Obfuscated
  #          - 5c44f52a8714fdd79bb4d98e2673be1f # Retags
  #          - f537cf427b64c38c8e36298f657e4828 # Scene
          assign_scores_to:
            - name: UHD Bluray + WEB (GER)

  ### Resolution Boosters
  # Comment any ID corresponding to resolutions you are not interested in
        - trash_ids:
            - 3bc8df3a71baaac60a31ef696ea72d36 # German 1080p Booster
            - cc7b1e64e2513a6a271090cdfafaeb55 # German 2160p Booster
            - b2be17d608fc88818940cd1833b0b24c # 720p
            - 820b09bb9acbfde9c35c71e0e565dad8 # 1080p
            - fb392fb0d61a010ae38e49ceaa24a1ef # 2160p
          assign_scores_to:
            - name: UHD Bluray + WEB (GER)

  ### Generated Dynamic HDR
  # Uncomment the next 5 lines if you dont care about Generated Dynamic HDR and/or want to grab VECTOR
  #      - trash_ids:
  #          - e6886871085226c3da1830830146846c # Generated Dynamic HDR
  #        assign_scores_to:
  #          - name: UHD Bluray + WEB (GER)
  #            score: 0

  ### x265 Releases
  #      - trash_ids:
  # Uncomment the next six lines to allow x265 HD releases with HDR/DV
  # Uncomment the next four lines to allow any x265 HD releases
  #          - dc98083864ea246d05a42df0d05f81cc # x265 (HD)
  #        assign_scores_to:
  #          - name: UHD Bluray + WEB (GER)
  #            score: 0
  #      - trash_ids:
  #          - 839bea857ed2c0a8e084f3cbdbd65ecb # x265 (no HDR/DV)

  ### HDR / DV
        - trash_ids:
  # Comment out the next line if you and all of your users' setups are fully DV compatible
  #          - 923b6abef9b17f937fab56cfcf89e1f1 # DV (WEBDL)

  # HDR10+ Boost - Uncomment the next two lines if any of your devices DO support HDR10+
  #          - b17886cb4158d9fea189859409975758 # HDR10Plus Boost
  #          - 55a5b50cb416dea5a50c4955896217ab # DV HDR10+ Boost
          assign_scores_to:
            - name: UHD Bluray + WEB (GER)

  ### Optional SDR
  # Only ever use ONE of the following custom formats:
  # SDR - block ALL SDR releases
  # SDR (no WEBDL) - block UHD/4k Remux and Bluray encode SDR releases, but allow SDR WEB
        - trash_ids:
  #          - 9c38ebb7384dada637be8899efa68e6f # SDR
  #          - 25c12f78430a3a23413652cbd1d48d77 # SDR (no WEBDL)
          assign_scores_to:
            - name: UHD Bluray + WEB (GER)
  ```
  </details>


  <details>
    <summary>Remux + WEB 2160p</summary>
  
  ```yaml
  ###################################################################################################
  # Recyclarr Configuration Template: HD Bluray + WEB (GER)                                         #
  # Updated: 2024-12-28                                                                             #
  # Documentation: https://recyclarr.dev                                                            #
  # Note: If you are using multiple profiles in a single instance, please read the following        #
  # documentation about file merging:                                                               #
  # https://recyclarr.dev/wiki/yaml/config-examples/#merge-single-instance                          #
  ###################################################################################################

  # Instance Definition: https://recyclarr.dev/wiki/yaml/config-reference/basic/

  radarr:
    uhd-remux-web-ger:
      base_url: Put your Radarr URL here
      api_key: Put your API key here

      include:
        - template: radarr-quality-definition-movie
        - template: radarr-custom-formats-uhd-remux-web-german

      quality_profiles:
        - name: Remux + WEB 2160p (GER)
          reset_unmatched_scores:
            enabled: false
          upgrade:
            allowed: true
            until_quality: Merged QPs
            until_score: 25000
  # Uncomment one of the next 2 lines dependent on if you want English Releases
          min_format_score: 1600 # Get English Releases and Upgrade to German when available
  #        min_format_score: 10000 # Skip English Releases
          quality_sort: top
          qualities:
            - name: Merged QPs
  # Comment any qualities you are not interested in
              qualities:
                - Remux-2160p
  #              - Bluray-2160p
                - WEBDL-2160p
                - WEBRip-2160p
  #              - Bluray-1080p
  #              - WEBRip-1080p
  #              - WEBDL-1080p
  #              - Bluray-720p
  #              - WEBDL-720p
  #              - WEBRip-720p

      custom_formats:

  ### Audio
        - trash_ids:
  # Uncomment the next section to enable Advanced Audio Formats
  #          - 496f355514737f7d83bf7aa4d24f8169 # TrueHD Atmos
  #          - 2f22d89048b01681dde8afe203bf2e95 # DTS X
  #          - 417804f7f2c4308c1f4c5d380d4c4475 # ATMOS (undefined)
  #          - 1af239278386be2919e1bcee0bde047e # DD+ ATMOS
  #          - 3cafb66171b47f226146a0770576870f # TrueHD
  #          - dcf3ec6938fa32445f590a4da84256cd # DTS-HD MA
  #          - a570d4a0e56a2874b64e5bfa55202a1b # FLAC
  #          - e7c2fcae07cbada050a0af3357491d7b # PCM
  #          - 8e109e50e0a0b83a5098b056e13bf6db # DTS-HD HRA
  #          - 185f1dd7264c4562b9022d963ac37424 # DD+
  #          - f9f847ac70a0af62ea4a08280b859636 # DTS-ES
  #          - 1c1a4c5e823891c75bc50380a6866f73 # DTS
  #          - 240770601cc226190c367ef59aba7463 # AAC
  #          - c2998bd0d90ed5621d8df281e839436e # DD
          assign_scores_to:
            - name: Remux + WEB 2160p (GER)

  ### Movie Versions
        - trash_ids:
  # Uncomment any of the following lines to prefer these movie versions
  #          - 570bc9ebecd92723d2d21500f4be314c # Remaster
  #          - eca37840c13c6ef2dd0262b141a5482f # 4K Remaster
  #          - e0c07d59beb37348e975a930d5e50319 # Criterion Collection
  #          - 9d27d9d2181838f76dee150882bdc58c # Masters of Cinema
  #          - db9b4c4b53d312a3ca5f1378f6440fc9 # Vinegar Syndrome
  #          - 957d0f44b592285f26449575e8b1167e # Special Edition
  #          - eecf3a857724171f968a66cb5719e152 # IMAX
  #          - 9f6cbff8cfe4ebbc1bde14c7b7bec0de # IMAX Enhanced
          assign_scores_to:
            - name: Remux + WEB 2160p (GER)
  ### Optional
        - trash_ids:
  #          - b6832f586342ef70d9c128d40c07b872 # Bad Dual Groups
  #          - 90cedc1fea7ea5d11298bebd3d1d3223 # EVO (no WEBDL)
  #          - ae9b7c9ebde1f3bd336a8cbd1ec4c5e5 # No-RlsGroup
  #          - 7357cf5161efbf8c4d5d0c30b4815ee2 # Obfuscated
  #          - 5c44f52a8714fdd79bb4d98e2673be1f # Retags
  #          - f537cf427b64c38c8e36298f657e4828 # Scene
          assign_scores_to:
            - name: Remux + WEB 2160p (GER)

  ### Resolution Boosters
  # Comment any ID corresponding to resolutions you are not interested in
        - trash_ids:
            - 3bc8df3a71baaac60a31ef696ea72d36 # German 1080p Booster
            - cc7b1e64e2513a6a271090cdfafaeb55 # German 2160p Booster
            - b2be17d608fc88818940cd1833b0b24c # 720p
            - 820b09bb9acbfde9c35c71e0e565dad8 # 1080p
            - fb392fb0d61a010ae38e49ceaa24a1ef # 2160p
          assign_scores_to:
            - name: Remux + WEB 2160p (GER)

  ### Generated Dynamic HDR
  # Uncomment the next 5 lines if you dont care about Generated Dynamic HDR and/or want to grab VECTOR
  #      - trash_ids:
  #          - e6886871085226c3da1830830146846c # Generated Dynamic HDR
  #        assign_scores_to:
  #          - name: Remux + WEB 2160p (GER)
  #            score: 0

  ### x265 Releases
  #      - trash_ids:
  # Uncomment the next six lines to allow x265 HD releases with HDR/DV
  # Uncomment the next four lines to allow any x265 HD releases
  #          - dc98083864ea246d05a42df0d05f81cc # x265 (HD)
  #        assign_scores_to:
  #          - name: Remux + WEB 2160p (GER)
  #            score: 0
  #      - trash_ids:
  #          - 839bea857ed2c0a8e084f3cbdbd65ecb # x265 (no HDR/DV)

  ### HDR / DV
        - trash_ids:
  # Comment out the next line if you and all of your users' setups are fully DV compatible
  #          - 923b6abef9b17f937fab56cfcf89e1f1 # DV (WEBDL)

  # HDR10+ Boost - Uncomment the next two lines if any of your devices DO support HDR10+
  #          - b17886cb4158d9fea189859409975758 # HDR10Plus Boost
  #          - 55a5b50cb416dea5a50c4955896217ab # DV HDR10+ Boost
          assign_scores_to:
            - name: Remux + WEB 2160p (GER)

  ### Optional SDR
  # Only ever use ONE of the following custom formats:
  # SDR - block ALL SDR releases
  # SDR (no WEBDL) - block UHD/4k Remux and Bluray encode SDR releases, but allow SDR WEB
        - trash_ids:
  #          - 9c38ebb7384dada637be8899efa68e6f # SDR
  #          - 25c12f78430a3a23413652cbd1d48d77 # SDR (no WEBDL)
          assign_scores_to:
            - name: Remux + WEB 2160p (GER)
  ```
  </details>

<!-- prettier-ignore-end -->
