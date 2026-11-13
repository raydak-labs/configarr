# Plan: download client secret test order

Spec: [2026-11-13-download-client-secret-test-order-design](../specs/2026-11-13-download-client-secret-test-order-design.md)

## 1. Comparison and schema merge

- `downloadClientBase.ts`: in `collectSharedFieldChanges`, treat a configured string secret as equal when `updatePassword !== true`, including an explicitly empty value.
- In `mergeFieldsWithSchema`, keep the stored value for a secret the YAML does not set, even when `updatePassword` is true.
- Change the probe eligibility from "configured non-empty secret" to "configured secret, including `""` and excluding `********`".

## 2. Diff and probes

- In test-failure mode, any real diff with a configured secret includes the masked secret change and sets `updatePassword: true`.
- `resolveSecretProbes` tests the stored secret for clients whose non-secret fields match. A credential rejection becomes a masked secret update when the config has a secret change to write, including an empty value; if both sides are empty there is nothing to write and the client stays unchanged. A client that is disabled on the server is not probed; if its other settings match, its stored secret stays unchanged. A non-secret difference still triggers an update, and a configured secret is included in that update. Non-credential failures leave the stored secret alone.

## 3. Sync

- `updateClients` and `syncDownloadClients` keep their original shape: no retry, no failure map, no force-save.

## 4. Tests

- Update: a non-secret change plus a configured secret writes the secret with the change and does not test.
- Add: `update_password: true` with the password omitted keeps the stored secret.
- Add: empty configured secret matrix (false/true/on_test_fail, stored empty/non-empty), including both empty with the test passing and with the test failing.
- Keep the existing probe, empty-stored, dry-run and idempotent cases.
- A live Lidarr + Deluge empty-password check was run manually; it is not committed (external dependency).

## 5. Docs

- `docs/docs/configuration/config-file.md`: describe the per-mode rules, the "only credential errors change the secret" rule, and the empty/omitted semantics.

## 6. Verification

- `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
- `pnpm test:e2e:arr --project ...` for the Sonarr e2e case if the stack is available.
