# Preserve quality profile identity across syncs

Status: accepted (2026-11-16)

Quality profile groups keep identity across reorders instead of deriving ids from config positions. Reserve explicit ids first, reuse unclaimed server ids by group name, then allocate `1000 + index` while skipping claimed ids. Explicit ids are unique integers `>= 1000` and are invalid on plain qualities. Items are identified by kind (`group` or `quality`) plus name because both kinds may share a display name.

On update, undeclared qualities stay near their server positions; qualities absent from the server follow `quality_sort`. With upgrades disabled, create uses `until_score ?? 1`; update preserves omitted server cutoff fields and translates the cutoff through item identity, falling back to an allowed item only when the previous target is missing or disabled. This avoids moved cutoffs and repeat diffs without comparing `allowed`/`enabled` for every unlisted quality.
