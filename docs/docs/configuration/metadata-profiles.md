---
sidebar_position: 5
title: Metadata Profiles
description: "Configure and manage metadata profiles for Lidarr and Readarr"
keywords: [configarr, metadata profiles, lidarr, readarr, configuration]
---

# Metadata Profiles

:::info
Metadata profiles are supported for **Lidarr** and **Readarr** since v1.18.0.
:::

Metadata profiles allow you to configure filtering rules for metadata in your media libraries. Each application type has different metadata profile fields.

## Readarr Metadata Profiles

Readarr metadata profiles control which books are accepted based on various criteria.

### Configuration Fields

All field names support both `snake_case` (recommended) and `camelCase` formats for backward compatibility.

| Field (snake_case) | Field (camelCase) | Type | Description |
|-------------------|-------------------|------|-------------|
| `name` | `name` | string | **Required.** Profile name (must be unique) |
| `min_popularity` | `minPopularity` | number | Minimum popularity score for books |
| `skip_missing_date` | `skipMissingDate` | boolean | Skip books with missing publication dates |
| `skip_missing_isbn` | `skipMissingIsbn` | boolean | Skip books with missing ISBN |
| `skip_parts_and_sets` | `skipPartsAndSets` | boolean | Skip books that are part of a set |
| `skip_secondary_series` | `skipSeriesSecondary` | boolean | Skip secondary series books |
| `allowed_languages` | `allowedLanguages` | array | List of allowed language codes (e.g., `["english", "german", null]`) |
| `min_pages` | `minPages` | number | Minimum number of pages |
| `must_not_contain` | `ignored` | array | List of strings that book titles must NOT contain |

### Example Configuration

```yaml title="config.yml"
readarr:
  instance1:
    base_url: http://readarr:8787
    api_key: !secret READARR_API_KEY

    metadata_profiles:
      - name: "eBooks"
        min_popularity: 10
        skip_missing_date: true
        skip_missing_isbn: false
        skip_parts_and_sets: false
        skip_secondary_series: false
        allowed_languages:
          - english
          - german
          - null  # Allow books with no language specified
        min_pages: 50
        must_not_contain:
          - "Abridged"
          - "Large Print"

      - name: "Audiobooks"
        min_popularity: 5
        skip_missing_date: false
        allowed_languages:
          - english
```

### Legacy camelCase Format

Both formats work simultaneously (snake_case takes precedence):

```yaml
# ✅ Modern format (recommended)
metadata_profiles:
  - name: "Standard"
    min_popularity: 10
    skip_missing_date: true
    must_not_contain: ["Abridged"]

# ✅ Legacy format (still supported)
metadata_profiles:
  - name: "Standard"
    minPopularity: 10
    skipMissingDate: true
    ignored: ["Abridged"]
```

## Lidarr Metadata Profiles

Lidarr metadata profiles control which album types, secondary types, and release statuses are included.

### Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | **Required.** Profile name (must be unique) |
| `primary_types` | array | List of primary album types (Album, EP, Single, etc.) |
| `secondary_types` | array | List of secondary album types (Studio, Live, Compilation, etc.) |
| `release_statuses` | array | List of release statuses (Official, Bootleg, Promotion, etc.) |

Each item in `primary_types`, `secondary_types`, and `release_statuses` has:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Type/status name (fetched from Lidarr schema) |
| `enabled` | boolean | Whether this type/status is enabled |

### Example Configuration

```yaml title="config.yml"
lidarr:
  instance1:
    base_url: http://lidarr:8686
    api_key: !secret LIDARR_API_KEY

    metadata_profiles:
      - name: "Latest Releases"
        primary_types:
          - name: Album
            enabled: true
          - name: EP
            enabled: true
          - name: Single
            enabled: false
          - name: Broadcast
            enabled: false
        
        secondary_types:
          - name: Studio
            enabled: true
          - name: Live
            enabled: false
          - name: Compilation
            enabled: true
          - name: Soundtrack
            enabled: true
        
        release_statuses:
          - name: Official
            enabled: true
          - name: Promotion
            enabled: false
          - name: Bootleg
            enabled: false
          - name: Pseudo-Release
            enabled: false
```

### Dynamic Schema Fetching

Lidarr metadata profiles use **dynamic schema fetching** to ensure compatibility:

- Album types, secondary types, and release statuses are fetched from Lidarr's API
- No hardcoded IDs - works with all Lidarr versions
- Automatically discovers new types added in future versions
- Prevents "ID does not match" errors

## Delete Unmanaged Profiles

You can automatically delete metadata profiles that exist on the server but are not defined in your configuration.

### Basic Syntax

```yaml
# Simple boolean form
delete_unmanaged_metadata_profiles: true

# Full form with ignore list
delete_unmanaged_metadata_profiles:
  enabled: true
  ignore:
    - DefaultProfile
    - LegacyProfile
```

### Ignore List Formats

Both inline and array formats are supported:

```yaml
# ✅ Array format (more readable)
delete_unmanaged_metadata_profiles:
  enabled: true
  ignore:
    - Profile1
    - Profile2
    - Profile3

# ✅ Inline format (compact)
delete_unmanaged_metadata_profiles:
  enabled: true
  ignore: ["Profile1", "Profile2", "Profile3"]
```

### Built-in Protection

The `None` profile is **always** protected from deletion, even if not in the ignore list.

### Examples

**Example 1: Delete all unmanaged profiles**
```yaml
readarr:
  instance1:
    metadata_profiles:
      - name: "Standard"
    
    delete_unmanaged_metadata_profiles: true
```
Result: All profiles except "Standard" and "None" will be deleted.

**Example 2: Protect specific profiles**
```yaml
lidarr:
  instance1:
    metadata_profiles:
      - name: "Latest"
    
    delete_unmanaged_metadata_profiles:
      enabled: true
      ignore:
        - Legacy
        - Custom
```
Result: Profiles "Latest", "Legacy", "Custom", and "None" are kept. Others deleted.

**Example 3: Disabled deletion**
```yaml
readarr:
  instance1:
    metadata_profiles:
      - name: "Standard"
    
    delete_unmanaged_metadata_profiles: false
```
Result: No profiles are deleted.

## Templates and Inheritance

Metadata profiles can be defined in templates and merged with instance configurations.

### Template Example

```yaml title="custom-templates/readarr.yml"
metadata_profiles:
  - name: "Standard"
    min_popularity: 10
    skip_missing_date: true
    must_not_contain:
      - "Abridged"

delete_unmanaged_metadata_profiles:
  enabled: true
  ignore:
    - None
```

### Instance Configuration

```yaml title="config.yml"
readarr:
  instance1:
    include:
      - template: readarr
    
    # This profile merges with template profiles
    metadata_profiles:
      - name: "Audiobooks"
        min_popularity: 5
    
    # This overrides template deletion setting
    delete_unmanaged_metadata_profiles:
      enabled: true
      ignore:
        - Legacy  # Merges with template's ignore list
```

**Result:** Instance has both "Standard" (from template) and "Audiobooks" (from instance). Ignore list combines to `["None", "Legacy"]`.

### Merging Behavior

1. **Profiles**: Template and instance profiles are **merged by name**
   - If instance defines a profile with same name as template, instance wins
   - Otherwise, both profiles exist

2. **Delete Setting**: Instance **overrides** template
   - Ignore lists from template and instance are **combined**
   - Boolean form in instance preserves template's ignore list

3. **Boolean Shorthand**: Preserves template ignore list
   ```yaml
   # Template
   delete_unmanaged_metadata_profiles:
     enabled: true
     ignore: ["Profile1"]
   
   # Instance
   delete_unmanaged_metadata_profiles: true  # Boolean!
   
   # Result: ignore: ["Profile1"] is preserved ✅
   ```

## Error Handling

### In-Use Profiles

When a profile cannot be deleted because it's in use:

```
INFO: Metadata profile "Standard" is in use and could not be deleted.
```

This is informational only - the profile remains and other operations continue.

### Partial Failures

If some profiles succeed and others fail:

```
INFO: Deleted MetadataProfile: 'OldProfile'
INFO: Metadata profile "InUse" is in use and could not be deleted.
WARN: Could not delete 1 MetadataProfile(s). Check DEBUG logs for details.
```

### Complete Failures

If all deletions fail and no other operations succeeded:

```
ERROR: Failed deleting 2 MetadataProfile(s). Check DEBUG logs and Arr logs for details.
```

Enable debug logging for detailed error information:
```bash
LOG_LEVEL=debug npm start
```

## Best Practices

### 1. Use snake_case for Readarr

```yaml
# ✅ Recommended
metadata_profiles:
  - name: "Standard"
    min_popularity: 10
    skip_missing_date: true
    must_not_contain: ["Abridged"]

# ❌ Legacy (works but not recommended)
metadata_profiles:
  - name: "Standard"
    minPopularity: 10
    skipMissingDate: true
    ignored: ["Abridged"]
```

### 2. Use Templates for Shared Profiles

Define common profiles once in templates, override per-instance as needed.

### 3. Use Array Format for Ignore Lists

```yaml
# ✅ More readable
ignore:
  - Profile1
  - Profile2

# ❌ Less readable
ignore: ["Profile1", "Profile2"]
```

### 4. Be Explicit About Deletion

Always specify the ignore list if you enable deletion:

```yaml
# ✅ Clear intent
delete_unmanaged_metadata_profiles:
  enabled: true
  ignore:
    - Legacy
    - Custom

# ⚠️ Will delete everything except config and None
delete_unmanaged_metadata_profiles: true
```

### 5. Test with Dry Run First

```bash
DRY_RUN=true npm start
```

Check logs to see what would be deleted before actually deleting.

## Troubleshooting

### Profiles Not Updating

If changes aren't detected:

1. Check profile name matches exactly (case-sensitive)
2. Verify values are actually different from server
3. Enable debug logging: `LOG_LEVEL=debug`
4. Look for: `MetadataProfiles diff result: Create: X, Update: Y`

### Profiles Not Being Deleted

If profiles aren't deleted when expected:

1. Check if profile is in ignore list
2. Verify `delete_unmanaged_metadata_profiles` is enabled
3. Check if profile is in use (shows INFO message)
4. Enable debug logging to see filtering: `DEBUG: Profiles to delete after filtering: ...`

### "ID does not match" Errors (Lidarr)

This should not happen with v1.18.0+ as IDs are fetched dynamically. If you see this:

1. Ensure you're using the latest version
2. Check Lidarr API is accessible
3. Enable debug logging to see schema fetch: `DEBUG: Loaded Lidarr metadata profile schema: ...`

## Migration Guide

### From No Metadata Profiles

If you're adding metadata profiles for the first time:

1. **Check existing profiles** in Lidarr/Readarr UI
2. **Add to config** the profiles you want to keep
3. **Enable deletion** if you want to remove others:
   ```yaml
   delete_unmanaged_metadata_profiles:
     enabled: true
     ignore:
       - ProfileToKeep1
       - ProfileToKeep2
   ```
4. **Test with dry run**: `DRY_RUN=true npm start`
5. **Review logs** carefully before running for real

### From camelCase to snake_case (Readarr)

Both formats work, so you can migrate incrementally:

```yaml
# Before
metadata_profiles:
  - name: "Standard"
    minPopularity: 10
    skipMissingDate: true

# After (both formats work together)
metadata_profiles:
  - name: "Standard"
    min_popularity: 10      # snake_case preferred
    skip_missing_date: true # snake_case preferred
    minPopularity: 5        # Ignored (snake_case takes precedence)
```

## See Also

- [Experimental Support](/docs/configuration/experimental-support) - Lidarr and Readarr configuration
- [Configuration File Reference](/docs/configuration/config-file) - Complete config file documentation
- [Templates](https://github.com/raydak-labs/configarr/tree/master/examples) - Example template configurations