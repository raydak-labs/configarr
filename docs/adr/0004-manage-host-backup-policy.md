# Manage host backup policy on every *arr version

Status: accepted (2026-11-16)

`host_config` manages `backup_folder`, `backup_interval` and `backup_retention` on every *arr. The Radarr v7 / Sonarr v5 version gate applies only when the block contains authentication, OIDC or TLS settings, because backup settings exist on every supported API version while those authentication settings do not. Backup-only config therefore works on Radarr v5/v6 and Sonarr v4 as well as the newer versions.

Apps use the oldest endpoint that exposes these settings: `/api/v1/config/host` for Lidarr, Readarr and Prowlarr, `/api/v3/config/host` for Radarr, Sonarr v4 and Whisparr, and `/api/v5/settings/general` for Sonarr v5. Apps without authentication settings (Lidarr, Readarr, Prowlarr) accept the backup fields and reject the authentication ones instead of silently ignoring them.

`backup_folder` may be relative to the app data directory or an absolute path on the server; relative paths are the common case. The schema enforces a minimum of one day; each server validates its own upper bound (current versions accept up to 7 days for `backup_interval` and 90 for `backup_retention`). Versions that expose `allowedHosts` reject a host-settings write when authentication is not `enabled` and the list is empty, even for a backup-only change, so such an instance must set `allowedHosts` (or enable authentication) first; Sonarr v4 has no such field.
