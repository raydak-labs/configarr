# Build this revision. Fetching the GitHub release tag from inside this repo
# cannot include its own source hash, so a pinned tag would build the previous
# release. Callers pass no src; this file pins the source to the flake root.
{
  pkgs,
  lib ? pkgs.lib,
}:
import ./package.nix {
  inherit pkgs lib;
  src = ../..;
}
