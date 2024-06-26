# Configarr

Configuration and synchronization tool for Sonarr and Radarr.

Supporting only Sonarr v4 and radarr v4.

This will be a project similar to [Recyclarr](https://github.com/recyclarr/recyclarr) or [Notifiarr](https://notifiarr.wiki/) but support for additional specification and not only what [TrashGuides](https://trash-guides.info/) offer.

This is in very early development and trial stage to see if this is something we want to offer or not.

> :warning: **This is in very early development and trial stage to see if this is something we want to offer or not.**

Possible ideas:

- keep support for syncing trash guides
  - I like the possible configuration in recyclarr but I miss some features
- add support for local configuration to include
  - I don't want to fork a project to add custom things to it
- Maybe an free GUI to sync your stuff
- Add additional best configuration for different languages/countries like Germany
- Define CustomFormats directly in configuration maybe something like (directly translated JSON -> YAML?)
  Not sure if useful if we already have to capability to provide own formats via JSON folder (additional those JSON are directly compatible with UI Import)
  ```yaml
  customFormats:
  - name: NewCF
    score: 125
    includeCustomFormatWhenRenaming: false
    specifications:
    - name: Size
      implementation: SizeSpecification
      negate: false
      required: true
      fields:
        min: 1
        max: 9
  ```

## Features

- Use TrashGuide defined custom formats
- Compatible with recyclarr templates
- Include own defined custom formats
- Custom defined formats for different languages/countries like Germany
- Support all CustomFormat specifications
- Provide CFs in different ways
  - Sync from TrashGuide
  - Sync with local file CFs
  - Provide CFs directly in config (Convert JSON with https://www.bairesdev.com/tools/json2yaml/)
  - Merge order is `TrashGuide -> LocalFiles -> CFs in Config`

## Work TODOs

- [ ] Optimize types. Generated ones work for first step but not very optimal because they do not correctly represent request/response types.
- [x] Default scores from trash guide
- [x] Radarr support
- [x] Debug logging switchable
- [x] Improved Diff output
- [ ] Feature completion with recyclarr
- [x] Cross references to:
  - [x] https://github.com/PCJones/radarr-sonarr-german-dual-language
  - [x] https://github.com/PCJones/usenet-guide
- [x] Build docker container
- [x] Build multi arch containers
- [x] Add Github Actions stuff
- [x] Improve code & tidy up lint errors
- [x] write docs for running with container
  - [x] Plain docker
  - [x] Kubernetes
- [ ] Simple Config validation
- [x] Local recyclarr templates to include
- [ ] Clone existing templates: Lets say you want the same template but with a different name?

## Custom formats

This repository also provide additional custom formats what TrashGuide does not offer.
At the moment this is mostly focused on German related stuff.

- Most CustomFormats used from @PCJones
  - See here: https://github.com/PCJones/radarr-sonarr-german-dual-language
  - Or good german guide: https://github.com/PCJones/usenet-guide

### How to add own CustomFormats

- You can simply use the JSON export from Sonarr/Radarr
- What you have to add at least is to the field `trash_id` or `configarr_id` to the JSON.
  The ID can be anything you like but should not conflict with other CustomFormats.
  Otherwise those will be overwritten during merge process.
```json
{
  "configarr_id": "your_own_id",
  ...
}
```
- After adding the ID you can simply reference it in the `config.yml` to add it to the QualityProfiles.

## Development

1. Optionally setup the local sonarr instance
   1. Run `docker compose up -d` to run the container
   2. Open sonarr in your browser at http://localhost:8989 / radarr @ http://localhost:7878
   3. Configure basic authentication, disable local authentication and create an initial user by specifying the e-mail and password
2. Open the sonarr [Settings > General](http://localhost:8989/settings/general) page and copy the API key
3. Create a `secrets.yml` from the template
   1. `cp secrets.yml.template secrets.yml`
   2. Replace the placeholder with your sonarr API key
4. Create a `config.yml` from the template
   1. `cp config.yml.template config.yml`
   2. Overwrite the hosts in case you are not using the local setup with docker compose
5. Run the app with `pnpm start` or with the vscode task

## Examples

Some examples for configuration are provided [Examples](./examples/)

## How to run

Required files:
- `config.yml`
- `secrets.yml`

Optional:
- Custom Formats in folders

### Docker

`docker run --rm -v ./:/app/config ghcr.io/raydak-labs/configarr:latest`

### Docker-compose

```yml

services:
  configarr:
    image: ghcr.io/raydak-labs/configarr:latest

    volumes:
      - ./config:/app/config # Contains the config.yml and secrets.yml
      - ./dockerrepos:/app/repos # Cache repositories
      - ./custom/cfs:/app/cfs # Optional if custom formats locally provided
      - ./custom/templates:/app/templates # Optional if custom templates
```

### Kubernetes

Example how to run `CronJob` which will regulary sync your configs.

```yml
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: configarr
spec:
  schedule: "0 * * * *"
  successfulJobsHistoryLimit: 1
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: configarr
              image: ghcr.io/raydak-labs/configarr:latest
              imagePullPolicy: Always
              envFrom:
                - configMapRef:
                    name: common-deployment-environment
              volumeMounts:
                - mountPath: /app/repos # Cache repositories
                  name: app-data
                  subPath: configarr-repos
                - name: config-volume # Mount specifc config
                  mountPath: /app/config/config.yml
                  subPath: config.yml
                - name: secret-volume
                  mountPath: /app/config/secrets.yml # Mount secrets
                  subPath: secrets.yml
          volumes:
            - name: app-data
              persistentVolumeClaim:
                claimName: media-app-data
            - name: config-volume
              configMap:
                name: configarr
            - name: secret-volume
              secret:
                secretName: configarr
          restartPolicy: Never
---
apiVersion: v1
kind: Secret
metadata:
  name: configarr
type: Opaque
stringData:
  secrets.yml: |
    SONARR_API_KEY: "{{ configarr.sonarrApiKey }}"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: configarr
data:
  config.yml: |
    trashGuideUrl: https://github.com/TRaSH-Guides/Guides
    recyclarrConfigUrl: https://github.com/recyclarr/config-templates

    sonarr:
      series:
        # Set the URL/API Key to your actual instance
        base_url: http://sonarr:8989
        api_key: !secret SONARR_API_KEY

        # Quality definitions from the guide to sync to Sonarr. Choices: series, anime
        quality_definition:
          type: series

        include:
          # Comment out any of the following includes to disable them
          #### WEB-1080p
          - template: sonarr-quality-definition-series
          - template: sonarr-v4-quality-profile-web-1080p
          - template: sonarr-v4-custom-formats-web-1080p

          #### WEB-2160p
          - template: sonarr-v4-quality-profile-web-2160p
          - template: sonarr-v4-custom-formats-web-2160p

        # Custom Formats: https://recyclarr.dev/wiki/yaml/config-reference/custom-formats/
        custom_formats: []
    radarr: {}
```
