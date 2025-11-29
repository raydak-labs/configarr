# Generic "category" Field Support

## Overview

Configarr now supports a **generic `category` field** that automatically maps to the appropriate application-specific category field (`musicCategory`, `movieCategory`, or `bookCategory`) based on which *arr application you're configuring.

## Why Use Generic Category?

### Reusable Configurations
Use the same configuration template across different *arr applications:

```yaml
# Template that works for ALL *arr apps
download_clients:
  - name: "Primary Client"
    type: "qbittorrent"
    fields:
      host: localhost
      category: primary    # Works everywhere!
```

### Less Confusion
No need to remember which application uses which field:
- ❌ "Is it `musicCategory` or `tvCategory` for Sonarr?"
- ❌ "Does Radarr use `movieCategory` or `filmCategory`?"
- ✅ "Just use `category` - it works everywhere!"

### Cleaner YAML
More intuitive and readable configuration files.

## How It Works

### Automatic Mapping

The `category` field is automatically mapped based on the *arr application:

| *arr App | `category` Maps To |
|----------|-------------------|
| Sonarr   | `musicCategory` |
| Radarr   | `movieCategory` |
| Readarr  | `bookCategory` |
| Lidarr   | `musicCategory` |
| Whisparr | `movieCategory` |

### Example

```yaml
sonarr:
  instance1:
    download_clients:
      - name: "Client"
        fields:
          category: tv-shows    # → musicCategory

radarr:
  instance1:
    download_clients:
      - name: "Client"
        fields:
          category: movies      # → movieCategory

readarr:
  instance1:
    download_clients:
      - name: "Client"
        fields:
          category: books       # → bookCategory
```

## Usage Examples

### Basic Usage

```yaml
sonarr:
  instance1:
    base_url: http://sonarr:8989
    api_key: your-key
    
    download_clients:
      - name: "qBittorrent"
        type: "qbittorrent"
        fields:
          host: localhost
          port: 8080
          category: sonarr    # Simple!
```

### Multi-Application Setup

```yaml
# Sonarr configuration
sonarr:
  tv:
    base_url: http://sonarr:8989
    api_key: sonarr-key
    download_clients:
      - name: "Shared qBit"
        type: "qbittorrent"
        fields:
          host: qbit.local
          category: tv        # → musicCategory

# Radarr configuration  
radarr:
  movies:
    base_url: http://radarr:7878
    api_key: radarr-key
    download_clients:
      - name: "Shared qBit"
        type: "qbittorrent"
        fields:
          host: qbit.local
          category: movies    # → movieCategory

# Lidarr configuration
lidarr:
  music:
    base_url: http://lidarr:8686
    api_key: lidarr-key
    download_clients:
      - name: "Shared qBit"
        type: "qbittorrent"
        fields:
          host: qbit.local
          category: music     # → musicCategory
```

### All Supported Clients

Works with **all** download client types:

**Torrent:**
```yaml
- name: "qBittorrent"
  type: "qbittorrent"
  fields:
    category: my-category

- name: "Transmission"
  type: "transmission"
  fields:
    category: my-category

- name: "Deluge"
  type: "deluge"
  fields:
    category: my-category
```

**Usenet:**
```yaml
- name: "SABnzbd"
  type: "sabnzbd"
  fields:
    category: my-category

- name: "NZBGet"
  type: "nzbget"
  fields:
    category: my-category
```

### Combined with Other Features

Works seamlessly with all other features:

```yaml
sonarr:
  instance1:
    base_url: http://sonarr:8989
    api_key: key
    
    download_clients:
      - name: "Primary"
        type: "qbittorrent"
        fields:
          category: tv          # Generic category
          use_ssl: false        # snake_case
          api_key: abc123       # snake_case
        tags:
          - "Priority"          # Tag names
          - "4K"                # Tag names
```

## All Three Forms Work

You can use any of these forms - they all work:

### 1. Generic (Recommended)
```yaml
fields:
  category: my-category
```

**Pros:**
- Works across all *arr apps
- Reusable configs
- Most intuitive

**Use when:**
- Creating templates
- Managing multiple *arr apps
- Want maximum flexibility

### 2. App-Specific (snake_case)
```yaml
# Sonarr/Lidarr
fields:
  music_category: my-category

# Radarr/Whisparr
fields:
  movie_category: my-category

# Readarr
fields:
  book_category: my-category
```

**Pros:**
- Explicit and clear
- Follows snake_case convention

**Use when:**
- App-specific configs
- Want to be explicit

### 3. App-Specific (camelCase)
```yaml
# Sonarr/Lidarr
fields:
  musicCategory: my-category

# Radarr/Whisparr
fields:
  movieCategory: my-category

# Readarr
fields:
  bookCategory: my-category
```

**Pros:**
- Backward compatible
- Matches API naming

**Use when:**
- Migrating from old configs
- Prefer camelCase

## Configuration Templates

### Template for All *arr Apps

Create one template that works everywhere:

```yaml
# template.yml
download_client_template: &default_client
  type: "qbittorrent"
  fields:
    host: qbit.local
    port: 8080
    username: admin
    password: pass
    category: "{{ app_name }}"    # Placeholder
    use_ssl: false

# Apply to all apps
sonarr:
  instance1:
    download_clients:
      - <<: *default_client
        name: "Sonarr qBit"
        fields:
          category: tv-shows      # Override

radarr:
  instance1:
    download_clients:
      - <<: *default_client
        name: "Radarr qBit"
        fields:
          category: movies        # Override

readarr:
  instance1:
    download_clients:
      - <<: *default_client
        name: "Readarr qBit"
        fields:
          category: books         # Override
```

### Multi-Instance with Categories

```yaml
sonarr:
  # Standard quality
  hd:
    download_clients:
      - name: "HD Client"
        type: "qbittorrent"
        fields:
          category: tv-hd
  
  # 4K quality
  uhd:
    download_clients:
      - name: "4K Client"
        type: "qbittorrent"
        fields:
          category: tv-4k
  
  # Anime
  anime:
    download_clients:
      - name: "Anime Client"
        type: "qbittorrent"
        fields:
          category: tv-anime
```

## Migration

### From App-Specific Fields

No migration needed! Both work:

```yaml
# Old config (still works)
fields:
  musicCategory: sonarr
  movieCategory: radarr
  bookCategory: readarr

# New config (also works)
fields:
  category: my-content
```

### Gradual Migration

Migrate one app at a time:

```yaml
# Step 1: Migrate Sonarr
sonarr:
  instance1:
    download_clients:
      - name: "Client"
        fields:
          category: tv    # ✅ Migrated

# Step 2: Keep Radarr as-is
radarr:
  instance1:
    download_clients:
      - name: "Client"
        fields:
          movieCategory: movies    # Still works

# Step 3: Migrate when ready
```

## Advanced Usage

### Dynamic Categories

```yaml
sonarr:
  instance1:
    download_clients:
      - name: "Quality-Based"
        type: "qbittorrent"
        fields:
          category: tv-{{ quality }}
```

### Per-Instance Categories

```yaml
sonarr:
  hd_instance:
    download_clients:
      - name: "Client"
        fields:
          category: sonarr-hd
  
  sd_instance:
    download_clients:
      - name: "Client"
        fields:
          category: sonarr-sd
```

## Troubleshooting

### Issue: Category Not Working

**Symptom:** Category field ignored

**Solution:** Check you're using the right *arr app. The mapping is automatic:
```yaml
# ✅ Correct
sonarr:
  instance1:
    download_clients:
      - fields:
          category: tv    # → musicCategory

# ❌ Won't work
fields:
  category: tv
  musicCategory: tv2    # Conflict!
```

### Issue: Mixed Field Names

**Symptom:** Both `category` and `musicCategory` specified

**Solution:** Pick one approach:
```yaml
# ✅ Good - Generic
fields:
  category: tv

# ✅ Good - App-specific
fields:
  music_category: tv

# ❌ Avoid - Mixed
fields:
  category: tv
  music_category: tv2    # Which one wins?
```

**Answer:** App-specific fields take precedence, but avoid mixing.

## Best Practices

### DO:
✅ Use `category` for templates
✅ Use `category` for multi-app configs
✅ Use app-specific fields when you need clarity
✅ Be consistent within each config file

### DON'T:
❌ Mix `category` with app-specific fields
❌ Use different styles in same file
❌ Use `category` if you only have one *arr app (app-specific is clearer)

## Examples by Scenario

### Scenario 1: Managing All *arr Apps

**Best approach:** Generic `category`

```yaml
download_clients:
  - name: "Shared"
    fields:
      category: content    # Works for all!
```

### Scenario 2: Only Sonarr

**Best approach:** App-specific

```yaml
download_clients:
  - name: "Sonarr Client"
    fields:
      music_category: tv-shows    # Clear and explicit
```

### Scenario 3: Mixed Environment

**Best approach:** Consistent per app

```yaml
# Sonarr - use generic
sonarr:
  download_clients:
    - fields:
        category: tv

# Radarr - use generic
radarr:
  download_clients:
    - fields:
        category: movies
```

## Summary

### Key Points

1. **`category`** automatically maps to the right field
2. **Works with all *arr apps** - Sonarr, Radarr, Readarr, Lidarr, Whisparr
3. **Fully backward compatible** - app-specific fields still work
4. **Best for templates** and multi-app configurations
5. **Combines with all features** - snake_case, tag names, etc.

### Quick Reference

```yaml
# Generic (works everywhere)
category: my-category

# Maps to:
# - Sonarr:   musicCategory
# - Radarr:   movieCategory
# - Readarr:  bookCategory
# - Lidarr:   musicCategory
# - Whisparr: movieCategory
```

### Recommended Usage

Use `category` when:
- ✅ Managing multiple *arr apps
- ✅ Creating reusable templates
- ✅ Want maximum flexibility

Use app-specific fields when:
- ✅ Only managing one *arr app
- ✅ Want explicit configuration
- ✅ Migrating existing configs

---

*Feature added in v2.2*
