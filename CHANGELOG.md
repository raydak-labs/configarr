# Changelog

All notable changes to this project will be documented in this file.

## [1.5.1](https://github.com/raydak-labs/configarr/compare/v1.5.0...v1.5.1) (2024-12-29)

### Bug Fixes

- correctly handle diffs for minFormatScores ([a2494db](https://github.com/raydak-labs/configarr/commit/a2494db839f283d9b0b16b18584b7b745af65e20))

## [1.5.0](https://github.com/raydak-labs/configarr/compare/v1.4.0...v1.5.0) (2024-12-17)

### Features

- add configuration options for media management tab ([c2f2110](https://github.com/raydak-labs/configarr/commit/c2f2110f58f05cd7400ad12f0dc7bf77b0343d3c))
- add support for loading customformat definitions ([4014d93](https://github.com/raydak-labs/configarr/commit/4014d938f5ab4b747be90c5a65e180941a3dcbdb))
- optimize envs and add support for custom root for data [#117](https://github.com/raydak-labs/configarr/issues/117) ([f218b56](https://github.com/raydak-labs/configarr/commit/f218b56cf6b43e0508efa1f061223c264985bc1e))

### Bug Fixes

- **deps:** pin dependencies ([#118](https://github.com/raydak-labs/configarr/issues/118)) ([912130a](https://github.com/raydak-labs/configarr/commit/912130a347ff7e06f012778c87a72db20e8aee2b))
- **deps:** update dependencies (non-major) ([a181831](https://github.com/raydak-labs/configarr/commit/a181831ad10b30b945683a1d0f005a6ed54d64c7))
- **deps:** update dependency pino-pretty to v13 ([c05c07f](https://github.com/raydak-labs/configarr/commit/c05c07f1241c0c0f47f916071b9c426883b2117e))
- set default language for new profiles to any ([ffd6faa](https://github.com/raydak-labs/configarr/commit/ffd6faae718df8e13e520db8bf7d4525bcc31d5b))

### (internal) Refactorings

- improve typings for client ([b9ad772](https://github.com/raydak-labs/configarr/commit/b9ad772418fd041f72fd9432d89bb2adf54b083b))

## [1.4.0](https://github.com/raydak-labs/configarr/compare/v1.3.0...v1.4.0) (2024-11-17)

### Features

- add experimental support for readarr ([9085a52](https://github.com/raydak-labs/configarr/commit/9085a5248199bc710187f0a9a8a4c46df43f5083))
- add expermintal whisparr v3 support ([ff2f08e](https://github.com/raydak-labs/configarr/commit/ff2f08ea551bbd1e57322a82c6705168ac256e73))
- implement preferredRatio ([b6333db](https://github.com/raydak-labs/configarr/commit/b6333db1a14a4ac68da3c74e43ac9a1a2a15179f))
- make Trash template / QualityProfiles includable ([5339ced](https://github.com/raydak-labs/configarr/commit/5339ced26ee4f5596f23a10cc93e8879efddc9e6))

### Bug Fixes

- **deps:** update dependencies (non-major) ([cd8b081](https://github.com/raydak-labs/configarr/commit/cd8b081b1432ddbc4f0695859335bee0e33760b1))

### (internal) Refactorings

- adjust some logging ([795ecbd](https://github.com/raydak-labs/configarr/commit/795ecbd2baf9dfbd0a448763b74e838d01c8c904))
- fix test ([bcfa622](https://github.com/raydak-labs/configarr/commit/bcfa62289913d1ce96a9c1ec675278e80f99e461))
- improve flow ([738949a](https://github.com/raydak-labs/configarr/commit/738949ae2df841742585a93a510b3c5849623972))
- improve ky error log ([e68e073](https://github.com/raydak-labs/configarr/commit/e68e073d986e387d362b8826e5d526f97515c35d))
- move index.ts to src ([b6052e5](https://github.com/raydak-labs/configarr/commit/b6052e5669ac21368635a670fe8e06e7e6c71f07))
- move types ([98aa2fe](https://github.com/raydak-labs/configarr/commit/98aa2feef8ed0f2579fffeb46c8262e33431c25f))
- remove tsconfig paths config ([4a34869](https://github.com/raydak-labs/configarr/commit/4a34869e6ba4f25f22180ce20606d7734e55e5a3))
- rewrite api client usage ([43784ba](https://github.com/raydak-labs/configarr/commit/43784ba3988b9dafb1a65fd63d1b2cc16c8650d9))
- split config merging and improve types ([2aa101c](https://github.com/raydak-labs/configarr/commit/2aa101cb3f16c70473c4469423eaf97f0425a18c))
- split local path importer ([e0871ac](https://github.com/raydak-labs/configarr/commit/e0871ac9443007f3bf3f8011870c1f0413022715))
- unify clone repo ([18c1b69](https://github.com/raydak-labs/configarr/commit/18c1b69b8571dd4dcd7d7973e65fe36a31c403d0))
- update sonarr/radarr apis ([1dc0d09](https://github.com/raydak-labs/configarr/commit/1dc0d094a0533d61cc078b901b0307602632ddf0))
- use configureApi ([27aed23](https://github.com/raydak-labs/configarr/commit/27aed239c93b9aab7c5cae773c821f3819b27075))
