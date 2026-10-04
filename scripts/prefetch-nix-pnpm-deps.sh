#!/usr/bin/env bash
# Print the fixed-output hash of pkgs/nix/package.nix pnpmDeps for this flake's source.
set -euo pipefail

err="$(mktemp)"
out="$(mktemp)"
trap 'rm -f "$err" "$out"' EXIT

expr='
let
  flake = builtins.getFlake (toString ./.);
  pkgs = flake.inputs.nixpkgs.legacyPackages.${builtins.currentSystem};
  pkg = import "${flake.outPath}/pkgs/nix/package.nix" {
    inherit pkgs;
    inherit (pkgs) lib;
    src = flake.outPath;
  };
in
  pkg.pnpmDeps
'

if nix build --no-link --print-out-paths --impure --expr "$expr" >"$out" 2>"$err"; then
  python3 - <<'PY'
import re
from pathlib import Path

text = Path("pkgs/nix/package.nix").read_text(encoding="utf-8")
match = re.search(
    r"pnpmDeps = pkgs\.fetchPnpmDeps \{[^}]*?hash = \"(sha256-[A-Za-z0-9+/=]+)\"",
    text,
    flags=re.S,
)
if match is None:
    raise SystemExit("pnpmDeps hash not found in pkgs/nix/package.nix")
print(match.group(1))
PY
  exit 0
fi

hash="$(grep -oE 'got:[[:space:]]+sha256-[A-Za-z0-9+/=]+' "$err" | head -n 1 | grep -oE 'sha256-[A-Za-z0-9+/=]+' || true)"
if [[ -n "$hash" ]]; then
  printf '%s\n' "$hash"
  exit 0
fi

cat "$err" >&2
exit 1
