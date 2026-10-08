#!/usr/bin/env bash
# Print the fixed-output hash of pkgs/nix/package.nix pnpmDeps for this flake's source.
# Always builds with a fake hash. A fixed-output path is reused when that hash is
# already in the store, even if the lockfile changed, so a successful build of the
# hash recorded in package.nix is not proof the hash is current.
set -euo pipefail

err="$(mktemp)"
trap 'rm -f "$err"' EXIT

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
  pkg.pnpmDeps.override {hash = pkgs.lib.fakeHash;}
'

if nix build --no-link --impure --expr "$expr" > /dev/null 2>"$err"; then
  echo "pnpmDeps built with a fake hash; expected a mismatch that reports the real hash" >&2
  exit 1
fi

hash="$(grep -oE 'got:[[:space:]]+sha256-[A-Za-z0-9+/=]+' "$err" | head -n 1 | grep -oE 'sha256-[A-Za-z0-9+/=]+' || true)"
if [[ -n "$hash" && "$hash" != "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" ]]; then
  printf '%s\n' "$hash"
  exit 0
fi

cat "$err" >&2
exit 1
