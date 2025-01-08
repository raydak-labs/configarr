---
sidebar_position: 1
title: Configuration general
description: "Here we describe how configarr generally works and how things are done."
keywords: [general, concept, merge, order]
---

# General

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
