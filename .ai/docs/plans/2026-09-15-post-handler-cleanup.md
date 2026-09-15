# Post-handler cleanup (bugs, N+1, leftovers)

Status: implemented (2026-09-15). Follows generated-contracts / handler-split. Cross-checked against the tree.

Constraints: pnpm; no `CHANGELOG.md`; no `toContract` / DI / handler cache / `Merged*`; Pattern A one class file per *arr; YAML→enum via that arr’s enum object; OpenAPI extras as intersection in that arr file; `src/<feature>/*.types.ts` = YAML / TRaSH / diff only; `QualityProfileShared` stays a mapping DTO.

Validation per item: `pnpm typecheck && pnpm test && pnpm lint`. Commit after each numbered item.

---

## Implement 1–9

### 1. Await Sonarr quality-definition PUT

**What.** `SonarrClient.updateQualityDefinitions` fires PUT and immediately GETs without waiting. Other arrs `await` the PUT. The following GET can run against stale data (or race the write).

**Today** (`src/clients/sonarr-client.ts`):

```ts
async updateQualityDefinitions(definitions: QualityDefinitionResource[]) {
  this.api.v3QualitydefinitionUpdateUpdate(definitions); // not awaited
  return this.api.v3QualitydefinitionList();
}
```

**Target** — match Lidarr / Readarr / Whisparr / Radarr:

```ts
async updateQualityDefinitions(definitions: QualityDefinitionResource[]) {
  await this.api.v3QualitydefinitionUpdateUpdate(definitions);
  return this.api.v3QualitydefinitionList();
}
```

OpenAPI PUT is `Promise<void>` — the GET after it is still required. Only the missing `await` is the bug.

---

### 2. Drop Radarr stray language GET; reuse QD PUT follow-up

**What.** Two wastes stacked:

1. Radarr `updateQualityDefinitions` fire-and-forgets `v3LanguageList()` and ignores the result. Languages are unrelated to QD writes.
2. That method already GETs definitions after PUT. `QualityDefinitionSync.persist` discards the return, then `index.ts` GETs again:

```ts
await this.updateOnServer(restData);
return { changeMap, restData }; // restData = payload we sent, not server GET
// index.ts:
serverCache.qualityDefinitions = await qdSync.loadFromServer();
```

**Today** (`src/clients/radarr-client.ts`):

```ts
async updateQualityDefinitions(definitions: QualityDefinitionResource[]) {
  await this.api.v3QualitydefinitionUpdateUpdate(definitions);
  this.api.v3LanguageList(); // discarded, not awaited
  return this.getQualityDefinitions();
}
```

**Target**

Client (Radarr, same shape as the others — PUT then GET, no language):

```ts
async updateQualityDefinitions(definitions: QualityDefinitionResource[]) {
  await this.api.v3QualitydefinitionUpdateUpdate(definitions);
  return this.getQualityDefinitions();
}
```

Persist returns the server list after write:

```ts
async persist(serverQDs: T[], qualityDefinitions: TrashQualityDefinitionQuality[], write: boolean) {
  const { changeMap, restData } = this.calculateDiff(serverQDs, qualityDefinitions);
  if (changeMap.size > 0 && write) {
    const updated = await this.updateOnServer(restData);
    return { changeMap, restData: updated };
  }
  return { changeMap, restData };
}
```

Pipeline uses that instead of a second GET:

```ts
const { changeMap, restData } = await qdSync.persist(serverCache.qualityDefinitions, mergedQDs, writeQd);
if (changeMap.size > 0 && writeQd) {
  serverCache.qualityDefinitions = restData;
}
```

---

### 3. `areTagsEqual` must not mutate

**What.** `[].sort()` sorts in place. `getProfileTags` returns the live `serverProfile.tags` array. Compare then mutates server state (order of tags on the object we may later write or log).

**Today** (`src/delayProfiles/delayProfileBase.ts`):

```ts
export function areTagsEqual(tags1: number[], tags2: number[]): boolean {
  return tags1.length === tags2.length && tags1.sort().join(",") === tags2.sort().join(",");
}

export function getProfileTags(profile: { tags?: number[] | null }): number[] {
  return Array.isArray(profile.tags) ? profile.tags : [];
}
```

Call site:

```ts
if (!areTagsEqual(mappedTags || [], getProfileTags(serverProfile))) {
  changes.push({ field: "tags", from: getProfileTags(serverProfile), to: mappedTags || [] });
}
```

**Target** — copy before sort. Keep the same equality rule (order-insensitive):

```ts
export function areTagsEqual(tags1: number[], tags2: number[]): boolean {
  if (tags1.length !== tags2.length) return false;
  const a = [...tags1].sort((x, y) => x - y);
  const b = [...tags2].sort((x, y) => x - y);
  return a.every((v, i) => v === b[i]);
}
```

Add a unit test: after compare, original arrays still have their original order.

---

### 4. Lidarr / Readarr root folders: fetch QP + metadata once

**What.** `resolveRootFolderConfig` GETs quality profiles and metadata profiles on **every** call. `calculateDiff` calls it once per existing folder; persist calls it again for creates/updates.

Pipeline order already loaded `serverCache.qualityProfiles` and just synced metadata. N folders → 2N list GETs.

**Today** (`rootFolderLidarr.ts` / `rootFolderReadarr.ts`):

```ts
const [qualityProfiles, metadataProfiles] = await Promise.all([this.getApi().getQualityProfiles(), this.getApi().getMetadataProfiles()]);
```

**Target** — memoize maps on the handler instance for the run. Prefer `serverCache.qualityProfiles` when it has entries (pipeline); otherwise GET (tests that only mock the client). Metadata is not on cache — GET once, reuse.

```ts
private profileIdMaps: { quality: Map<string, number>; metadata: Map<string, number> } | null = null;

private async getProfileIdMaps(serverCache: ServerCache) {
  if (this.profileIdMaps) return this.profileIdMaps;

  const quality = new Map<string, number>();
  const cached = serverCache.qualityProfiles;
  if (cached.length > 0) {
    for (const p of cached) {
      if (p.name && p.id !== undefined) quality.set(p.name, p.id);
    }
  } else {
    for (const p of await this.getApi().getQualityProfiles()) {
      if (p.name && p.id !== undefined) quality.set(p.name, p.id);
    }
  }

  const metadata = new Map<string, number>();
  for (const p of await this.getApi().getMetadataProfiles()) {
    if (p.name && p.id !== undefined) metadata.set(p.name, p.id);
  }

  this.profileIdMaps = { quality, metadata };
  return this.profileIdMaps;
}
```

`resolveRootFolderConfig` uses `getProfileIdMaps` instead of fetching inline.

Do **not** add metadata to `ServerCache` here (that would mix item 4 with a cache-shape change). Same instance is used for diff + persist (`syncRootFolders` → one `createRootFolderSync`).

Tests: existing mocks still work via the empty-cache GET fallback. Optional: assert `getQualityProfiles` / `getMetadataProfiles` called once across two `resolveRootFolderConfig` calls.

---

### 5. Delay default update uses the loaded server id

**What.** Default delay profile is usually id `1` in *arr, but we already loaded the default (empty tags). Hardcoding `"1"` is wrong if the server id differs.

**Today**:

```ts
async updateDefaultFromConfig(profile: InputConfigDelayProfile, tags: Tag[]) {
  await this.updateOnServer("1", this.mapToServer(profile, tags));
}
```

Diff already has `serverDefault` inside `calculateDelayProfilesDiffFor` but drops the id.

**Target** — put the id on the diff; persist uses it.

```ts
export interface DelayProfilesDiff {
  // ...
  defaultProfileId?: string;
}

return {
  // ...
  defaultProfileId: serverDefault?.id != null ? String(serverDefault.id) : undefined,
};

async updateDefaultFromConfig(profile: InputConfigDelayProfile, tags: Tag[], id: string) {
  await this.updateOnServer(id, this.mapToServer(profile, tags));
}
```

Pipeline:

```ts
if (!delayProfilesDiff.defaultProfileId) {
  throw new Error("Default delay profile id missing from server; cannot update.");
}
await delaySync.updateDefaultFromConfig(delayProfilesDiff.defaultProfile, serverCache.tags, delayProfilesDiff.defaultProfileId);
```

Test helper `updateDelayProfileOnServer` takes the same `id`. Unit test: diff includes `defaultProfileId` from server `id`.

---

### 6. Metadata profiles: `getApi()` + drop `T = any`

**What.** Metadata is the leftover from the CRUD lift. Base still has `T = any`, `api: LidarrClient | ReadarrClient`, and four duplicated pass-through methods. `performDeletion` GETs the list again after `calculateDiff` already loaded it.

**Today**:

```ts
export abstract class BaseMetadataProfileSync<T extends BaseMetadataProfileResource = any> {
  protected abstract api: LidarrClient | ReadarrClient;
  protected abstract loadFromServer(): Promise<T[]>;
  protected abstract createMetadataProfile(resolvedConfig: T): Promise<T>;
  protected abstract updateMetadataProfile(id: string, resolvedConfig: T): Promise<T>;
  protected abstract deleteProfile(id: string): Promise<void>;
  // ...
  const serverProfiles = await this.loadFromServer(); // second GET in performDeletion
```

Lidarr subclass:

```ts
protected api: LidarrClient = getClient("LIDARR");
protected createMetadataProfile(...) { return this.api.createMetadataProfile(...); }
```

**Target** — same as delay / QD: capability + `getApi()`.

`src/clients/capabilities.ts`:

```ts
export interface MetadataProfilesClient<T extends { id?: number; name?: string | null }> {
  getMetadataProfiles(): Promise<T[]>;
  createMetadataProfile(profile: T): Promise<T>;
  updateMetadataProfile(id: string, profile: T): Promise<T>;
  deleteMetadataProfile(id: string): Promise<void>;
}
```

LidarrClient / ReadarrClient `implements MetadataProfilesClient<MetadataProfileResource>` (methods already exist).

Base:

```ts
export abstract class BaseMetadataProfileSync<T extends BaseMetadataProfileResource> {
  protected abstract getApi(): MetadataProfilesClient<T>;
  protected loadedFromServer: T[] | null = null;

  protected async loadFromServer(): Promise<T[]> {
    const profiles = await this.getApi().getMetadataProfiles();
    this.loadedFromServer = profiles;
    return profiles;
  }

  protected createMetadataProfile(resolvedConfig: T) {
    return this.getApi().createMetadataProfile(resolvedConfig);
  }
  // update / delete same way
}
```

`performDeletion` uses `this.loadedFromServer ?? (await this.loadFromServer())`. Pre-sync list is enough: unmanaged delete keys off names, newly created profiles are in `managedNames`.

Lidarr schema fetch stays on the literal client (not on the capability):

```ts
schemaTemplate = await getClient("LIDARR").getMetadataProfileSchema();
```

Replace `(p: any)` filters with `T`. `MetadataProfileDiff` default `= any` → `= BaseMetadataProfileResource`.

Keep one class file per arr. Do not mash Lidarr+Readarr.

---

### 7. Dead `ServerCache` bag + unused DC schema on cache

**What.** `ServerCache` has a string-key `get`/`set` bag nobody calls, and `getDownloadClientSchema` / `setDownloadClientSchema` unused — download clients already memoize on `this.schema`.

**Today**:

```ts
private cache: Record<string, unknown> = {};
public get<T>(key: string): T | null { ... }
public set<T>(key: string, value: T): void { ... }

private _downloadClientSchema: DownloadClientShared[] | null = null;
public getDownloadClientSchema(): DownloadClientShared[] | null { ... }
public setDownloadClientSchema(schema: DownloadClientShared[]): void { ... }
```

**Target** — delete those fields/methods and the unused `DownloadClientShared` import. Typed getters (`qualityDefinitions`, `tags`, …) stay. Handler `this.schema` stays.

---

### 8. `LOAD_LOCAL_SAMPLES` through the one handler

**What.** Pipeline already constructs `qdSync` / `qpSync` once, then for samples calls helpers that _can_ construct a second factory (non-sample fallback). Sample path should go through the same instance.

**Today** (`src/index.ts`):

```ts
const qdSync = createQualityDefinitionSync(arrType);
const serverQD = getEnvs().LOAD_LOCAL_SAMPLES ? await loadQualityDefinitionFromServer(arrType) : await qdSync.loadFromServer();
// later:
const serverQP = getEnvs().LOAD_LOCAL_SAMPLES ? await loadQualityProfilesFromServer(arrType) : await qpSync.loadFromServer();
```

**Target** — `loadFromServer` on the handler checks the env:

```ts
loadFromServer() {
  if (getEnvs().LOAD_LOCAL_SAMPLES) {
    return loadJsonFile(path.resolve(__dirname, "../../tests/samples/qualityDefinition.json"));
  }
  return this.getApi().getQualityDefinitions();
}
```

Same for QP with `quality_profiles.json`.

Pipeline always:

```ts
const serverQD = await qdSync.loadFromServer();
const serverQP = await qpSync.loadFromServer();
```

Helpers become `createXSync(arrType).loadFromServer()` (tests keep working). `persist` / writes are not used under samples in a meaningful way; do not special-case writes.

---

### 9. Drop `compareNaming` / `compareMediamanagement` aliases

**What.** Both are `any`-typed pass-throughs to `compareObjectsCarr`. Only `mediaManagementBase.ts` calls them.

**Today**:

```ts
export function compareNaming(serverObject: any, localObject: any) {
  return compareObjectsCarr(serverObject, localObject);
}
export function compareMediamanagement(serverObject: any, localObject: any) {
  return compareObjectsCarr(serverObject, localObject);
}
```

**Target** — call `compareObjectsCarr` at the two call sites; delete the aliases. No behavior change.

---

## Skip (documented, do not implement)

### S1. Force QP writes onto generic `T` (`as T`)

Base `getApi()` takes `QualityProfileShared` on create/update because `QualityProfileShared` is the mapping DTO. Generated `QualityProfileResource` per arr is not that DTO. Forcing `QualityProfilesClient<T>` needs `as T` at the write — worse than today’s local getApi type.

Leave as-is.

### S2. Collapse thin per-arr class files

Pattern A: one class file per *arr even when the body is `getApi()` + a couple of attach methods. Shared behavior lives on the typed base (`PathRootFolderSync`, `QualityDefinitionPreferredSync`, …). Do not revive `*Generic.ts` or mash names (`qualityProfileLidarrReadarr.ts`).

### S3. Split Pattern B custom formats into five handlers

CF method set **and** field set are the same. Capability generic + one module. Request type must be assignable to each arr’s generated resource.

### S4. Kill test wrappers that `createXSync()` per call

`calculateQualityProfilesDiff(arrType, …)` / `deleteQualityProfile(arrType, …)` in syncers exist for tests and e2e. `index.ts` already uses one instance. Not worth churning every test import.

### S5. Stop `cloneWithJSON` in quality-profile mapping

QP payloads are small. Cloning avoids mutating cache objects. Micro-optimization, not a bug.

### S6. Skip `getLanguages()` for Lidarr / Readarr

`ServerCache` still requires languages in the constructor. Lidarr QP ignores `language`, but the extra GET is one per instance run. Special-casing arrs is not worth it.

### S7. Split UI config / remote paths / download-client-config by arr

Generated write types have not been shown to diverge the way delay protocol enums do. Stay one module until a real field/method split appears.

### S8. Unify error policy (DC swallow vs delay throw)

Download clients wrap persist in try/catch and log; delay profiles throw. Product choice, not a refactor. Pick one in a dedicated change if desired.

### S9. Rename `GenericDelayProfileFields`

Internal type name leftover from the old generic file. Cosmetic. Compare keys are the standard usenet/torrent fields — fine.

### S10. `MergedConfigInstance` / DI / handler instance cache

Explicitly out of scope. Pipeline `MediaArrType` variables stay. One factory switch per feature, then literal `getClient("SONARR")`.
