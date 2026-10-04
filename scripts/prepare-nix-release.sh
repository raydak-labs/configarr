#!/usr/bin/env bash
# Record the release version and pnpmDeps hash in pkgs/nix/package.nix.
# release-it runs this from before:git:release, so the result is part of the tagged commit.
set -euo pipefail

version="${1:?usage: prepare-nix-release.sh <version>}"
file="pkgs/nix/package.nix"
pnpm_hash="${NIX_PNPM_DEPS_HASH:-}"

if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "unexpected version: ${version}" >&2
  exit 1
fi

if [[ -n "${GITHUB_ACTIONS:-}" && -z "$pnpm_hash" ]]; then
  echo "NIX_PNPM_DEPS_HASH is required when preparing a GitHub release" >&2
  exit 1
fi

python3 - "$file" "$version" "$pnpm_hash" <<'PY'
import re
import sys

path, version, pnpm_hash = sys.argv[1:]
text = open(path, encoding="utf-8").read()

text, version_count = re.subn(
    r'^(\s*)version \? "[0-9]+\.[0-9]+\.[0-9]+",',
    rf'\1version ? "{version}",',
    text,
    count=1,
    flags=re.M,
)
if version_count != 1:
    sys.exit(f"failed to update version in {path}")

if pnpm_hash:
    if re.fullmatch(r"sha256-[A-Za-z0-9+/=]+", pnpm_hash) is None:
        sys.exit(f"unexpected pnpm hash: {pnpm_hash}")
    text, hash_count = re.subn(
        r'(pnpmDeps = pkgs\.fetchPnpmDeps \{[^}]*?hash = ")sha256-[A-Za-z0-9+/=]+(";)',
        rf"\1{pnpm_hash}\2",
        text,
        count=1,
        flags=re.S,
    )
    if hash_count != 1:
        sys.exit(f"failed to update pnpmDeps hash in {path}")

open(path, "w", encoding="utf-8").write(text)
PY
