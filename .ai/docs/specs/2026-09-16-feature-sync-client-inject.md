# Feature syncers: inject typed client

Status: in-tree experiment (uncommitted). Builds on per-arr instance syncers.

## Decision

Thin Pattern A files that only bound `getClient("LITERAL")` (and a generated enum) were type adapters, not behaviour. Instance syncers already have the literal client.

**Keep a per-arr class only when behaviour or generated payload differs.** Otherwise construct the shared base with the typed client (and that arr’s enum when mapping needs it).

Rejected:

- `FooSync<T extends MediaArrType>` + `getClient(arrType)` inside — a variable cannot carry five `DownloadProtocol` enums.
- Constructor flags on quality profiles (`language: boolean`) — writes optional fields onto a shared DTO (IArrClient recurrence).
- Deleting quality-profile product files — language / `minUpgradeFormatScore` combos are real adapters. Keep the five QP classes; inject the client.
- Passing `DownloadProtocol` into `SonarrSyncer` _and_ keeping `DelayProfileSonarrSync` — pick one bind site. Bind the enum next to the standard mapper (`StandardDelayProfileSync` / instance syncer).

## Shape

```ts
const client = getClient("SONARR");
new StandardDelayProfileSync(client, DownloadProtocol);
new QualityDefinitionPreferredSync(client);
new BaseMediaManagementSync(client);
new PathRootFolderSync(client);
new QualityProfileSonarrSync(client); // still a class: language hooks
```

Lidarr delay, Lidarr/Readarr root folders, Lidarr/Readarr metadata stay dedicated classes. Readarr QD uses `QualityDefinitionSync` (no preferred size).

`createXSync(arrType)` remains for tests (`vi.mock(getClient)`). Production instance syncers construct directly.

## Extension

| Change                                                   | Where                                                                                                 |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| New arr, standard delay / preferred QD / path roots / MM | New `*Syncer` + `new StandardDelayProfileSync(client, FooDownloadProtocol)` etc. No new feature file. |
| New arr, Radarr-like QP                                  | New `qualityProfileFoo.ts` (or reuse an existing combo if identical).                                 |
| Lidarr-only payload (`items[]`, named root folders)      | Dedicated class, constructor takes `LidarrClient`.                                                    |
| Shared lifecycle                                         | The base only.                                                                                        |
