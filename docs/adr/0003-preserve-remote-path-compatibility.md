# Preserve remote path compatibility and UNC forms

Status: accepted (2026-11-13)

Remote paths accept POSIX, drive-absolute, and UNC forms without rewriting the payload sent to *arr. UNC requires both server and share; relative paths and a single leading backslash are rejected. Drive-relative `X:…` remains accepted with a deprecation warning because rejecting it immediately would break existing configs; it may be removed in a later major.

`normalizeRemotePath` is shared by sync comparison and duplicate detection. Windows-style paths strip trailing `\` and `/`; POSIX and forward-slash UNC strip only `/`, preserving platform distinctions and root separators. Forward-slash UNC is not converted to backslash UNC because *arr may treat the forms differently.
