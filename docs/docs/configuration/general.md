---
sidebar_position: 1
title: Basics
description: "Here we describe how configarr generally works and how things are done."
keywords: [general, concept, merge, order, basic]
---

# Basics

Here we try to explain how things are handled and done in configarr so you understand how and when things happen.

## Merge strategies and orderings

Because we are working with multiple files, orders, includes and more merging needs to be handled.
What kind of data sets do we have?

- TRaSH Repository (CustomFormats, QualityProfiles, QualityDefinition)
- Recyclarr Templates (QualityProfiles)
- Local Files (CustomFormats, Templates)
- Templates (CustomFormats, QualityProfiles)
- Config file (CustomFormats, QualityProfiles)

The general concept is: more precise or better closer to the main `config` the later it will be merged and takes precendence.

At the moment we have the following order:

- TRaSH
- Recyclarr templates
- Local Files
- Config file (global level)
- Config file (instance level)

And this applies for all kind of things: CustomFormats how they are loaded and probably overwritten, QualityProfiles, CustomFormat Mappings to QualityProfiles.
If we find some duplicates we will print a log message that something is overwritten or will be ignored.
If you find somethting which does not work as expected please create an issue so we can investigate and fix it.

## Folder structure {#folder-structure}

Configarr uses following folders for storing configurations, cache or data.
Some of those can be configured via configuration others via environment variables.

| Folder      | Default in container | Required | Description                                                                                                                                                                                                                                                                      |
| ----------- | -------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cfs`       | `unset`              | No       | Optional. Defines location for own custom formats in JSON format (like TRaSH-Guide uses it). Those are directly available your configuration.                                                                                                                                    |
| `templates` | `unset`              | No       | Optional. Location for your own templates to be included.                                                                                                                                                                                                                        |
| `config`    | `/app/config`        | Yes      | Specifies the path to the configuration folder containing the `config.yml` and `secrets.yml` file.                                                                                                                                                                               |
| `repos`     | `/app/repos`         | Yes      | Location for the repos which are cloned and cached (like TRaSH-Guide, Recyclarr configs). Added with `1.13.3`: Permission independent git ownership (before you had to make sure git folder matches running user in container to not get an git error like "dubious ownership"). |

## Diff Reports & Dry Run {#diff-reports}

Every run prints a **Diff Report** per configured instance, summarizing exactly what changed (or, with `DRY_RUN=true`, what _would_ change) - grouped by resource type, with the actual field-level differences instead of a generic "would update X" message. The report has the same content in dry-run and real runs, so you can always preview exactly what a real run will do first:

```bash
DRY_RUN=true configarr
```

```
=== Diff Report: RADARR / instance1 ===

QualityDefinitions (1 change)
  ~ SDTV
      minSize: 2 -> 5

QualityProfiles (1 create, 1 update)
  + ExampleProfile (new)
  ~ Remux-2160p
      minFormatScore: 0 -> 10
      language: English -> Any

==========================================
```

- `+` create, `~` update (with the changed fields listed beneath), `-` delete.
- Reordering an array without any other change (e.g. a quality profile's item order) is reported as a single reorder, not one entry per shifted position.
- Large arrays/objects in a field's before/after value are truncated to the first 5 entries (`(+N more)`) to keep the console output scannable.

### JSON output

Set `CONFIGARR_DIFF_OUTPUT_FILE` to a file path to additionally write the full run's diff report (every instance, across every \*arr type) as a single JSON document once the run completes - useful for scripting or feeding into other tooling. Console output is unaffected either way; JSON is additive.

```bash
CONFIGARR_DIFF_OUTPUT_FILE=/app/config/diff-report.json DRY_RUN=true configarr
```

```json
{
  "generatedAt": "2026-07-06T12:34:56.000Z",
  "dryRun": true,
  "instances": [{ "arrType": "RADARR", "instanceName": "instance1", "entries": [] }]
}
```
