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
- Maybe this?: https://github.com/recyclarr/recyclarr/issues/225

## Work TODOs

- [ ] Optimize types. Generated ones work for first step but not very optimal because they do not correctly represent request/response types.
- [x] Default scores from trash guide
- [x] Radarr support
- [ ] Debug logging switchable
- [ ] Improved Diff output
- [ ] Feature completion with recyclarr
- [ ] Cross references to:
  - [ ] https://github.com/PCJones/radarr-sonarr-german-dual-language
  - [ ] https://github.com/PCJones/usenet-guide
- [ ] Build docker container
- [ ] Build multi arch containers
- [ ] Add Github Actions stuff
- [ ] Improve code & tidy up lint errors
- [ ] write docs for running with container
  - [ ] Plain docker
  - [ ] Kubernetes

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
