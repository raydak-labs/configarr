---
sidebar_position: 2
description: "Basic concepts and terminology for understanding Sonarr, Radarr, and custom formats"
keywords: [sonarr, radarr, custom formats, quality profiles, media management, automation]
---

# What are Arr Applications?

This page explains the fundamental concepts and components that Configarr works with. Understanding these will help you make the most of the tool.

## Media Managers

### Sonarr

[Sonarr](https://sonarr.tv/) is a TV series management tool that automates the downloading and organizing of TV shows. It can monitor multiple RSS feeds for new episodes and will grab, sort, and rename them.

### Radarr

[Radarr](https://radarr.video/) is a movie collection manager that works similarly to Sonarr but focuses on movies instead of TV series. It's designed to automatically download and organize movie files.

## Key Terminology

### Custom Formats

Custom formats are rules that help Sonarr and Radarr identify and prioritize specific characteristics of media files. These can include:

- Video quality (HDR, DV, etc.)
- Audio formats (DTS, TrueHD, etc.)
- Release groups
- Language specifications
- Encoding settings

### Quality Profiles

Quality profiles define what types of releases you want for your media. They combine:

- Allowed quality types (1080p, 2160p, etc.)
- Custom format scores
- Upgrade rules
- Minimum/maximum size requirements

### Release Groups

Release groups are teams or individuals who release media content. Different groups often have different standards and specialties for their releases.

### TRaSH-Guides

[TRaSH-Guides](https://trash-guides.info/) is a comprehensive collection of guides and configurations for various media management tools. It provides recommended settings, custom formats, and quality profiles that represent community best practices.

## How They Work Together

- **Quality Profiles** use **Custom Formats** to score and select releases
- **Sonarr/Radarr** use these profiles to make download decisions
- **TRaSH-Guides** provides optimized configurations for both
- **Configarr** helps manage and synchronize all these components

:::tip
For detailed setup instructions and tutorials, visit the official documentation for [Sonarr](https://wiki.servarr.com/sonarr) and [Radarr](https://wiki.servarr.com/radarr).
:::
