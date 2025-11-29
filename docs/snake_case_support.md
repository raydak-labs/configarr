# snake_case Field Names Support

## Overview

Configarr now supports **snake_case** field names in download client configurations, in addition to the traditional camelCase format. This makes your YAML configurations more consistent and easier to read.

## Why snake_case?

### Consistency with YAML Conventions
```yaml
# Top-level instance config uses snake_case
sonarr:
  instance1:
    base_url: http://sonarr:8989    # snake_case
    api_key: your-key               # snake_case
    
    # Now download client fields can too!
    download_clients:
      - name: "Client"
        fields:
          music_category: sonarr    # snake_case (consistent!)
          api_key: abc123           # snake_case
          use_ssl: false            # snake_case
```

### More Readable
```yaml
# camelCase (old style - still works)
musicCategory: sonarr
recentPriority: -100
useSsl: false

# snake_case (new style - recommended)
music_category: sonarr
recent_priority: -100
use_ssl: false
```

### Industry Standard
Most YAML configuration files in the DevOps world use snake_case:
- Docker Compose
- Kubernetes
- Ansible
- GitHub Actions
- And many more

## How It Works

### Automatic Conversion

The system automatically converts snake_case to camelCase internally:

```yaml
# You write:
music_category: sonarr

# Configarr converts to:
musicCategory: sonarr

# API receives:
{ "musicCategory": "sonarr" }
```

### Conversion Rules

Simple pattern: Replace `_X` with uppercase `X`

| snake_case | camelCase |
|------------|-----------|
| `music_category` | `musicCategory` |
| `api_key` | `apiKey` |
| `use_ssl` | `useSsl` |
| `url_base` | `urlBase` |
| `recent_priority` | `recentPriority` |
| `older_priority` | `olderPriority` |
| `nzb_folder` | `nzbFolder` |
| `watch_folder` | `watchFolder` |
| `add_paused` | `addPaused` |
| `initial_state` | `initialState` |
| `sequential_order` | `sequentialOrder` |
| `first_and_last` | `firstAndLast` |

## Common Field Mappings

### All *arr Applications

These fields work across all download clients:

```yaml
fields:
  host: localhost                # no conversion
  port: 8080                     # no conversion
  username: admin                # no conversion
  password: pass123              # no conversion
  use_ssl: false                 # use_ssl → useSsl
  url_base: /path                # url_base → urlBase
```

### Sonarr / Lidarr

```yaml
fields:
  music_category: sonarr         # music_category → musicCategory
  recent_priority: -100          # recent_priority → recentPriority
  older_priority: -100           # older_priority → olderPriority
```

### Radarr

```yaml
fields:
  movie_category: radarr         # movie_category → movieCategory
  recent_priority: -100          # recent_priority → recentPriority
  older_priority: -100           # older_priority → olderPriority
```

### Readarr

```yaml
fields:
  book_category: readarr         # book_category → bookCategory
  book_directory: /path          # book_directory → bookDirectory
```

### Whisparr

```yaml
fields:
  movie_category: whisparr       # movie_category → movieCategory
  movie_directory: /path         # movie_directory → movieDirectory
```

## Client-Specific Examples

### SABnzbd

```yaml
- name: "SABnzbd"
  type: "sabnzbd"
  fields:
    host: sabnzbd.local
    port: 8080
    api_key: your-api-key              # snake_case
    use_ssl: true                      # snake_case
    url_base: /sabnzbd                 # snake_case
    music_category: sonarr             # snake_case (or movie_category, book_category)
    recent_priority: -100              # snake_case
    older_priority: -100               # snake_case
```

### qBittorrent

```yaml
- name: "qBittorrent"
  type: "qbittorrent"
  fields:
    host: qbit.local
    port: 8080
    username: admin
    password: pass
    music_category: sonarr             # snake_case
    use_ssl: false                     # snake_case
    url_base: /qbittorrent             # snake_case
    initial_state: 0                   # snake_case (0=start, 1=force, 2=pause)
    sequential_order: false            # snake_case
    first_and_last: false              # snake_case
```

### Transmission

```yaml
- name: "Transmission"
  type: "transmission"
  fields:
    host: transmission.local
    port: 9091
    username: transmission
    password: secret
    url_base: /transmission/rpc        # snake_case
    music_category: sonarr             # snake_case
    music_directory: /downloads        # snake_case
    use_ssl: false                     # snake_case
    recent_priority: 50                # snake_case
    older_priority: 0                  # snake_case
    add_paused: false                  # snake_case
```

### NZBGet

```yaml
- name: "NZBGet"
  type: "nzbget"
  fields:
    host: nzbget.local
    port: 6789
    username: nzbget
    password: password
    music_category: sonarr             # snake_case
    recent_priority: 0                 # snake_case
    older_priority: -100               # snake_case
    add_paused: false                  # snake_case
    use_ssl: false                     # snake_case
    url_base: /nzbget                  # snake_case
```

### Deluge

```yaml
- name: "Deluge"
  type: "deluge"
  fields:
    host: deluge.local
    port: 8112
    password: deluge
    music_category: sonarr             # snake_case
    music_directory: /downloads        # snake_case (or movie_directory, book_directory)
    url_base: /deluge                  # snake_case
    use_ssl: false                     # snake_case
    add_paused: false                  # snake_case
```

### rTorrent

```yaml
- name: "rTorrent"
  type: "rtorrent"
  fields:
    host: rtorrent.local
    port: 8080
    url_path: /RPC2                    # url_path → urlPath
    username: rtorrent
    password: rtorrent
    music_category: sonarr             # snake_case
    music_directory: /downloads        # snake_case
    add_stopped: false                 # add_stopped → addStopped
```

## Backward Compatibility

### Both Styles Work

You can use either style - both are valid:

```yaml
# Style 1: snake_case (recommended)
fields:
  music_category: sonarr
  use_ssl: false
  api_key: abc123

# Style 2: camelCase (backward compatible)
fields:
  musicCategory: sonarr
  useSsl: false
  apiKey: abc123

# Style 3: Mixed (works but not recommended)
fields:
  music_category: sonarr
  useSsl: false           # Don't mix - pick one style
  apiKey: abc123
```

### Migration

**No migration needed!** Your existing configs continue to work:

```yaml
# Old config (v1.0, v2.0) - still works
download_clients:
  - name: "Client"
    fields:
      musicCategory: sonarr
      useSsl: false

# New config (v2.1+) - also works
download_clients:
  - name: "Client"
    fields:
      music_category: sonarr
      use_ssl: false
```

## Best Practices

### Choose One Style

Pick snake_case or camelCase and use it consistently:

```yaml
# ✅ Good - consistent snake_case
fields:
  music_category: sonarr
  use_ssl: false
  url_base: /path

# ✅ Good - consistent camelCase
fields:
  musicCategory: sonarr
  useSsl: false
  urlBase: /path

# ❌ Avoid - mixed styles
fields:
  music_category: sonarr
  useSsl: false
  urlBase: /path
```

### Match Instance-Level Style

For consistency, match your instance-level configuration style:

```yaml
sonarr:
  instance1:
    base_url: http://sonarr:8989      # snake_case at instance level
    api_key: your-key                 # snake_case at instance level
    
    download_clients:
      - name: "Client"
        fields:
          music_category: sonarr      # snake_case in fields (consistent!)
          use_ssl: false              # snake_case in fields
```

### snake_case Recommended

Since Configarr's instance-level config uses snake_case (`base_url`, `api_key`), we recommend using snake_case for field names too:

```yaml
# Recommended style
sonarr:
  instance1:
    base_url: http://sonarr:8989      # snake_case
    api_key: your-key                 # snake_case
    
    download_clients:
      - name: "Client"
        type: "qbittorrent"
        fields:
          host: localhost
          music_category: sonarr      # snake_case (matches above)
          use_ssl: false              # snake_case (matches above)
```

## Field Discovery

To find available fields for each client type:

1. **Check the schema:**
   ```bash
   curl http://sonarr:8989/api/v3/downloadclient/schema?apikey=YOUR_KEY | jq
   ```

2. **Look at the `fields` array** in the response

3. **Convert camelCase names to snake_case:**
   - `musicCategory` → `music_category`
   - `useSsl` → `use_ssl`
   - `recentPriority` → `recent_priority`

## Examples by Application

### Sonarr Complete Example

```yaml
sonarr:
  tv_shows:
    base_url: http://sonarr:8989
    api_key: sonarr-key
    
    download_clients:
      - name: "SABnzbd TV"
        type: "sabnzbd"
        priority: 1
        fields:
          host: sabnzbd.local
          port: 8080
          api_key: sabnzbd-key
          use_ssl: true
          url_base: /sabnzbd
          music_category: tv
          recent_priority: -100
          older_priority: -100
        tags:
          - "TV Shows"
          - "Usenet"
      
      - name: "qBit TV"
        type: "qbittorrent"
        priority: 2
        fields:
          host: qbit.local
          port: 8080
          username: admin
          password: pass
          music_category: tv
          use_ssl: false
          initial_state: 0
        tags:
          - "TV Shows"
          - "Torrent"
```

### Radarr Complete Example

```yaml
radarr:
  movies:
    base_url: http://radarr:7878
    api_key: radarr-key
    
    download_clients:
      - name: "SABnzbd Movies"
        type: "sabnzbd"
        fields:
          host: sabnzbd.local
          api_key: sabnzbd-key
          movie_category: movies        # Radarr uses movie_category
          recent_priority: -100
          older_priority: -100
          use_ssl: true
        tags: ["Movies", "4K"]
```

### Multi-Application Example

```yaml
sonarr:
  instance1:
    base_url: http://sonarr:8989
    api_key: key1
    download_clients:
      - name: "Shared qBit"
        type: "qbittorrent"
        fields:
          music_category: sonarr        # Sonarr category
          use_ssl: false

radarr:
  instance1:
    base_url: http://radarr:7878
    api_key: key2
    download_clients:
      - name: "Shared qBit"
        type: "qbittorrent"
        fields:
          movie_category: radarr        # Radarr category
          use_ssl: false

readarr:
  instance1:
    base_url: http://readarr:8787
    api_key: key3
    download_clients:
      - name: "Shared qBit"
        type: "qbittorrent"
        fields:
          book_category: readarr        # Readarr category
          use_ssl: false
```

## Troubleshooting

### Field Not Working?

If a snake_case field doesn't work:

1. **Check the camelCase equivalent** in the API schema
2. **Verify the conversion** is correct
3. **Enable debug logging:**
   ```bash
   LOG_LEVEL=debug npm start
   ```

### Common Issues

**Issue:** Field ignored
```yaml
fields:
  Music_Category: sonarr    # ❌ Wrong - capital C
```

**Solution:** Use all lowercase with underscores
```yaml
fields:
  music_category: sonarr    # ✅ Correct
```

**Issue:** Field not found in schema
```yaml
fields:
  some_random_field: value  # Field doesn't exist
```

**Solution:** Check schema for available fields

## Summary

- ✅ snake_case supported for all download client fields
- ✅ Automatic conversion to camelCase
- ✅ 100% backward compatible
- ✅ Recommended for YAML consistency
- ✅ Works with all client types
- ✅ No migration required

**Recommendation:** Use snake_case for new configurations to match YAML conventions and instance-level config style.

---

*Feature added in v2.1*
