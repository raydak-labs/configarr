# Remote path mappings: support UNC paths

**Spec:** [2026-11-13-remote-path-unc-design.md](../specs/2026-11-13-remote-path-unc-design.md)

## Steps

1. `src/remotePaths/remotePath.types.ts`
   - Accept POSIX, drive absolute and UNC forms; a UNC path must have server and share.
   - Keep accepting drive-relative paths so the change is not breaking; warn at config load instead.
   - Apply the same rule to `remote_path` and `local_path`, and name all accepted forms in the message.
2. `src/remotePaths/remotePath.util.ts`
   - Add `normalizeRemotePath`: strips trailing `\` and `/` for Windows-style paths, only `/` for
     POSIX paths (a backslash is a filename character on Linux); preserve the POSIX root `/` and the
     Windows drive root `X:\` so they stay distinct from an empty result and from drive-relative `X:`.
   - `remotePathSyncer.ts` and config duplicate detection (`src/config.ts`) both use it.
3. `src/config.ts`
   - Warn when a drive-relative path is configured; the value stays accepted.
4. Tests
   - `remotePath.util.test.ts`: POSIX, UNC, drive root, repeated and mixed trailing separators, `/data\`
     vs `/data` and `//server/share` vs `\\server\share` staying distinct, `/` not normalizing to empty.
   - `remotePath.types.test.ts`: accepted forms (POSIX, `X:/`, `X:\`, UNC, `//server/share`, UNC local
     path, deprecated drive-relative) and rejected forms (relative, single leading `\`, bare `\\`,
     `\\server`, empty).
   - `remotePathSyncer.test.ts`: UNC mapping with trailing `\` on the server is unchanged and stable on
     a second run, an absent UNC mapping is created with the exact config string, UNC `local_path`
     trailing `\` is unchanged, different servers do not match, and POSIX paths ending in `\` or
     colon-slash UNC forms do not match each other.
   - `config.test.ts`: UNC mapping passes config validation, non-absolute paths and share-less UNC
     still fail at load, drive-relative warns instead of throwing, UNC duplicates that differ only by a
     trailing separator are rejected, different servers and forward-slash vs backslash UNC are not.
   - `tests/arr-e2e/*.e2e.test.ts`: add a `\\server\share\downloads` mapping beside the existing remote
     path case in every media app, assert the trailing `\` \*arr stores, and rely on the second run for
     idempotency.
5. Docs: `docs/docs/configuration/config-file.md` — UNC example, YAML escaping note, accepted absolute
   forms, share requirement, drive-relative deprecation and trailing-separator normalization.
6. Verification: `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, and the e2e suite where
   Docker is available.
