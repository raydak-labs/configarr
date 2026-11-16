# Probe download client secrets before writes

Status: accepted (2026-11-13)

`update_password: true` takes precedence over `update_password_on_test_fail`. Otherwise, `calculateDiff` stays free of API calls and `resolveSecretProbes` tests stored credentials before writing only when non-secret fields match and the configuration manages a secret. Only credential rejection writes the configured secret; connectivity failures, timeouts, and server errors leave the stored secret unchanged. A non-secret update includes a configured secret, while an omitted secret remains unmanaged.

An explicit empty string is a configured value, not an omitted field. It clears the stored secret with `update_password: true`, is written with other changes or after credential rejection in test-failure mode, and is never written on update with `update_password: false`. Empty-over-empty is a no-op. Probes still run during dry runs, but writes do not.
