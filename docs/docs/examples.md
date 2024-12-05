---
sidebar_position: 3
description: "Examples of Configarr usage and configuration"
keywords: [configarr, examples, configuration, sonarr, radarr]
---

# Examples

## Full Example

A complete example demonstrating all Configarr features is available in our GitHub repository. This example includes:

- Docker Compose configuration
- Complete Sonarr and Radarr setup
- Custom format configurations
- Quality profile settings
- Template usage

You can find the full example at: [configarr/examples/full](https://github.com/raydak-labs/configarr/tree/main/examples/full)

### Quick Start with the Full Example

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

### Access Points

Once running, you can access the services at:

- Sonarr: http://localhost:6500
- Radarr: http://localhost:6501
- other instances check `docker-compose.yml`

### Cleanup

To remove all containers and volumes:

```bash
docker-compose down -v
```

## Adjusting provided templates by TrashGuide/Recyclarr

It is a common use case to use existing templates from TrashGuide or Recyclarr and modify them with either own scores or own additional custom formats.
We can easily do this with Configarr because we support both use cases and can add own custom formats when needed.

```yaml
# We define a new custom format we need (can also be done via file)
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
      # We use existing templates from recyclarr as base
      - template: sonarr-quality-definition-series
      - template: sonarr-v4-quality-profile-web-1080p
      - template: sonarr-v4-custom-formats-web-1080p

      # HINT: if you want to use trash guides own templates you can use them too
      #- template: d1498e7d189fbe6c7110ceaabb7473e6
      #  source: TRASH # RECYCLARR (default) or TRASH

    # Now you can adjust the custom formats as wanted per profile
    custom_formats:
      - trash_ids:
          - example-in-config-cf
        quality_profiles:
          - name: WEB-1080p # name must match with given profiles (found in recyclarr or trashguide)
            # score: 0 # Uncomment this line to add custom scoring

      # Overwrite existing scores
      - trash_ids:
          - e6258996055b9fbab7e9cb2f75819294 # WEB Tier 01
        quality_profiles:
          - name: WEB-1080p # name must match with given profiles (found in recyclarr or trashguide)
            score: 123
```

## Using templates from TrashGuide/Recyclarr but different names

This is currently not possible.
What you can do is copy those templates and paste it locally mounted folder.
Than you can rename those in the templates as required.

Possible feature request. Those are currently in evualition if usable and suitable:

- rename [#114](https://github.com/raydak-labs/configarr/issues/114)
- clone [#115](https://github.com/raydak-labs/configarr/issues/115).

```yaml
# The path in the container for your templates for copy&paste templates with slight modifications in the files.
localConfigTemplatesPath: /app/templates

sonarr:
  instance1:
    base_url: !secret sonarr_url
    api_key: !secret sonarr_apikey

    include:
      # assuming we copied 3 templates for quality defintion, profile and formats to those files names (file ending .yml)
      - template: my-local-quality-definition-series
      - template: my-local-quality-profile
      - template: my-local-custom-formats

      # HINT: if you want to use trash guides own templates you can use them too
      #- template: d1498e7d189fbe6c7110ceaabb7473e6
      #  source: TRASH # RECYCLARR (default) or TRASH

    # Now you can adjust the custom formats as wanted per profile
    custom_formats:
      # Overwrite existing scores
      - trash_ids:
          - e6258996055b9fbab7e9cb2f75819294 # WEB Tier 01
        quality_profiles:
          - name: MyLocalProfile # name must match with given profiles (found in recyclarr or trashguide)
            score: 123
```
