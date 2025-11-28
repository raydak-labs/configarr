import { KyHttpClient } from "../__generated__/ky-client";
import { Api } from "../__generated__/lidarr/Api";
import {
  CustomFormatResource,
  LanguageResource,
  MetadataProfileResource,
  QualityDefinitionResource,
  QualityProfileResource,
} from "../__generated__/lidarr/data-contracts";
import { logger } from "../logger";
import { IArrClient, logConnectionError, validateClientParams } from "./unified-client";

/**
 * Schema cache type for Lidarr metadata profiles.
 * Stores the authoritative list of album types and release statuses
 * supported by a specific Lidarr server instance.
 */
type LidarrSchemaCache = {
  primaryAlbumTypes: Array<{ id: number; name: string }>;
  secondaryAlbumTypes: Array<{ id: number; name: string }>;
  releaseStatuses: Array<{ id: number; name: string }>;
};

/**
 * Map of base URLs to their schema caches.
 * This allows multiple Lidarr instances with different versions/schemas
 * to coexist in the same process without cache pollution.
 */
const schemaCacheByUrl = new Map<string, LidarrSchemaCache>();

/**
 * Fetch metadata profile schema from Lidarr server.
 * This provides the authoritative list of album types and release statuses
 * supported by this specific Lidarr version.
 * 
 * The cache is scoped by base URL to support multiple Lidarr instances
 * with potentially different schemas in the same process.
 */
async function fetchMetadataProfileSchema(api: Api<unknown>, baseUrl: string): Promise<LidarrSchemaCache> {
  const cached = schemaCacheByUrl.get(baseUrl);
  if (cached) {
    return cached; // Already cached for this instance
  }

  try {
    const schema = await api.v1MetadataprofileSchemaList();
    
    // Extract the enum-like values from the schema
    // The schema returns a template profile with all possible values
    const extractTypes = (items: any[] | null | undefined): Array<{ id: number; name: string }> => {
      if (!items || !Array.isArray(items)) {
        return [];
      }
      
      return items.map((item: any) => {
        // Handle both direct objects and nested albumType/releaseStatus objects
        if (item.albumType && typeof item.albumType === 'object') {
          return {
            id: item.albumType.id ?? item.id,
            name: item.albumType.name ?? item.albumType.toString()
          };
        } else if (item.releaseStatus && typeof item.releaseStatus === 'object') {
          return {
            id: item.releaseStatus.id ?? item.id,
            name: item.releaseStatus.name ?? item.releaseStatus.toString()
          };
        } else {
          return {
            id: item.id,
            name: item.name ?? item.toString()
          };
        }
      }).filter(item => item.id != null && item.name != null);
    };

    const schemaCache: LidarrSchemaCache = {
      primaryAlbumTypes: extractTypes(schema.primaryAlbumTypes ?? undefined),
      secondaryAlbumTypes: extractTypes(schema.secondaryAlbumTypes ?? undefined),
      releaseStatuses: extractTypes(schema.releaseStatuses ?? undefined),
    };

    schemaCacheByUrl.set(baseUrl, schemaCache);

    logger.debug(
      `Loaded Lidarr metadata profile schema for ${baseUrl}: ` +
      `${schemaCache.primaryAlbumTypes.length} primary types, ` +
      `${schemaCache.secondaryAlbumTypes.length} secondary types, ` +
      `${schemaCache.releaseStatuses.length} release statuses`
    );
    
    return schemaCache;
  } catch (error) {
    logger.warn(`Failed to fetch metadata profile schema from ${baseUrl}, using empty schema`);
    const emptySchema: LidarrSchemaCache = {
      primaryAlbumTypes: [],
      secondaryAlbumTypes: [],
      releaseStatuses: [],
    };
    schemaCacheByUrl.set(baseUrl, emptySchema);
    return emptySchema;
  }
}

/**
 * Build lookup maps from schema arrays
 */
function buildLookupMaps(types: Array<{ id: number; name: string }>) {
  const byId = new Map<number, { id: number; name: string }>();
  const byName = new Map<string, { id: number; name: string }>();
  
  for (const type of types) {
    byId.set(type.id, type);
    byName.set(type.name.toLowerCase(), type);
  }
  
  return { byId, byName };
}

function resolveEnumLikeValue(
  value: unknown,
  types: Array<{ id: number; name: string }>,
): { id: number; name: string } | undefined {
  const { byId, byName } = buildLookupMaps(types);
  
  if (typeof value === "number") {
    return byId.get(value);
  }

  if (typeof value === "string") {
    return byName.get(value.toLowerCase());
  }

  if (value && typeof value === "object") {
    const v: any = value;
    if (typeof v.id === "number" && typeof v.name === "string") {
      return { id: v.id, name: v.name };
    }

    if (typeof v.id === "number") {
      const resolved = byId.get(v.id);
      if (resolved) {
        return resolved;
      }
    }

    if (typeof v.name === "string") {
      const resolved = byName.get(v.name.toLowerCase());
      if (resolved) {
        return resolved;
      }
    }
  }

  return undefined;
}

function normalizeMetadataProfileForLidarr(
  profile: MetadataProfileResource,
  schema: LidarrSchemaCache
): MetadataProfileResource {
  if (!profile) {
    return profile;
  }

  const normalized: MetadataProfileResource = {
    ...profile,
  };

  if (profile.primaryAlbumTypes) {
    normalized.primaryAlbumTypes = profile.primaryAlbumTypes.map((item, index) => {
      if (!item) {
        return item;
      }

      const anyItem: any = item;
      const resolvedAlbumType = resolveEnumLikeValue(
        anyItem.albumType,
        schema.primaryAlbumTypes,
      );

      if (!resolvedAlbumType && anyItem.albumType != null) {
        logger.warn(
          `Unknown Lidarr primary albumType '${JSON.stringify(
            anyItem.albumType,
          )}' in metadata profile '${profile.name ?? ""}'. Available types: ${schema.primaryAlbumTypes.map(t => t.name).join(', ')}`,
        );
      }

      return {
        id: item.id ?? index,
        allowed: item.allowed ?? true,
        albumType: resolvedAlbumType ?? anyItem.albumType,
      };
    });
  }

  if (profile.secondaryAlbumTypes) {
    normalized.secondaryAlbumTypes = profile.secondaryAlbumTypes.map((item, index) => {
      if (!item) {
        return item;
      }

      const anyItem: any = item;
      const resolvedAlbumType = resolveEnumLikeValue(
        anyItem.albumType,
        schema.secondaryAlbumTypes,
      );

      if (!resolvedAlbumType && anyItem.albumType != null) {
        logger.warn(
          `Unknown Lidarr secondary albumType '${JSON.stringify(
            anyItem.albumType,
          )}' in metadata profile '${profile.name ?? ""}'. Available types: ${schema.secondaryAlbumTypes.map(t => t.name).join(', ')}`,
        );
      }

      return {
        id: item.id ?? index,
        allowed: item.allowed ?? true,
        albumType: resolvedAlbumType ?? anyItem.albumType,
      };
    });
  }

  if (profile.releaseStatuses) {
    normalized.releaseStatuses = profile.releaseStatuses.map((item, index) => {
      if (!item) {
        return item;
      }

      const anyItem: any = item;
      const resolvedReleaseStatus = resolveEnumLikeValue(
        anyItem.releaseStatus,
        schema.releaseStatuses,
      );

      if (!resolvedReleaseStatus && anyItem.releaseStatus != null) {
        logger.warn(
          `Unknown Lidarr releaseStatus '${JSON.stringify(
            anyItem.releaseStatus,
          )}' in metadata profile '${profile.name ?? ""}'. Available statuses: ${schema.releaseStatuses.map(t => t.name).join(', ')}`,
        );
      }

      return {
        id: item.id ?? index,
        allowed: item.allowed ?? true,
        releaseStatus: resolvedReleaseStatus ?? anyItem.releaseStatus,
      };
    });
  }

  return normalized;
}

export class LidarrClient implements IArrClient<QualityProfileResource, QualityDefinitionResource, CustomFormatResource, LanguageResource> {
  private api!: Api<unknown>;
  private baseUrl!: string;

  constructor(baseUrl: string, apiKey: string) {
    this.initialize(baseUrl, apiKey);
  }

  private initialize(baseUrl: string, apiKey: string) {
    validateClientParams(baseUrl, apiKey, "LIDARR");

    this.baseUrl = baseUrl;

    const httpClient = new KyHttpClient({
      headers: {
        "X-Api-Key": apiKey,
      },
      prefixUrl: baseUrl,
    });

    this.api = new Api(httpClient);
  }

  async getLanguages() {
    return this.api.v1LanguageList();
  }

  // Quality Management
  getQualityDefinitions() {
    return this.api.v1QualitydefinitionList();
  }

  async updateQualityDefinitions(definitions: QualityDefinitionResource[]) {
    await this.api.v1QualitydefinitionUpdateUpdate(definitions);
    return this.api.v1QualitydefinitionList();
  }

  // Quality Profiles
  getQualityProfiles() {
    return this.api.v1QualityprofileList();
  }

  createQualityProfile(profile: QualityProfileResource) {
    return this.api.v1QualityprofileCreate(profile);
  }

  updateQualityProfile(id: string, profile: QualityProfileResource) {
    return this.api.v1QualityprofileUpdate(id, profile);
  }

  deleteQualityProfile(id: string): Promise<void> {
    return this.api.v1QualityprofileDelete(Number(id));
  }

  // Custom Formats
  getCustomFormats() {
    return this.api.v1CustomformatList();
  }

  createCustomFormat(format: CustomFormatResource) {
    return this.api.v1CustomformatCreate(format);
  }

  updateCustomFormat(id: string, format: CustomFormatResource) {
    return this.api.v1CustomformatUpdate(id, format);
  }

  deleteCustomFormat(id: string) {
    return this.api.v1CustomformatDelete(+id);
  }

  // Metadata Profiles
  async getMetadataProfiles() {
    await fetchMetadataProfileSchema(this.api, this.baseUrl);
    return this.api.v1MetadataprofileList();
  }

  async createMetadataProfile(profile: MetadataProfileResource) {
    const schema = await fetchMetadataProfileSchema(this.api, this.baseUrl);
    const payload = normalizeMetadataProfileForLidarr(profile, schema);
    return this.api.v1MetadataprofileCreate(payload);
  }

  async updateMetadataProfile(id: string, profile: MetadataProfileResource) {
    const schema = await fetchMetadataProfileSchema(this.api, this.baseUrl);
    const payload = normalizeMetadataProfileForLidarr(profile, schema);
    return this.api.v1MetadataprofileUpdate(id, payload);
  }

  async deleteMetadataProfile(id: string) {
    return this.api.v1MetadataprofileDelete(Number(id));
  }

  async getNaming() {
    return this.api.v1ConfigNamingList();
  }

  async updateNaming(id: string, data: any) {
    return this.api.v1ConfigNamingUpdate(id, data);
  }

  async getMediamanagement() {
    return this.api.v1ConfigMediamanagementList();
  }

  async updateMediamanagement(id: string, data: any) {
    return this.api.v1ConfigMediamanagementUpdate(id, data);
  }

  async getRootfolders() {
    return this.api.v1RootfolderList();
  }

  async addRootFolder(data: any) {
    return this.api.v1RootfolderCreate(data);
  }

  async updateRootFolder(id: string, data: any) {
    return this.api.v1RootfolderUpdate(id, data);
  }

  async deleteRootFolder(id: string) {
    return this.api.v1RootfolderDelete(+id);
  }

  // Delay Profiles
  async getDelayProfiles() {
    return this.api.v1DelayprofileList();
  }

  async createDelayProfile(profile: any) {
    return this.api.v1DelayprofileCreate(profile);
  }

  async updateDelayProfile(id: string, data: any) {
    return this.api.v1DelayprofileUpdate(id, data);
  }

  async deleteDelayProfile(id: string) {
    return this.api.v1DelayprofileDelete(+id);
  }

  async getTags() {
    return this.api.v1TagList();
  }

  async createTag(tag: any) {
    return this.api.v1TagCreate(tag);
  }

  // System/Health Check
  getSystemStatus() {
    return this.api.v1SystemStatusList();
  }

  async testConnection() {
    try {
      await this.api.v1HealthList();
    } catch (error) {
      const message = logConnectionError(error, "LIDARR");
      logger.error(message);

      return false;
    }

    return true;
  }
}