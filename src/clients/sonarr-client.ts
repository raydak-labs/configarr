import { KyHttpClient } from "../ky-client";
import { Api as SonarrApiV3 } from "../__generated__/sonarr/Api";
import { Api as SonarrApiV5 } from "../__generated__/sonarr-v5/Api";
import {
  DelayProfileResource,
  DownloadClientConfigResource,
  DownloadClientResource,
  MediaManagementConfigResource,
  NamingConfigResource,
  QualityDefinitionResource,
  QualityProfileResource,
  RemotePathMappingResource,
  ReleaseProfileResource,
  RootFolderResource,
  SystemResource,
  TagResource,
  UiConfigResource,
  CustomFormatResource,
} from "../__generated__/sonarr/data-contracts";
import type {
  ApiInfoResource as SonarrApiInfoV5,
  CustomFormatResource as SonarrCustomFormatV5,
  CustomFormatSpecificationSchema as SonarrCustomFormatSpecificationV5,
  MediaManagementSettingsResource as SonarrMediaManagementV5,
  NamingSettingsResource as SonarrNamingV5,
  QualityProfileQualityItemResource as SonarrQualityItemV5,
  QualityDefinitionResource as SonarrQualityDefinitionV5,
  QualityProfileResource as SonarrQualityProfileV5,
  ReleaseProfileResource as SonarrReleaseProfileV5,
  SystemResource as SonarrSystemV5,
} from "../__generated__/sonarr-v5/data-contracts";
import { SkipValidation } from "../__generated__/sonarr-v5/data-contracts";
import { logger } from "../logger";
import type { CustomFormatRequest } from "../customFormats/customFormat.types";
import { forceSaveIfDisabled, logConnectionError, validateClientParams } from "./connection";
import {
  CustomFormatsClient,
  DownloadClientsClient,
  QualityDefinitionsClient,
  QualityProfilesClient,
  SystemClient,
  TagsClient,
} from "./capabilities";

type QualitySize = Pick<QualityDefinitionResource, "minSize" | "maxSize" | "preferredSize">;

export type SonarrProfileQualitySize = QualitySize & { quality: string };

export type SonarrProfileQualitySizes = {
  id: number;
  name: string;
  items: SonarrProfileQualitySize[];
};

function copyV5Naming(settings: SonarrNamingV5): NamingConfigResource {
  return { ...settings };
}

function copyV5QualityDefinition(definition: SonarrQualityDefinitionV5, sizes: QualitySize | undefined): QualityDefinitionResource {
  return {
    id: definition.id,
    quality: definition.quality,
    title: definition.title,
    weight: definition.weight,
    minSize: sizes?.minSize,
    maxSize: sizes?.maxSize,
    preferredSize: sizes?.preferredSize,
  };
}

function copyV5QualityProfile(profile: SonarrQualityProfileV5): QualityProfileResource {
  return {
    id: profile.id,
    name: profile.name,
    upgradeAllowed: profile.upgradeAllowed,
    cutoff: profile.cutoff,
    items: profile.items?.map((item) => ({
      id: item.id,
      name: item.name,
      quality: item.quality,
      items: item.items?.map(copyV5QualityProfileItem),
      allowed: item.allowed,
    })),
    minFormatScore: profile.minFormatScore,
    cutoffFormatScore: profile.cutoffFormatScore,
    minUpgradeFormatScore: profile.minUpgradeFormatScore,
    formatItems: profile.formatItems,
  };
}

function copyV5QualityProfileItem(item: SonarrQualityItemV5): NonNullable<QualityProfileResource["items"]>[number] {
  return {
    id: item.id,
    name: item.name,
    quality: item.quality,
    items: item.items?.map(copyV5QualityProfileItem),
    allowed: item.allowed,
  };
}

function copyV5ReleaseProfile(profile: SonarrReleaseProfileV5): ReleaseProfileResource {
  return {
    id: profile.id,
    name: profile.name,
    enabled: profile.enabled,
    required: profile.required,
    ignored: profile.ignored,
    indexerId: profile.indexerIds?.[0] ?? 0,
    tags: profile.tags,
  };
}

function copyV5MediaManagement(settings: SonarrMediaManagementV5): MediaManagementConfigResource {
  return {
    id: settings.id,
    autoUnmonitorPreviouslyDownloadedEpisodes: settings.autoUnmonitorPreviouslyDownloadedEpisodes,
    recycleBin: settings.recycleBin,
    recycleBinCleanupDays: settings.recycleBinCleanupDays ?? undefined,
    downloadPropersAndRepacks: settings.downloadPropersAndRepacks,
    createEmptySeriesFolders: settings.createEmptySeriesFolders,
    deleteEmptyFolders: settings.deleteEmptyFolders,
    fileDate: settings.fileDate,
    rescanAfterRefresh: settings.rescanAfterRefresh,
    setPermissionsLinux: settings.setPermissionsLinux,
    chmodFolder: settings.chmodFolder,
    chownGroup: settings.chownGroup,
    episodeTitleRequired: settings.episodeTitleRequired,
    skipFreeSpaceCheckWhenImporting: settings.skipFreeSpaceCheckWhenImporting,
    minimumFreeSpaceWhenImporting: settings.minimumFreeSpaceWhenImporting ?? undefined,
    copyUsingHardlinks: settings.copyUsingHardlinks,
    useScriptImport: settings.useScriptImport,
    scriptImportPath: settings.scriptImportPath,
    importExtraFiles: settings.importExtraFiles,
    extraFileExtensions: settings.extraFileExtensions,
    enableMediaInfo: settings.enableMediaInfo,
  };
}

function mergeV5MediaManagement(
  settings: MediaManagementConfigResource,
  current: SonarrMediaManagementV5 | undefined,
): SonarrMediaManagementV5 {
  return {
    ...current,
    ...settings,
    recycleBinCleanupDays: settings.recycleBinCleanupDays ?? current?.recycleBinCleanupDays ?? null,
    minimumFreeSpaceWhenImporting: settings.minimumFreeSpaceWhenImporting ?? current?.minimumFreeSpaceWhenImporting ?? null,
  };
}

function toV5CustomFormat(format: CustomFormatRequest, specificationSchemas: SonarrCustomFormatSpecificationV5[]): SonarrCustomFormatV5 {
  return {
    id: format.id,
    name: format.name,
    includeCustomFormatWhenRenaming: format.includeCustomFormatWhenRenaming,
    specifications:
      format.specifications?.map((specification) => {
        const schema = specificationSchemas.find((candidate) => candidate.implementation === specification.implementation);
        if (!schema) {
          throw new Error(
            `Sonarr v5 did not provide a schema for custom-format specification '${specification.implementation ?? "unknown"}'.`,
          );
        }

        const fields = specification.fields ?? [];
        return {
          id: specification.id,
          name: specification.name ?? schema.name,
          implementation: specification.implementation ?? schema.implementation,
          implementationName: schema.implementationName,
          infoLink: schema.infoLink,
          negate: specification.negate,
          required: specification.required,
          fields: (schema.fields ?? []).map((field) => ({
            ...field,
            ...fields.find((requestField) => requestField.name === field.name),
          })),
        };
      }) ?? null,
  };
}

function collectQualitySizes(items: SonarrQualityProfileV5["items"], sizes: Map<string, QualitySize[]>): void {
  for (const item of items ?? []) {
    if (item.quality?.name) {
      const found = sizes.get(item.quality.name) ?? [];
      found.push({ minSize: item.minSize, maxSize: item.maxSize, preferredSize: item.preferredSize });
      sizes.set(item.quality.name, found);
    }
    collectQualitySizes(item.items, sizes);
  }
}

function collectProfileQualitySizes(items: SonarrQualityProfileV5["items"]): SonarrProfileQualitySize[] {
  const sizes: SonarrProfileQualitySize[] = [];
  const collect = (qualityItems: SonarrQualityProfileV5["items"]) => {
    for (const item of qualityItems ?? []) {
      if (item.quality?.name) {
        sizes.push({
          quality: item.quality.name,
          minSize: item.minSize,
          maxSize: item.maxSize,
          preferredSize: item.preferredSize,
        });
      }
      collect(item.items);
    }
  };
  collect(items);
  return sizes;
}

function mergeProfileQualitySizes(
  items: SonarrQualityProfileV5["items"],
  sizes: ReadonlyMap<string, QualitySize>,
): SonarrQualityProfileV5["items"] {
  if (items == null) {
    return items;
  }
  return items.map((item) => {
    const configured = item.quality?.name ? sizes.get(item.quality.name) : undefined;
    const updated: SonarrQualityItemV5 = { ...item };
    if (item.items != null) {
      updated.items = mergeProfileQualitySizes(item.items, sizes);
    }

    for (const field of ["minSize", "maxSize", "preferredSize"] as const) {
      if (configured?.[field] !== undefined) {
        updated[field] = configured[field];
      }
    }
    return updated;
  });
}

function commonQualitySizes(profiles: SonarrQualityProfileV5[]): Map<string, QualitySize> {
  const allSizes = new Map<string, QualitySize[]>();
  for (const profile of profiles) collectQualitySizes(profile.items, allSizes);

  const common = new Map<string, QualitySize>();
  for (const [name, entries] of allSizes) {
    const result: QualitySize = {};
    for (const field of ["minSize", "maxSize", "preferredSize"] as const) {
      const first = entries[0]?.[field];
      if (entries.every((entry) => entry[field] === first)) {
        result[field] = first;
      }
    }
    common.set(name, result);
  }
  return common;
}

function mergeV5QualityItems(
  desiredItems: QualityProfileResource["items"],
  currentItems: SonarrQualityProfileV5["items"],
  sizes: Map<string, QualitySize>,
): SonarrQualityItemV5[] {
  return (desiredItems ?? []).map((item) => {
    const qualityName = item.quality?.name;
    const existing = currentItems?.find((candidate) =>
      item.id != null ? candidate.id === item.id : qualityName ? candidate.quality?.name === qualityName : candidate.name === item.name,
    );
    const configuredSize = qualityName ? sizes.get(qualityName) : undefined;
    const mergedSize: QualitySize = {};

    for (const field of ["minSize", "maxSize", "preferredSize"] as const) {
      if (existing?.[field] !== undefined) {
        mergedSize[field] = existing[field];
      } else if (configuredSize && configuredSize[field] !== undefined) {
        mergedSize[field] = configuredSize[field];
      }
    }

    return {
      id: item.id,
      name: item.name,
      quality: item.quality,
      items: mergeV5QualityItems(item.items, existing?.items, sizes),
      allowed: item.allowed,
      ...mergedSize,
    };
  });
}

export class SonarrClient
  implements
    SystemClient,
    TagsClient,
    DownloadClientsClient<DownloadClientResource>,
    QualityProfilesClient<QualityProfileResource>,
    CustomFormatsClient<CustomFormatResource>,
    QualityDefinitionsClient<QualityDefinitionResource>
{
  private apiV3!: SonarrApiV3<unknown>;
  private apiV5!: SonarrApiV5<unknown>;
  private apiVersion?: Promise<"v3" | "v5">;
  private v5QualitySizes = new Map<string, QualitySize>();
  private v5QualityProfiles: SonarrQualityProfileV5[] = [];
  private v5ReleaseProfiles: SonarrReleaseProfileV5[] = [];
  private v5CustomFormatSchema?: Promise<SonarrCustomFormatSpecificationV5[]>;

  constructor(baseUrl: string, apiKey: string) {
    this.initialize(baseUrl, apiKey);
  }

  private initialize(baseUrl: string, apiKey: string) {
    validateClientParams(baseUrl, apiKey, "SONARR");

    const httpClient = new KyHttpClient({
      headers: {
        "X-Api-Key": apiKey,
      },
      prefix: baseUrl,
    });

    this.apiV3 = new SonarrApiV3(httpClient);
    this.apiV5 = new SonarrApiV5(httpClient);
  }

  private getApiVersion(): Promise<"v3" | "v5"> {
    const apiVersion = (this.apiVersion ??= this.apiV5.http
      .request<SonarrApiInfoV5>({ path: "/api", method: "GET", secure: true })
      .then(({ current }) => {
        if (current !== "v3" && current !== "v5") {
          throw new Error(`Unsupported Sonarr API version '${current ?? "unknown"}'. Expected v3 or v5.`);
        }
        return current;
      }));

    return apiVersion;
  }

  private async versioned<T>(v3: () => Promise<T>, v5: () => Promise<T>): Promise<T> {
    return (await this.getApiVersion()) === "v3" ? v3() : v5();
  }

  async getLanguages() {
    return this.versioned(
      () => this.apiV3.v3LanguageList(),
      () => this.apiV5.v5LanguageList(),
    );
  }

  // Quality Management
  getQualityDefinitions() {
    return this.versioned(
      () => this.apiV3.v3QualitydefinitionList(),
      async () => {
        const [definitions, profiles] = await Promise.all([this.apiV5.v5QualitydefinitionList(), this.apiV5.v5QualityprofileList()]);
        this.v5QualityProfiles = profiles;
        this.v5QualitySizes = commonQualitySizes(profiles);
        return definitions.map((definition) =>
          copyV5QualityDefinition(definition, definition.quality?.name ? this.v5QualitySizes.get(definition.quality.name) : undefined),
        );
      },
    );
  }

  async updateQualityDefinitions(definitions: QualityDefinitionResource[]) {
    return this.versioned(
      async () => {
        await this.apiV3.v3QualitydefinitionUpdateUpdate(definitions);
        return this.apiV3.v3QualitydefinitionList();
      },
      async () => {
        const v5Definitions: SonarrQualityDefinitionV5[] = definitions.map(({ id, quality, title, weight }) => ({
          id,
          quality,
          title,
          weight,
        }));
        await this.apiV5.v5QualitydefinitionUpdate2(v5Definitions);
        return definitions;
      },
    );
  }

  // Quality Profiles
  getQualityProfiles() {
    return this.versioned(
      () => this.apiV3.v3QualityprofileList(),
      async () => {
        this.v5QualityProfiles = await this.apiV5.v5QualityprofileList();
        return this.v5QualityProfiles.map(copyV5QualityProfile);
      },
    );
  }

  async supportsProfileQualitySizes(): Promise<boolean> {
    return (await this.getApiVersion()) === "v5";
  }

  async getProfileQualitySizes(): Promise<SonarrProfileQualitySizes[]> {
    if (!(await this.supportsProfileQualitySizes())) {
      throw new Error("Sonarr per-profile quality sizes require the v5 API.");
    }
    const profiles = await this.apiV5.v5QualityprofileList();
    return profiles.flatMap((profile) =>
      profile.id == null || profile.name == null
        ? []
        : [{ id: profile.id, name: profile.name, items: collectProfileQualitySizes(profile.items) }],
    );
  }

  async updateProfileQualitySizes(profileId: string, overrides: readonly SonarrProfileQualitySize[]): Promise<void> {
    if (!(await this.supportsProfileQualitySizes())) {
      throw new Error("Sonarr per-profile quality sizes require the v5 API.");
    }
    const profiles = await this.apiV5.v5QualityprofileList();
    const current = profiles.find((profile) => profile.id === Number(profileId));
    if (current == null) {
      throw new Error(`Sonarr quality profile '${profileId}' was not found while updating quality sizes.`);
    }
    const sizes = new Map(overrides.map(({ quality, ...size }) => [quality, size]));
    await this.apiV5.v5QualityprofileUpdate(profileId, {
      ...current,
      items: mergeProfileQualitySizes(current.items, sizes),
    });
  }

  createQualityProfile(profile: QualityProfileResource) {
    return this.versioned(
      () => this.apiV3.v3QualityprofileCreate(profile),
      async () => {
        const created = await this.apiV5.v5QualityprofileCreate({
          ...profile,
          items: mergeV5QualityItems(profile.items, undefined, this.v5QualitySizes),
        });
        this.v5QualityProfiles.push(created);
        return copyV5QualityProfile(created);
      },
    );
  }

  updateQualityProfile(id: string, profile: QualityProfileResource) {
    return this.versioned(
      () => this.apiV3.v3QualityprofileUpdate(id, profile),
      async () => {
        const current = this.v5QualityProfiles.find((candidate) => candidate.id === Number(id));
        const updated = await this.apiV5.v5QualityprofileUpdate(id, {
          ...profile,
          items: mergeV5QualityItems(profile.items, current?.items, this.v5QualitySizes),
        });
        this.v5QualityProfiles = this.v5QualityProfiles.map((candidate) => (candidate.id === updated.id ? updated : candidate));
        return copyV5QualityProfile(updated);
      },
    );
  }

  deleteQualityProfile(id: string): Promise<void> {
    return this.versioned(
      () => this.apiV3.v3QualityprofileDelete(Number(id)),
      () => this.apiV5.v5QualityprofileDelete(Number(id)),
    );
  }

  // Custom Formats
  getCustomFormats() {
    return this.versioned(
      () => this.apiV3.v3CustomformatList(),
      () => this.apiV5.v5CustomformatList(),
    );
  }

  createCustomFormat(format: CustomFormatRequest) {
    return this.versioned(
      () => this.apiV3.v3CustomformatCreate(format),
      async () => {
        const schemas = await this.getV5CustomFormatSchema();
        return this.apiV5.v5CustomformatCreate(toV5CustomFormat(format, schemas));
      },
    );
  }

  updateCustomFormat(id: string, format: CustomFormatRequest) {
    return this.versioned(
      () => this.apiV3.v3CustomformatUpdate(id, format),
      async () => {
        const schemas = await this.getV5CustomFormatSchema();
        return this.apiV5.v5CustomformatUpdate(id, toV5CustomFormat(format, schemas));
      },
    );
  }

  private getV5CustomFormatSchema(): Promise<SonarrCustomFormatSpecificationV5[]> {
    return (this.v5CustomFormatSchema ??= this.apiV5.v5CustomformatSchemaList());
  }

  deleteCustomFormat(id: string) {
    return this.versioned(
      () => this.apiV3.v3CustomformatDelete(+id),
      () => this.apiV5.v5CustomformatDelete(+id),
    );
  }

  async getNaming(): Promise<NamingConfigResource> {
    return this.versioned(
      () => this.apiV3.v3ConfigNamingList(),
      async () => copyV5Naming(await this.apiV5.v5SettingsNamingList()),
    );
  }

  async updateNaming(id: string, data: NamingConfigResource): Promise<NamingConfigResource> {
    return this.versioned(
      () => this.apiV3.v3ConfigNamingUpdate(id, data),
      async () => copyV5Naming(await this.apiV5.v5SettingsNamingUpdate(id, data)),
    );
  }

  async getMediamanagement(): Promise<MediaManagementConfigResource> {
    return this.versioned(
      () => this.apiV3.v3ConfigMediamanagementList(),
      async () => copyV5MediaManagement(await this.apiV5.v5SettingsMediamanagementList()),
    );
  }

  async updateMediamanagement(id: string, data: MediaManagementConfigResource): Promise<MediaManagementConfigResource> {
    return this.versioned(
      () => this.apiV3.v3ConfigMediamanagementUpdate(id, data),
      async () => {
        const current = await this.apiV5.v5SettingsMediamanagementList();
        return copyV5MediaManagement(await this.apiV5.v5SettingsMediamanagementUpdate(id, mergeV5MediaManagement(data, current)));
      },
    );
  }

  async getUiConfig(): Promise<UiConfigResource> {
    return this.versioned(
      () => this.apiV3.v3ConfigUiList(),
      () => this.apiV5.v5SettingsUiList(),
    );
  }

  async updateUiConfig(id: string, data: UiConfigResource): Promise<UiConfigResource> {
    return this.versioned(
      () => this.apiV3.v3ConfigUiUpdate(id, data),
      () => this.apiV5.v5SettingsUiUpdate(id, data),
    );
  }

  async getRootfolders(): Promise<RootFolderResource[]> {
    return this.versioned(
      () => this.apiV3.v3RootfolderList(),
      () => this.apiV5.v5RootfolderList(),
    );
  }

  async addRootFolder(data: RootFolderResource): Promise<RootFolderResource> {
    return this.versioned(
      () => this.apiV3.v3RootfolderCreate(data),
      () => this.apiV5.v5RootfolderCreate(data),
    );
  }

  async updateRootFolder(id: string, data: RootFolderResource): Promise<RootFolderResource> {
    throw new Error("Sonarr does not support updating root folders");
  }

  async deleteRootFolder(id: string): Promise<void> {
    return this.versioned(
      () => this.apiV3.v3RootfolderDelete(+id),
      () => this.apiV5.v5RootfolderDelete(+id),
    );
  }

  // Delay Profiles
  async getDelayProfiles(): Promise<DelayProfileResource[]> {
    return this.versioned(
      () => this.apiV3.v3DelayprofileList(),
      () => this.apiV5.v5DelayprofileList(),
    );
  }

  async createDelayProfile(profile: DelayProfileResource): Promise<DelayProfileResource> {
    return this.versioned(
      () => this.apiV3.v3DelayprofileCreate(profile),
      () => this.apiV5.v5DelayprofileCreate(profile),
    );
  }

  async updateDelayProfile(id: string, data: DelayProfileResource): Promise<DelayProfileResource> {
    return this.versioned(
      () => this.apiV3.v3DelayprofileUpdate(id, data),
      () => this.apiV5.v5DelayprofileUpdate(id, data),
    );
  }

  async deleteDelayProfile(id: string): Promise<void> {
    return this.versioned(
      () => this.apiV3.v3DelayprofileDelete(+id),
      () => this.apiV5.v5DelayprofileDelete(+id),
    );
  }

  async getReleaseProfiles(): Promise<ReleaseProfileResource[]> {
    return this.versioned(
      () => this.apiV3.v3ReleaseprofileList(),
      async () => {
        this.v5ReleaseProfiles = await this.apiV5.v5ReleaseprofileList();
        return this.v5ReleaseProfiles.map(copyV5ReleaseProfile);
      },
    );
  }

  async createReleaseProfile(profile: ReleaseProfileResource): Promise<ReleaseProfileResource> {
    return this.versioned(
      () => this.apiV3.v3ReleaseprofileCreate(profile),
      async () => {
        const created = await this.apiV5.v5ReleaseprofileCreate({
          ...profile,
          airDateGracePeriod: 0,
          indexerIds: profile.indexerId === undefined || profile.indexerId <= 0 ? [] : [profile.indexerId],
        });
        this.v5ReleaseProfiles.push(created);
        return copyV5ReleaseProfile(created);
      },
    );
  }

  async updateReleaseProfile(id: string, data: ReleaseProfileResource): Promise<ReleaseProfileResource> {
    return this.versioned(
      () => this.apiV3.v3ReleaseprofileUpdate(id, data),
      async () => {
        const current = this.v5ReleaseProfiles.find((profile) => profile.id === Number(id));
        const updated = await this.apiV5.v5ReleaseprofileUpdate(id, {
          ...data,
          airDateGracePeriod: current?.airDateGracePeriod ?? 0,
          indexerIds:
            data.indexerId === undefined || data.indexerId <= 0
              ? []
              : current?.indexerIds?.[0] === data.indexerId
                ? current.indexerIds
                : [data.indexerId],
        });
        this.v5ReleaseProfiles = this.v5ReleaseProfiles.map((profile) => (profile.id === updated.id ? updated : profile));
        return copyV5ReleaseProfile(updated);
      },
    );
  }

  async deleteReleaseProfile(id: string): Promise<void> {
    return this.versioned(
      () => this.apiV3.v3ReleaseprofileDelete(+id),
      () => this.apiV5.v5ReleaseprofileDelete(+id),
    );
  }

  async getIndexers() {
    return this.versioned(
      () => this.apiV3.v3IndexerList(),
      () => this.apiV5.v5IndexerList(),
    );
  }

  async getTags(): Promise<TagResource[]> {
    return this.versioned(
      () => this.apiV3.v3TagList(),
      () => this.apiV5.v5TagList(),
    );
  }

  async createTag(tag: TagResource): Promise<TagResource> {
    return this.versioned(
      () => this.apiV3.v3TagCreate(tag),
      () => this.apiV5.v5TagCreate(tag),
    );
  }

  async deleteTag(id: string): Promise<void> {
    return this.versioned(
      () => this.apiV3.v3TagDelete(+id),
      () => this.apiV5.v5TagDelete(+id),
    );
  }

  // Download Clients
  async getDownloadClientSchema(): Promise<DownloadClientResource[]> {
    return this.versioned(
      () => this.apiV3.v3DownloadclientSchemaList(),
      () => this.apiV5.v5DownloadclientSchemaList(),
    );
  }

  async getDownloadClients(): Promise<DownloadClientResource[]> {
    return this.versioned(
      () => this.apiV3.v3DownloadclientList(),
      () => this.apiV5.v5DownloadclientList(),
    );
  }

  async createDownloadClient(client: DownloadClientResource): Promise<DownloadClientResource> {
    return this.versioned(
      () => this.apiV3.v3DownloadclientCreate(client, forceSaveIfDisabled(client.enable)),
      () => this.apiV5.v5DownloadclientCreate(client, this.v5DownloadClientOptions(client)),
    );
  }

  async updateDownloadClient(id: string, client: DownloadClientResource): Promise<DownloadClientResource> {
    return this.versioned(
      () => this.apiV3.v3DownloadclientUpdate(+id, client, forceSaveIfDisabled(client.enable)),
      () => this.apiV5.v5DownloadclientUpdate(+id, client, this.v5DownloadClientOptions(client)),
    );
  }

  async deleteDownloadClient(id: string): Promise<void> {
    return this.versioned(
      () => this.apiV3.v3DownloadclientDelete(+id),
      () => this.apiV5.v5DownloadclientDelete(+id),
    );
  }

  async testDownloadClient(client: DownloadClientResource): Promise<void> {
    return this.versioned(
      () => this.apiV3.v3DownloadclientTestCreate(client),
      () => this.apiV5.v5DownloadclientTestCreate(client, this.v5DownloadClientOptions(client)),
    );
  }

  private v5DownloadClientOptions(client: DownloadClientResource) {
    return client.enable === false ? { skipTesting: true, skipValidation: SkipValidation.All } : undefined;
  }

  // Download Client Configuration
  async getDownloadClientConfig(): Promise<DownloadClientConfigResource> {
    return this.versioned(
      () => this.apiV3.v3ConfigDownloadclientList(),
      () => this.apiV5.v5SettingsDownloadclientList(),
    );
  }

  async updateDownloadClientConfig(id: string, config: DownloadClientConfigResource): Promise<DownloadClientConfigResource> {
    return this.versioned(
      () => this.apiV3.v3ConfigDownloadclientUpdate(id, config),
      () => this.apiV5.v5SettingsDownloadclientUpdate(id, config),
    );
  }

  // Remote Path Mappings
  async getRemotePathMappings(): Promise<RemotePathMappingResource[]> {
    return this.versioned(
      () => this.apiV3.v3RemotepathmappingList(),
      () => this.apiV5.v5RemotepathmappingList(),
    );
  }

  async createRemotePathMapping(mapping: RemotePathMappingResource): Promise<RemotePathMappingResource> {
    return this.versioned(
      () => this.apiV3.v3RemotepathmappingCreate(mapping),
      () => this.apiV5.v5RemotepathmappingCreate(mapping),
    );
  }

  async updateRemotePathMapping(id: string, mapping: RemotePathMappingResource): Promise<RemotePathMappingResource> {
    return this.versioned(
      () => this.apiV3.v3RemotepathmappingUpdate(id, mapping),
      () => this.apiV5.v5RemotepathmappingUpdate(id, mapping),
    );
  }

  async deleteRemotePathMapping(id: string): Promise<void> {
    return this.versioned(
      () => this.apiV3.v3RemotepathmappingDelete(+id),
      () => this.apiV5.v5RemotepathmappingDelete(+id),
    );
  }

  // System/Health Check
  getSystemStatus(): Promise<SystemResource> {
    return this.versioned(
      () => this.apiV3.v3SystemStatusList(),
      async () => {
        const status: SonarrSystemV5 = await this.apiV5.v5SystemStatusList();
        return {
          appName: status.appName,
          instanceName: status.instanceName,
          version: status.version,
          buildTime: status.buildTime,
          isDebug: status.isDebug,
          isProduction: status.isProduction,
          isAdmin: status.isAdmin,
          isUserInteractive: status.isUserInteractive,
          startupPath: status.startupPath,
          appData: status.appData,
          osName: status.osName,
          osVersion: status.osVersion,
          isNetCore: status.isNetCore,
          isLinux: status.isLinux,
          isOsx: status.isOsx,
          isWindows: status.isWindows,
          isDocker: status.isDocker,
          mode: status.mode,
          branch: status.branch,
          migrationVersion: status.migrationVersion,
          urlBase: status.urlBase,
          runtimeVersion: status.runtimeVersion,
          runtimeName: status.runtimeName,
          startTime: status.startTime,
          packageVersion: status.packageVersion,
          packageAuthor: status.packageAuthor,
        };
      },
    );
  }

  async testConnection() {
    try {
      if ((await this.getApiVersion()) === "v3") {
        await this.apiV3.v3HealthList();
      } else {
        await this.apiV5.v5HealthList();
      }
    } catch (error) {
      const message = logConnectionError(error, "SONARR");
      logger.error(message);
      return false;
    }

    return true;
  }
}
