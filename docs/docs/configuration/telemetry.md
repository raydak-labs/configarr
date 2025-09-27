---
sidebar_position: 5
title: Telemetry
description: "Learn about Configarr's anonymous telemetry and how it helps improve the project."
keywords: [telemetry, analytics, privacy, opt-in, feature usage]
---

import Admonition from "@theme/Admonition";

# Telemetry <span className="theme-doc-version-badge badge badge--secondary configarr-badge">1.16.0</span>

Configarr includes an **optional, anonymous telemetry system** that helps us understand how the application is being used. This data allows us to make better decisions about feature development, bug fixes, and overall project direction.

<Admonition type="info" title="Privacy First">
  **Telemetry is completely disabled by default.** You must explicitly opt-in to participate. No data is collected unless you enable it.
</Admonition>

## What Data Is Collected?

<Admonition type="info" title="Help Improve Configarr">
  If you're enjoying Configarr and want to help make it even better, please consider enabling telemetry. Your participation helps ensure the project continues to evolve in ways that benefit the community! 🙏
</Admonition>

When enabled, Configarr collects **anonymous, aggregated usage statistics** that include:

### Feature Usage

- Which Arr applications are being configured (Sonarr, Radarr, etc.)
- Which features are actively used:
  - Custom format groups and scoring
  - Quality definitions and profiles
  - Media management and naming settings
  - Delay profiles and root folder management
  - Template sources (Recyclarr vs TRaSH-Guide vs local)

### Instance Statistics

- Number of configured instances per Arr type
- Whether instances are enabled or disabled
- Template usage counts by source

### Technical Information

- Configarr version number
- No personal information, API keys, or configuration details

<Admonition type="warning" title="What We DON'T Collect">
  - **No personal data**: usernames, emails, IP addresses, or any identifying information
  - **No configuration details**: API keys, server URLs, custom format names, or file paths
  - **No sensitive data**: passwords, secrets, or any configuration values
  - **No usage patterns**: when you run Configarr or how often
</Admonition>

## Why Telemetry?

Telemetry helps us:

1. **Prioritize development** - Understand which features are most valuable to users
2. **Identify issues** - Detect problems with specific configurations or features
3. **Guide decisions** - Make informed choices about new features and improvements
4. **Improve stability** - Focus testing and bug fixes on commonly used features

## How to Enable Telemetry

### Option 1: Config File (Recommended)

Add the following to your `config.yml`:

```yaml
# Enable anonymous telemetry to help improve Configarr
telemetry: true
```

### Option 2: Environment Variable

Set the environment variable:

```bash
export TELEMETRY_ENABLED=true
```

<Admonition type="tip" title="Precedence">
  The environment variable `TELEMETRY_ENABLED` takes precedence over the config file setting if both are specified.
</Admonition>

## How It Works

- Data is sent **anonymously** to our analytics service
- Collection happens **once per run** after configuration parsing
- Uses industry-standard privacy practices
- When enabled, you'll see a log message: `"Telemetry enabled - Thank you for helping improve Configarr!"`
- You can disable it at any time by removing the setting

## Example Configuration

```yaml title="config.yml"
# Your normal configuration
sonarr:
  instance1:
    base_url: http://sonarr:8989
    api_key: !secret SONARR_API_KEY

# Enable telemetry (optional)
telemetry: true
```

## Opting Out

Telemetry is **disabled by default**. If you have it enabled and want to disable it:

- Remove `telemetry: true` from your config file, or
- Set `telemetry: false`, or
- Remove/unset the `TELEMETRY_ENABLED` environment variable

## Questions?

If you have questions about telemetry or privacy:

- Check our [FAQ](../faq.md) for common questions
- Review the [source code](https://github.com/raydak-labs/configarr/tree/main/src/telemetry.ts) to see exactly what data is collected
- Open an issue on [GitHub](https://github.com/raydak-labs/configarr/issues) if you have concerns

---
