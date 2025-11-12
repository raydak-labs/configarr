{
  description = "Configarr flake";

  inputs = {
    flake-parts.url = "github:hercules-ci/flake-parts";
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    systems.url = "github:nix-systems/default";
  };

  outputs = {
    flake-parts,
    nixpkgs,
    ...
  } @ inputs:
    flake-parts.lib.mkFlake {inherit inputs;} {
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      flake = {
        nixosModules.default = ./nix/module;
      };

      perSystem = {system, ...}: let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        packages.default = import ./nix/package.nix {
          inherit pkgs;
          inherit (pkgs) lib;
        };
      };
    };
}
