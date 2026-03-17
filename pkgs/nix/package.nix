{
  lib,
  pkgs,
  ...
}:
pkgs.stdenvNoCC.mkDerivation (finalAttrs: {
  buildPhase = ''
    runHook preBuild
    pnpm build
    runHook postBuild
  '';

  checkPhase = ''
    runHook preCheck
    pnpm test
    runHook postCheck
  '';

  CI = "true";

  installPhase = ''
    runHook preInstall
    install -Dm644 -t $out/share bundle.cjs
    makeWrapper ${lib.getExe pkgs.nodejs_24} $out/bin/configarr \
      --add-flags "$out/share/bundle.cjs"
    runHook postInstall
  '';

  meta = {
    changelog = "https://github.com/raydak-labs/configarr/blob/${finalAttrs.src.rev}/CHANGELOG.md";
    description = "Sync TRaSH Guides + custom configs with Sonarr/Radarr";
    homepage = "https://github.com/raydak-labs/configarr";
    license = lib.licenses.agpl3Only;
    mainProgram = "configarr";
    maintainers = with lib.maintainers; [lord-valen];
    platforms = lib.platforms.all;
  };

  nativeBuildInputs = [
    pkgs.makeBinaryWrapper
    pkgs.nodejs_24
    pkgs.pnpm
    pkgs.pnpmConfigHook
  ];

  pname = "configarr";

  pnpmDeps = pkgs.fetchPnpmDeps {
    fetcherVersion = 1;
    hash = "sha256-qH2H7sJ3rMWutPUSpBtBTtIxQqwEUXFCyj+eoygdfjg=";
    inherit (finalAttrs) pname src version;
  };

  src = pkgs.fetchFromGitHub {
    owner = "raydak-labs";
    repo = "configarr";
    rev = "v${finalAttrs.version}";
    hash = "sha256-Kd8EY+qTLv9AQGdLjqW2iU215g/ay9EKcMzTZej9dZk=";
  };

  version = "1.24.0";
})
