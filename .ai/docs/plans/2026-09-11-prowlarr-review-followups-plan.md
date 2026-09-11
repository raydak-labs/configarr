# Prowlarr Support — Review Follow-ups Implementation Plan

**Status:** implemented 2026-09-11 (Tasks 1-6). Task 7 (PR description / review replies) is the
only remaining step and is done from the PR, not the repo.

**Goal:** Address the review of [PR #520](https://github.com/raydak-labs/configarr/pull/520)
(BlackDark, changes requested 2026-09-10; Sourcery 2026-09-04) so the Prowlarr pipeline fails
loudly, never guesses an app profile, carries no unrelated generated churn, has failure-path
tests, and warns about `delete_unmanaged`.

**Spec:** `.ai/docs/specs/2026-09-04-prowlarr-support-design.md` (revised 2026-09-11 to match
the merged implementation; the "Error model → Target" and "`delete_unmanaged`" sections are what
this plan implements).

**Problem statement check (#519):** applications, download clients, tags, indexer proxies,
indexers — all five are implemented and documented as experimental. No scope change needed; the
follow-ups are about robustness, not missing features.

**Tech Stack:** TypeScript, Vitest, pnpm. No new dependencies.

## Global Constraints

- pnpm only. After every task: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`.
- Never edit `CHANGELOG.md`.
- All work lands on `feat/prowlarr-support` as additional commits (the reviewer reads the PR).
  Commit types: behaviour changes are `fix:`; the generated-file revert is `chore:`; tests
  `test:`; docs `docs:`.
- Follow the quality-profile precedent for fatal errors: log a descriptive message, then
  `throw` — do not invent a result/status flag.
- TDD: write the failing test first where a test is listed.

## Review comment → task map

| #   | Reviewer             | Location                                                 | Comment (short)                                                                                                                                                                                                | Task                           |
| --- | -------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | BlackDark            | `src/prowlarr/prowlarrSyncer.ts:64`                      | Sub-syncs catch/log/continue → instance always "success", `STOP_ON_ERROR` dead; should throw like quality profiles. `ApplicationIndexerSync` swallow "fine if intentional, but then never fails the instance". | 2, 3                           |
| 2   | BlackDark            | `src/prowlarr/indexerSync.ts:121`                        | Missing `app_profile` / failed `getAppProfiles` falls back to id `1`. Fail instead.                                                                                                                            | 4                              |
| 3   | BlackDark            | `src/__generated__/sonarr/data-contracts.ts:687`         | Unrelated generator noise; revert. Keep `prowlarr/` generated files.                                                                                                                                           | 1                              |
| 4   | BlackDark            | `src/prowlarr/indexerProxySync.ts:1`                     | No tests for indexer proxy sync, provider base, client; at least failure paths.                                                                                                                                | 5                              |
| 5   | BlackDark            | `docs/docs/configuration/experimental-support.md:308`    | `delete_unmanaged` on Prowlarr can unlink the arr stack; default off correct; add warning.                                                                                                                     | 6                              |
| 6   | IonBazan / BlackDark | `docs/docs/configuration/experimental-support.md:319`    | Is `prowlarrEnabled` needed? → keep, exists for all arrs.                                                                                                                                                      | none (resolved)                |
| 7   | BlackDark            | `.ai/docs/specs/2026-09-04-prowlarr-support-design.md:1` | Spec and implementation out of sync.                                                                                                                                                                           | done (spec revised 2026-09-11) |
| 8   | Sourcery             | `providerResourceSync.ts` tags                           | Omitted `tags` wiped server tags.                                                                                                                                                                              | done (45cb492)                 |
| 9   | Sourcery             | `tagSync.ts:73`                                          | Failed tag create ignored.                                                                                                                                                                                     | 2 (superseded: now throws)     |
| 10  | Sourcery             | `applicationSync.ts:121`                                 | `ApplicationIndexerSync` failure swallowed.                                                                                                                                                                    | 3                              |

---

### Task 1: Revert unrelated Sonarr generated diff

**Files:**

- Modify: `src/__generated__/sonarr/data-contracts.ts` (drop the `allowedHosts` /
  `trustedNetworks` additions to `HostConfigResource`)

- [x] **Step 1:** `git checkout main -- src/__generated__/sonarr/data-contracts.ts`
- [x] **Step 2:** Confirm `git diff main..HEAD --stat` no longer lists that file and nothing
      under `src/__generated__/prowlarr/` changed.
- [x] **Step 3:** Run all checks. Commit: `chore: revert unrelated sonarr generated contract churn`.
- [x] **Step 4:** Remove the "Notes" paragraph about this file from the PR description.

---

### Task 2: Make provider/tag sync failures fatal for the instance

Reviewer's rationale: tags / proxies / indexers / apps _are_ the Prowlarr run. Today
`syncProwlarrProviders` (`prowlarrSyncer.ts:30,42,51,61`) swallows each sub-sync, and
`ProviderResourceSync.sync` (`providerResourceSync.ts:460,473,484`) swallows each item, so
`runProwlarr` (`src/index.ts`) never sees an error.

**Files:**

- Modify: `src/prowlarr/prowlarrSyncer.ts`
- Modify: `src/prowlarr/providerResourceSync.ts` (`sync`, `logError`)
- Modify: `src/prowlarr/tagSync.ts` (`tagSync.ts:69,104`)
- Test: `src/prowlarr/prowlarrSyncer.test.ts` (new), `src/prowlarr/providerResourceSync.test.ts`
  (new, see Task 5), `src/prowlarr/tagSync.test.ts`

**Design:**

- `syncProwlarrProviders`: remove the four try/catch blocks; let the first failure propagate.
  Keep the "only run when configured" guards. Return shape unchanged.
- `ProviderResourceSync.sync`: in the create / update / delete loops, keep `logError(...)`
  (including the debug dump of `response.data`) and then rethrow a wrapped
  `Error(\`<Label> '<name>' <create|update|delete> failed: <message>\`)`. `createMissingTags`
  already throws — unchanged.
- `syncTags`: a failed tag **create** throws (replaces the `failed[]` + summary warn); a failed
  tag **delete** also throws (it is an explicit user opt-in via `delete_unmanaged_tags`).
- `prowlarrPipeline` in `src/index.ts`: leave the download-client try/catch (`index.ts:477`)
  as-is — parity with the media pipeline (`index.ts:360`), which the reviewer explicitly
  accepted.
- Remove the now-wrong comment in `tagSync.ts` ("Non-fatal: …") and the `failed` bookkeeping.

- [x] **Step 1 (test):** `prowlarrSyncer.test.ts` — mock `./tagSync`, `./indexerProxySync`,
      `./indexerSync`, `./applicationSync`; assert (a) a rejected `syncTags` rejects
      `syncProwlarrProviders` and no later sub-sync runs; (b) a rejected `IndexerSync.sync`
      rejects and `ApplicationSync.syncApplications` is not called; (c) happy path concatenates
      diff entries in order and forwards `indexersSynced`.
- [x] **Step 2 (test):** `tagSync.test.ts` — `createTag` rejection → `syncTags` rejects, no
      `added` counted; `deleteTag` rejection → rejects.
- [x] **Step 3 (test):** `providerResourceSync.test.ts` — see Task 5 Step 1 for the harness;
      `createResource` / `updateResource` / `deleteResource` rejection → `sync()` rejects with the
      wrapped message; `createTag` rejection → rejects with "Tag creation failed".
- [x] **Step 4:** Implement the changes above.
- [x] **Step 5 (test, index-level):** extend the existing `src/index.test.ts` pattern if one
      covers `runArrType` status counting; otherwise add a focused test that `runProwlarr`
      increments `failure` and throws the `STOP_ON_ERROR` error when `prowlarrPipeline` rejects
      (export `runProwlarr` for testing only if the file already exports `run`/helpers the same
      way; if not, cover it via `prowlarrSyncer.test.ts` and note it in the PR).
- [x] **Step 6:** Update the spec's "Error model" section: move "Target" to "Current".
- [x] **Step 7:** All checks. Commit: `fix(prowlarr): fail the instance when tag/provider sync fails so STOP_ON_ERROR applies`.

---

### Task 3: `sync_indexers` failure fails the instance

Decision: make it fatal too. The earlier justification for non-fatal ("consistent with the
other sub-syncs") disappears once Task 2 lands, the user explicitly opted in with
`sync_indexers: true`, and both reviewers flagged the silent success. Prowlarr's own scheduled
sync still exists as a safety net, but that is not a reason to report success.

**Files:**

- Modify: `src/prowlarr/applicationSync.ts` (`applicationSync.ts:115` catch block)
- Test: `src/prowlarr/applicationSync.test.ts`

- [x] **Step 1 (test):** `syncAppIndexers` rejection → `syncApplications` rejects; the
      `Sync App Indexers` diff entry is not present in any partial result.
- [x] **Step 2:** Replace the catch with log + rethrow
      (`Failed to trigger Prowlarr App Indexer sync: <message>`). Keep the dry-run branch.
      `indexersSynced` on the outcome stays (it is `true` on success only).
- [x] **Step 3:** Update the spec "`sync_indexers`" paragraph (remove "only when accepted"
      wording, since failure now throws).
- [x] **Step 4:** All checks. Commit: `fix(prowlarr): propagate ApplicationIndexerSync failures`.

---

### Task 4: Never guess an app profile

**Files:**

- Modify: `src/prowlarr/indexerSync.ts` (`resolveAppProfileId` :58, `loadContext` :67,
  `resolveConfig` :121)
- Modify: `docs/docs/configuration/experimental-support.md:353`,
  `docs/docs/configuration/config-file.md` ("defaults to the first profile" sentence)
- Test: `src/prowlarr/indexerSync.test.ts`

**Design:**

- `loadContext()`: no try/catch — a failed `getAppProfiles()` propagates (fatal via Task 2).
- `resolveAppProfileId(config, ctx)`: if `config.app_profile` is set and not found →
  `throw new Error(\`App profile '<name>' not found for indexer '<indexer>'\`)` (was a warn).
- `resolveConfig`: `appProfileId = explicit ?? server?.appProfileId ?? firstProfile`, where
  `firstProfile` is `ctx.appProfiles[0]?.id`; if that is `undefined` throw
  `No app profile available on Prowlarr for indexer '<name>'; set app_profile`. Drop the `?? 1`.
- `isEqual` via `extras.fromConfig` now throws for an unknown name — acceptable (surfaces in
  `calculateDiff`, before any writes).
- Docs: "defaults to the server's existing profile on update, otherwise the first app profile;
  fails if the named profile does not exist".

- [x] **Step 1 (test):** unknown `app_profile` → `sync()` rejects, `createIndexer` not called.
- [x] **Step 2 (test):** `getAppProfiles` rejects → `sync()` rejects.
- [x] **Step 3 (test):** no `app_profile`, `getAppProfiles` returns `[]`, create → rejects.
- [x] **Step 4 (test):** no `app_profile`, update of an existing indexer keeps `server.appProfileId`.
- [x] **Step 5:** Implement; update both docs sentences and the config-type comment in
      `src/types/config.types.ts` (`InputConfigIndexerSchema.app_profile`).
- [x] **Step 6:** All checks. Commit: `fix(prowlarr): fail on unknown or unavailable indexer app profile instead of defaulting to id 1`.

---

### Task 5: Failure-path tests for indexer proxies, provider base and client

**Files:**

- Create: `src/prowlarr/indexerProxySync.test.ts`
- Create: `src/prowlarr/providerResourceSync.test.ts`
- Create: `src/clients/prowlarr-client.test.ts`

No client test file exists for any \*arr yet (`src/clients/*.test.ts` is empty), so keep the
client test minimal and mock-based rather than establishing a large new pattern.

- [x] **Step 1: `providerResourceSync.test.ts` harness.** Define a tiny concrete subclass in the
      test (`label = "Thing"`, zod schema `{ name, type, fields?, tags? }`, template by
      `implementation`, identity `name`), with an injectable mock client via
      `vi.mock("../clients/unified-client")` like the existing tests. Cover: - unknown template → validation error, item skipped, `sync()` returns 0/0/0 (no throw —
      validation is user-input, logged, consistent with download clients) - duplicate names → both skipped - `createMissingTags` failure → rejects - create / update / delete API rejection → rejects (Task 2) - partial vs full update payload (`fields` present → schema base; only `tags` → server base) - `templatePassthrough` keys copied - dry-run: counts + diff entries, no writes
- [x] **Step 2: `indexerProxySync.test.ts`.** Mirror `applicationSync.test.ts`: validate
      known/unknown `type`, `matches` by name + implementation (case-insensitive), create with
      merged `fields`, update on field change, delete unmanaged with `ignore`, create failure
      rejects.
- [x] **Step 3: `prowlarr-client.test.ts`.** Mock `../__generated__/prowlarr/Api`; assert
      `syncAppIndexers` posts `{ name: "ApplicationIndexerSync" }`, `deleteTag`/`deleteIndexer`
      coerce string ids to numbers, `testConnection` returns `false` and logs on rejection, and
      one media-manager stub (`getQualityProfiles`) throws "not supported for Prowlarr".
- [x] **Step 4:** All checks. Commit: `test(prowlarr): cover indexer proxies, provider base and client failure paths`.

---

### Task 6: `delete_unmanaged` warning in docs

**Files:**

- Modify: `docs/docs/configuration/experimental-support.md:307-309`
- Modify: `docs/docs/configuration/config-file.md` (Prowlarr section, after the
  `delete_unmanaged` bullet list)

- [x] **Step 1:** Add a Docusaurus `:::warning` admonition right after the "Each managed section
      … supports `delete_unmanaged`" paragraph: deleting unmanaged **applications** unlinks
      Sonarr/Radarr/… from Prowlarr; deleting unmanaged **indexers** removes them from every
      synced app on the next app sync; deleting unmanaged **tags** silently untags resources.
      Default is off; enable per section only once the config lists everything that should exist,
      and use `ignore` for hand-managed entries. Recommend a `DRY_RUN=true` first run.
- [x] **Step 2:** One-line cross-reference in `config-file.md`.
- [x] **Step 3:** `pnpm lint`. Commit: `docs(prowlarr): warn about delete_unmanaged on Prowlarr`.

---

### Task 7: Wrap up the PR

- [x] **Step 1:** Update the PR description: verification line (test count), remove the Sonarr
      generated-file note, add an "Error handling" paragraph (instance fails + `STOP_ON_ERROR`
      on any tag/provider/app-sync failure; download clients unchanged).
- [x] **Step 2:** Reply on each review thread with the commit that addresses it (Tasks 1–6) and
      mark the `prowlarrEnabled` thread as resolved (kept per reviewer).
- [x] **Step 3:** Re-request review from BlackDark.

## Open decisions (defaulted; flag in the PR if the reviewer disagrees)

1. **`sync_indexers` fatal** (Task 3) — default: fatal. Alternative: keep non-fatal and document
   that it never fails the instance.
2. **Tag delete failure fatal** (Task 2) — default: fatal, same as create.
3. **Validation errors stay non-fatal** (unknown `type` / `definition`, duplicate names, zod
   errors are logged and the item skipped). This matches download clients and quality profiles
   only throw for `config` problems they cannot skip. If the reviewer wants config errors to
   fail the instance too, change `sync()` to throw after logging all validation errors.
