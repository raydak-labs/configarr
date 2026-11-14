# Download client secret test order

Status: implemented (2026-11-13)

Plan: [2026-11-13-download-client-secret-test-order](../plans/2026-11-13-download-client-secret-test-order.md)

## Problem

`update_password_on_test_fail` had three issues:

- A client whose non-secret settings changed in the same run kept the stored secret; a rotated secret was only pushed on a later run.
- An explicit empty secret (`password: ""`) differed from a masked stored secret and produced an update on every run, while the update wrote the stored value back.
- *arr validates the connection when it saves an enabled client. A non-secret write with a wrong stored secret is rejected with `Authentication failed` and persists nothing.

## Decision

`calculateDiff` produces the diff; `resolveSecretProbes` tests stored secrets before the write phase.

`update_password: true` takes precedence over `update_password_on_test_fail`.

### update_password: false (default)

- Create: the configured secrets are written.
- Update: secrets are never written. Other fields are synced with the stored secret. No secret difference produces an update, even when the stored secret is empty.
- An explicit empty string is not written on update.

### update_password_on_test_fail: true (when update_password is not true)

- Create: the configured secrets are written.
- Update with a non-secret field difference: the client is updated. When the configuration sets a secret field, that configured secret is part of the update; otherwise the stored secret is kept.
- Update with no other difference and a configured secret field (including `""`): `resolveSecretProbes` tests the stored secret.
  - Pass: unchanged; the stored secret stays.
  - Credential rejection: write the configured secret, including an empty value; if both sides are empty there is nothing to write.
  - Connectivity failure, timeout, *arr 5xx: unchanged; the stored secret stays.
- A client that is disabled on the server is not probed; if its other settings match, its stored secret stays unchanged. A non-secret difference still triggers an update, and a configured secret is included in that update.
- Secret field omitted: no test and no secret write.

A test is a failure only when *arr rejects the credentials. An unreachable client or any other error never changes the secret. When a non-secret diff triggers the update, a specified secret is always part of that change.

### Empty and omitted secrets

An explicit `password: ""` is a configured value; an omitted field means "not managed".

- `update_password: true` clears the stored secret.
- `update_password_on_test_fail` writes it together with other changes, or after a credential rejection. An empty configured value over an empty stored value is a no-op.
- `update_password: false` never writes it on update.

The value `********` is treated as the server mask, not as a secret. An empty stored secret is the API's way of saying "no secret stored"; a configured secret over it is still tested, and is written only when that test rejects the empty stored value.

## Diff and sync shape

- `calculateDiff` stays free of API calls and keeps `secretProbe` for clients whose non-secret fields match.
- In test-failure mode, a real diff with a configured secret includes the masked secret change and sets `updatePassword: true`.
- `resolveSecretProbes` runs before writes and turns a credential rejection into a normal update entry with masked secret field changes, when the configuration has a secret change to write, including an empty value. If both sides are empty there is nothing to write, so the client stays unchanged.
- `mergeFieldsWithSchema` never writes a secret that the YAML does not set, so `update_password: true` does not clear an omitted secret.
- In `DRY_RUN` the stored-secret probe still runs; no write is attempted.

## Failure accounting

- A rejected update is a failed update; there is no retry.
- No force-save: a write rejected by *arr leaves the server unchanged.
- A non-credential rejection of the stored-secret probe is not a sync failure; the client is unchanged.

## Out of scope

- Force-saving enabled clients.
- Verifying the new secret with a second test.
- Changing secret detection (`isSecretFieldName`).
