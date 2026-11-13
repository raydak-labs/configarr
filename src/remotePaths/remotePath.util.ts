/** Windows absolute paths: drive-qualified (`X:\…`, `X:/…`) or UNC (`\\server\share`). */
const WINDOWS_ABSOLUTE_PATH = /^([a-zA-Z]:[\\/]|\\\\)/;

/** Drive root (`X:\` or `X:/`), as opposed to the drive-relative `X:`. */
const WINDOWS_DRIVE_ROOT = /^([a-zA-Z]):[\\/]+$/;

/**
 * Normalize a path for comparison by removing trailing separators.
 *
 * *Arr apps append a trailing separator when they store a path. That is usually
 * `/`, but a Windows-hosted app uses `\` for drive and UNC paths.
 *
 * The separator set depends on the path style: on Linux a backslash is an
 * ordinary filename character, so `/data\` and `/data` are different paths, and
 * `//server/share` (a POSIX path) is different from `\\server\share` (UNC).
 * Only Windows-style paths strip `\` as well as `/`.
 *
 * Roots keep a separator rather than normalizing to an empty string or a bare
 * drive. Otherwise the POSIX `/` would collide with an empty result, and the
 * drive root `X:\` would collide with the drive-relative `X:`.
 */
export function normalizeRemotePath(path: string): string {
  const driveRoot = WINDOWS_DRIVE_ROOT.exec(path);
  if (driveRoot) {
    return `${driveRoot[1]}:\\`;
  }

  const normalized = WINDOWS_ABSOLUTE_PATH.test(path) ? path.replace(/[\\/]+$/, "") : path.replace(/\/+$/, "");
  return normalized === "" && path.startsWith("/") ? "/" : normalized;
}
