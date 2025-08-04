# Changelog

All notable changes to this project will be documented in this file.

## [1.14.0](https://github.com/raydak-labs/configarr/compare/v1.13.7...v1.14.0) (2025-08-04)

### Features

- add support for root folders ([9e717ff](https://github.com/raydak-labs/configarr/commit/9e717ff25184bec830dbec5fad0faab346f73c21)), closes [#264](https://github.com/raydak-labs/configarr/issues/264)
- implement delay profiles ([19c7bbe](https://github.com/raydak-labs/configarr/commit/19c7bbe5d65148393ddeaad37d33d21fd5010c0f))

### Bug Fixes

- **deps:** update dependencies (non-major) ([#292](https://github.com/raydak-labs/configarr/issues/292)) ([3c46cd7](https://github.com/raydak-labs/configarr/commit/3c46cd7166cafb85ef3019400f43851feadc52a6))

### (internal) Refactorings

- update generated api ([b188e8b](https://github.com/raydak-labs/configarr/commit/b188e8b1e307001795eab6610944e9ffd8f021e0))

## [1.13.7](https://github.com/raydak-labs/configarr/compare/v1.13.6...v1.13.7) (2025-07-22)

### Bug Fixes

- do not delete CFs when dry run enabled fixes [#290](https://github.com/raydak-labs/configarr/issues/290) ([cff234b](https://github.com/raydak-labs/configarr/commit/cff234be81fe5dc576ee0be1f21eb45442a5cf45))

## [1.13.6](https://github.com/raydak-labs/configarr/compare/v1.13.5...v1.13.6) (2025-07-09)

### Bug Fixes

- correctly lookup quality definition names from quality profiles fix [#281](https://github.com/raydak-labs/configarr/issues/281) ([728cbde](https://github.com/raydak-labs/configarr/commit/728cbde67f2da82805934286f0aa69ba9bbfd85b))
- **deps:** update dependencies (non-major) ([dbe405a](https://github.com/raydak-labs/configarr/commit/dbe405a9773e0c199ab87dd18160b2c44456bdce))

## [1.13.5](https://github.com/raydak-labs/configarr/compare/v1.13.4...v1.13.5) (2025-05-03)

### Bug Fixes

- correctly handle possible empty quality arrays ([1ac9912](https://github.com/raydak-labs/configarr/commit/1ac9912f6af01c20604f04a5d795648104fcb80f))
- correctly order qualities in groups of a profile ([c27b703](https://github.com/raydak-labs/configarr/commit/c27b7031eca10bcd3b09e39f72fb774f3a9bcf0f))
- **deps:** update dependencies (non-major) ([#257](https://github.com/raydak-labs/configarr/issues/257)) ([27387bb](https://github.com/raydak-labs/configarr/commit/27387bbf07be44fe9d98569693bbec5ab18f9581))
- improve check for ordering of qualities ([d9ac0ee](https://github.com/raydak-labs/configarr/commit/d9ac0ee21d8f0dd6d85cfa4080fdd86d10b3f5a4))
- reverse qualities in groups from trash guide ([83479e7](https://github.com/raydak-labs/configarr/commit/83479e771bf4a23175e698eaa64b9f31f962fed8))

### (internal) Refactorings

- remove unnecessary qualities check ([d55c0ec](https://github.com/raydak-labs/configarr/commit/d55c0ec7893b61ec69531285ffd941d05fc5a6a5))
- simplify starting code ([b969526](https://github.com/raydak-labs/configarr/commit/b9695265801e5fe5e7c3978cd1c10f6118afedcd))

## [1.13.4](https://github.com/raydak-labs/configarr/compare/v1.13.3...v1.13.4) (2025-04-12)

### Bug Fixes

- correctly import quality size / definitions from trash github ([1e2099d](https://github.com/raydak-labs/configarr/commit/1e2099d49a7f044f66dc67fc4f1c178b082dac0f))
- safe directory, see [#241](https://github.com/raydak-labs/configarr/issues/241) ([d1c237b](https://github.com/raydak-labs/configarr/commit/d1c237b2acbadce8c525d882a5a906cdb1318e68))

## [1.13.3](https://github.com/raydak-labs/configarr/compare/v1.13.2...v1.13.3) (2025-04-03)

### Bug Fixes

- allow all users to access git directory. ([#241](https://github.com/raydak-labs/configarr/issues/241)) ([a9b59da](https://github.com/raydak-labs/configarr/commit/a9b59dac61600963f66c87da8a2544da8dcae1dc)), closes [#240](https://github.com/raydak-labs/configarr/issues/240)
- **deps:** update dependencies (non-major) ([#238](https://github.com/raydak-labs/configarr/issues/238)) ([5fe6270](https://github.com/raydak-labs/configarr/commit/5fe627082873ca4bdf88e8d494ca4cacdf6d87d9))

## [1.13.2](https://github.com/raydak-labs/configarr/compare/v1.13.1...v1.13.2) (2025-03-23)

### Bug Fixes

- do not fail empty QualityProfiles or CustomFormats are received from server ([d78b441](https://github.com/raydak-labs/configarr/commit/d78b44116aeca689b6543859e711da4b36a8257a)), closes [#230](https://github.com/raydak-labs/configarr/issues/230)

## [1.13.1](https://github.com/raydak-labs/configarr/compare/v1.13.0...v1.13.1) (2025-03-10)

### Bug Fixes

- improve cloning of quality_profiles configs ([89af504](https://github.com/raydak-labs/configarr/commit/89af504f380bc7c21df2ce48a3a8f3748bae23cc)), closes [#223](https://github.com/raydak-labs/configarr/issues/223)

## [1.13.0](https://github.com/raydak-labs/configarr/compare/v1.12.2...v1.13.0) (2025-03-05)

### Features

- support mapping custom formats on unmanaged quality profiles ([cd6dea6](https://github.com/raydak-labs/configarr/commit/cd6dea67c5a7835e68b26255a7f451c73d74720e)), closes [#218](https://github.com/raydak-labs/configarr/issues/218)

### Bug Fixes

- **deps:** update dependencies (non-major) ([#208](https://github.com/raydak-labs/configarr/issues/208)) ([dbe40d1](https://github.com/raydak-labs/configarr/commit/dbe40d12dd7fe5a9a07581f5047a7920640cc8f0))

### (internal) Refactorings

- fix incorrect path in log message ([#215](https://github.com/raydak-labs/configarr/issues/215)) ([ebec0a1](https://github.com/raydak-labs/configarr/commit/ebec0a1a88ed19576a24bdedbabc1f48f8bd5249))
- fix typo (closes [#202](https://github.com/raydak-labs/configarr/issues/202)) ([1bad256](https://github.com/raydak-labs/configarr/commit/1bad256ffe13bb75431d8175094723bc09ef59f5))

## [1.12.2](https://github.com/raydak-labs/configarr/compare/v1.12.1...v1.12.2) (2025-02-27)

### Bug Fixes

- correctly merge templates and configs ([9235c47](https://github.com/raydak-labs/configarr/commit/9235c47923e3a81da081e73596d018b7c987e9d0))

### (internal) Refactorings

- improve logging for customformatgroups ([f8560df](https://github.com/raydak-labs/configarr/commit/f8560df015b3ee60393461fab3ebd5cacbcff124))

## [1.12.1](https://github.com/raydak-labs/configarr/compare/v1.12.0...v1.12.1) (2025-02-19)

### (internal) Refactorings

- **deps:** update node and pnpm ([8574d3b](https://github.com/raydak-labs/configarr/commit/8574d3b4fb380d3fbbad7bf31a0f90809f0534f6))
- improve logs ([d611c0e](https://github.com/raydak-labs/configarr/commit/d611c0e40d8166b188904f34cb19c7e1f8831860)), closes [#197](https://github.com/raydak-labs/configarr/issues/197)

## [1.12.0](https://github.com/raydak-labs/configarr/compare/v1.11.0...v1.12.0) (2025-02-10)

### Features

- add support for cleaning up custom formats ([7a28d54](https://github.com/raydak-labs/configarr/commit/7a28d54f678d9231642c02d12c0df58ee97786dd)), closes [#191](https://github.com/raydak-labs/configarr/issues/191)
- add support for trash custom format groups ([c307377](https://github.com/raydak-labs/configarr/commit/c30737781a3ce47ddd6dafcc978fddcb33137d41)), closes [#185](https://github.com/raydak-labs/configarr/issues/185)

## [1.11.0](https://github.com/raydak-labs/configarr/compare/v1.10.3...v1.11.0) (2025-02-05)

### Features

- add option to disable specific instances in config ([e228ccb](https://github.com/raydak-labs/configarr/commit/e228ccb0820cdb54daf1608280f2a3e0f1304113)), closes [#184](https://github.com/raydak-labs/configarr/issues/184)

### Bug Fixes

- do gracefully stop instance processing if an error occurs. ([8f8fca5](https://github.com/raydak-labs/configarr/commit/8f8fca5013d5abec15b35accf568b44abc17027d))

### (internal) Refactorings

- log total execution summary ([35d0c30](https://github.com/raydak-labs/configarr/commit/35d0c3049c2696a940147468c187380b08274d6f))

## [1.10.3](https://github.com/raydak-labs/configarr/compare/v1.10.2...v1.10.3) (2025-02-03)

### Bug Fixes

- correctly set language for new QualityProfiles ([9ab962b](https://github.com/raydak-labs/configarr/commit/9ab962bd469bb838ba7158594f1f841120890cdb)), closes [#180](https://github.com/raydak-labs/configarr/issues/180)
- **deps:** pin dependency raw-loader to 4.0.2 ([#171](https://github.com/raydak-labs/configarr/issues/171)) ([1fd8d46](https://github.com/raydak-labs/configarr/commit/1fd8d460f0d331970bc70d53eeac2830be7074d7))
- **deps:** update dependency docusaurus-lunr-search to v3.6.0 ([#175](https://github.com/raydak-labs/configarr/issues/175)) ([1afcaa2](https://github.com/raydak-labs/configarr/commit/1afcaa2428590509ee94fc8c0d80bd13c3cccb6c))

## [1.10.2](https://github.com/raydak-labs/configarr/compare/v1.10.1...v1.10.2) (2025-01-23)

## [1.10.1](https://github.com/raydak-labs/configarr/compare/v1.10.0...v1.10.1) (2025-01-21)

### Bug Fixes

- use new cfs in existin g qps correctly ([d24aaa6](https://github.com/raydak-labs/configarr/commit/d24aaa6cfc97806a932389f12d41ae4cecc17719)), closes [#164](https://github.com/raydak-labs/configarr/issues/164)

## [1.10.0](https://github.com/raydak-labs/configarr/compare/v1.9.0...v1.10.0) (2025-01-19)

### Features

- add experimental support for cloning quality profiles ([18941ec](https://github.com/raydak-labs/configarr/commit/18941ec259832f291474e5f140fb3f525ed5872c))
- add experimental support for quality profiles renaming ([504dfe3](https://github.com/raydak-labs/configarr/commit/504dfe3ff4de7df841878d9bf6524201d335ec46))

## [1.9.0](https://github.com/raydak-labs/configarr/compare/v1.8.0...v1.9.0) (2025-01-15)

### Features

- allow configuring quality sizes / definitions with config and templates (alpha) ([f41891b](https://github.com/raydak-labs/configarr/commit/f41891bd87b877cc3c292c737d0dca8e060932d8)), closes [#140](https://github.com/raydak-labs/configarr/issues/140)

### (internal) Refactorings

- ensure all quality definitions always exist if updated ([6aa37cd](https://github.com/raydak-labs/configarr/commit/6aa37cd9eafa6dfa748462508d7c1b0d9679ce0a))
- ignore empty local templates ([1454670](https://github.com/raydak-labs/configarr/commit/145467033c2282078a41cce98322819032ce340b))
- restructure trash QD preferred scaling ([53da038](https://github.com/raydak-labs/configarr/commit/53da0381ce928aa743f7f2655b00fc9b40c5349f))

## [1.8.0](https://github.com/raydak-labs/configarr/compare/v1.7.0...v1.8.0) (2025-01-13)

### Features

- add experimental lidarr support ([2093ae0](https://github.com/raydak-labs/configarr/commit/2093ae0fc3fc49b3bb3d77042d33f1ddd45036e4))

### Bug Fixes

- handle local templates as recyclarr templates correctly ([10d7bdb](https://github.com/raydak-labs/configarr/commit/10d7bdb1622ed7b3adbb06bda7d048f113ce24dd))

## [1.7.0](https://github.com/raydak-labs/configarr/compare/v1.6.0...v1.7.0) (2025-01-13)

### Features

- use language from TrashQPs ([7e8981b](https://github.com/raydak-labs/configarr/commit/7e8981b54d5296e1dc9830e4ab7342a948c66fc0))

### (internal) Refactorings

- only build update object for objects with keys ([7abe91c](https://github.com/raydak-labs/configarr/commit/7abe91cb9438fb43ff16d92edb1ae7d2e8693e39))

## [1.6.0](https://github.com/raydak-labs/configarr/compare/v1.5.3...v1.6.0) (2025-01-10)

### Features

- add media_naming compatibility from recyclarr ([3cf73dc](https://github.com/raydak-labs/configarr/commit/3cf73dc2cbbff6fabd1b6e82a9b5b813a307ef26))

### Bug Fixes

- adjust qualityprofile items to always include items key ([9ed86b3](https://github.com/raydak-labs/configarr/commit/9ed86b306c1e8c26bbc4a8c466acf3c84f0240d3))
- correct customFormatDefinition loading from top level ([f841617](https://github.com/raydak-labs/configarr/commit/f841617c282d0426625824a7b36939df688854ce))

### (internal) Refactorings

- create trash cache for optimization ([d142fee](https://github.com/raydak-labs/configarr/commit/d142feeda4dcccc0649d4c0ce2d65836d23640bc))
- improve types ([f44eb35](https://github.com/raydak-labs/configarr/commit/f44eb3521401ef44943b71e0921c52e97a3ca2d9))

## [1.5.3](https://github.com/raydak-labs/configarr/compare/v1.5.2...v1.5.3) (2025-01-08)

### Bug Fixes

- allow loading custom format definition correctly from templates ([a5f0f92](https://github.com/raydak-labs/configarr/commit/a5f0f9211b6eac001b9467476aab2a19c93ec6aa))

### (internal) Refactorings

- make CF loading cleaner ([5b33849](https://github.com/raydak-labs/configarr/commit/5b33849e8d30d53e38c2503c33d319035d02b9a0))
- move merge config to config.ts ([388875d](https://github.com/raydak-labs/configarr/commit/388875dd2240866b071df67d3560e5d461bc2bb7))

## [1.5.2](https://github.com/raydak-labs/configarr/compare/v1.5.1...v1.5.2) (2025-01-03)

### Bug Fixes

- correctly set preferred size value if adjusted by ratio ([5d9dc5c](https://github.com/raydak-labs/configarr/commit/5d9dc5c652f9288063391bb5317f31ad2a9d50dc))
- **deps:** pin dependency zod to 3.24.1 ([#133](https://github.com/raydak-labs/configarr/issues/133)) ([3773dde](https://github.com/raydak-labs/configarr/commit/3773ddeb7ffecb7bc979d5fa27f6f091f983e983))
- **deps:** update dependencies (non-major) ([#135](https://github.com/raydak-labs/configarr/issues/135)) ([3ac7b7c](https://github.com/raydak-labs/configarr/commit/3ac7b7c5cad63ac3acc99a3cd95fe3c9854634f6))
- **deps:** update react monorepo to v19 ([c57a95b](https://github.com/raydak-labs/configarr/commit/c57a95b2394875843d2554d4a1fb910ca32a96be))
- use quality_defintion from main config if defined ([94d1861](https://github.com/raydak-labs/configarr/commit/94d186160832a2249dfa7626d532a690d91ea72a))

### (internal) Refactorings

- rename variables in code only ([f2f3736](https://github.com/raydak-labs/configarr/commit/f2f37362153bbc09b8633f710b506ed5d26d9db5))

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
