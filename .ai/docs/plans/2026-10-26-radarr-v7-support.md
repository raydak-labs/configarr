# Radarr v7 implementation plan

[Design](../specs/2026-10-26-radarr-v7-support-design.md)

1. Pin and regenerate the Radarr API v3 client from v7.0.0.10815.
2. Exercise actual HTTP request serialization and 201/202/empty delete responses.
3. Add separate v5/v7 fixtures alongside v6 and rerun the existing full feature suite
   sequentially, with server-major assertions and Radarr-only global setup.
4. Update support docs and agent guidance while preserving existing YAML and clients.
5. Run build, unit tests, formatting, typecheck and the live Radarr matrix; review and
   create a PR with evidence and any remaining limitations.
