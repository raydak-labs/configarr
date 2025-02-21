---
sidebar_position: 1
title: Basics
description: "Here we describe how configarr generally works and how things are done."
keywords: [general, concept, merge, order, basic]
---

# Basics

Here we try to explain how things are handled and done in configarr so you understand how and when things happen.

:::tip
Page under development.
:::

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
- Local Files
- Recyclarr Templates / Templates
- Config file

And this applies for all kind of things: CustomFormats how they are loaded and probably overwritten, QualityProfiles, CustomFormat Mappings to QualityProfiles.
If we find some duplicates we will print a log message that something is overwritten or will be ignored.
If you find somethting which does not work as expected please create an issue so we can investigate and fix it.

## Folder structure {#folder-structure}

Configarr uses following folders for storing configurations, cache or data.
Some of those can be configured via configuration others via environment variables.

| Folder      | Default in container | Required | Description                                                                                                                                   |
| ----------- | -------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `cfs`       | `unset`              | No       | Optional. Defines location for own custom formats in JSON format (like TRaSH-Guide uses it). Those are directly available your configuration. |
| `templates` | `unset`              | No       | Optional. Location for your own templates to be included.                                                                                     |
| `config`    | `/app/config`        | Yes      | Specifies the path to the configuration folder containing the `config.yml` and `secrets.yml` file.                                            |
| `repos`     | `/app/repos`         | Yes      | Location for the repos which are cloned and cached (like TRaSH-Guide, Recyclarr configs)                                                      |
