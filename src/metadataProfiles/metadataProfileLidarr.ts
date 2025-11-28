import { MetadataProfileResource, PrimaryAlbumType, ReleaseStatus, SecondaryAlbumType } from "../__generated__/lidarr/data-contracts";
import { ServerCache } from "../cache";
import { LidarrClient } from "../clients/lidarr-client";
import { getUnifiedClient } from "../clients/unified-client";
import { InputConfigLidarrMetadataProfile, InputConfigMetadataProfile } from "../types/config.types";
import { MetadataProfileDiff } from "./metadataProfile.types";
import { BaseMetadataProfileSync } from "./metadataProfileBase";

export class LidarrMetadataProfileSync extends BaseMetadataProfileSync<MetadataProfileResource> {
  protected api: LidarrClient = getUnifiedClient().getSpecificClient();

  protected getArrType(): "LIDARR" {
    return "LIDARR";
  }

  protected createMetadataProfile(resolvedConfig: MetadataProfileResource): Promise<MetadataProfileResource> {
    return this.api.createMetadataProfile(resolvedConfig);
  }

  protected updateMetadataProfile(id: string, resolvedConfig: MetadataProfileResource): Promise<MetadataProfileResource> {
    return this.api.updateMetadataProfile(id, resolvedConfig);
  }

  protected deleteProfile(id: string): Promise<void> {
    return this.api.deleteMetadataProfile(id);
  }

  protected async loadFromServer(): Promise<MetadataProfileResource[]> {
    return await this.api.getMetadataProfiles();
  }

  private validateProfile(config: InputConfigLidarrMetadataProfile): void {
    const errors: string[] = [];

    // primary_types: must be defined AND not empty
    if (!config.primary_types || config.primary_types.length === 0) {
      errors.push(`primary_types must be defined with at least one type.`);
    }

    // secondary_types: must be defined AND not empty
    if (!config.secondary_types || config.secondary_types.length === 0) {
      errors.push(`secondary_types must be defined with at least one type.`);
    }

    // release_statuses: must be defined AND not empty
    if (!config.release_statuses || config.release_statuses.length === 0) {
      errors.push(`release_statuses must be defined with at least one status.`);
    }

    if (errors.length > 0) {
      throw new Error(`Metadata profile '${config.name}':\n  - ${errors.join("\n  - ")}`);
    }
  }

  private validateAllProfiles(profiles: InputConfigMetadataProfile[]): void {
    const allErrors: string[] = [];

    for (const profile of profiles) {
      try {
        this.validateProfile(profile as InputConfigLidarrMetadataProfile);
      } catch (error) {
        allErrors.push(error instanceof Error ? error.message : String(error));
      }
    }

    if (allErrors.length > 0) {
      throw new Error(`Metadata profile validation failed:\n\n${allErrors.join("\n\n")}`);
    }
  }

  public async resolveConfig(config: InputConfigMetadataProfile, serverCache: ServerCache): Promise<MetadataProfileResource> {
    const lidarrConfig = config as InputConfigLidarrMetadataProfile;

    const serverProfiles = await this.loadFromServer();
    const existingProfile = serverProfiles.find((p) => p.name === lidarrConfig.name);

    const result: MetadataProfileResource = {
      name: lidarrConfig.name,
      id: existingProfile?.id,
    };

    // When creating a new profile, we need to get ALL available types from the server schema
    // This ensures we have the complete structure with proper IDs
    let schemaTemplate: MetadataProfileResource | undefined;
    if (!existingProfile) {
      try {
        schemaTemplate = await this.api.getMetadataProfileSchema!();
        this.logger.debug(`Fetched schema for new profile '${lidarrConfig.name}'`);
      } catch (error) {
        this.logger.warn(`Failed to fetch schema for new profile, will try simple structure: ${error}`);
      }
    }

    // Map primary album types
    if (lidarrConfig.primary_types) {
      if (existingProfile?.primaryAlbumTypes) {
        // Updating - merge with server data to preserve structure
        // Only types in the config array should be enabled, all others disabled
        const enabledTypes = new Set(lidarrConfig.primary_types);
        result.primaryAlbumTypes = existingProfile.primaryAlbumTypes.map((serverItem) => ({
          ...serverItem,
          allowed: enabledTypes.has(serverItem.albumType?.name as string),
        }));
      } else if (schemaTemplate?.primaryAlbumTypes) {
        // Creating new - use schema template with ALL types, enable only config types
        const enabledTypes = new Set(lidarrConfig.primary_types);
        result.primaryAlbumTypes = schemaTemplate.primaryAlbumTypes.map((serverItem) => ({
          ...serverItem,
          allowed: enabledTypes.has(serverItem.albumType?.name as string),
        }));
      } else {
        // No schema available - use simple structure (might fail)
        result.primaryAlbumTypes = lidarrConfig.primary_types.map((typeName) => ({
          albumType: typeName as PrimaryAlbumType,
          allowed: true,
        }));
      }
    }

    // Map secondary album types
    if (lidarrConfig.secondary_types) {
      if (existingProfile?.secondaryAlbumTypes) {
        const enabledTypes = new Set(lidarrConfig.secondary_types);
        result.secondaryAlbumTypes = existingProfile.secondaryAlbumTypes.map((serverItem) => ({
          ...serverItem,
          allowed: enabledTypes.has(serverItem.albumType?.name as string),
        }));
      } else if (schemaTemplate?.secondaryAlbumTypes) {
        // Creating new - use schema template with ALL types
        const enabledTypes = new Set(lidarrConfig.secondary_types);
        result.secondaryAlbumTypes = schemaTemplate.secondaryAlbumTypes.map((serverItem) => ({
          ...serverItem,
          allowed: enabledTypes.has(serverItem.albumType?.name as string),
        }));
      } else {
        result.secondaryAlbumTypes = lidarrConfig.secondary_types.map((typeName) => ({
          albumType: typeName as SecondaryAlbumType,
          allowed: true,
        }));
      }
    }

    // Map release statuses
    if (lidarrConfig.release_statuses) {
      if (existingProfile?.releaseStatuses) {
        const enabledStatuses = new Set(lidarrConfig.release_statuses);
        result.releaseStatuses = existingProfile.releaseStatuses.map((serverItem) => ({
          ...serverItem,
          allowed: enabledStatuses.has(serverItem.releaseStatus?.name as string),
        }));
      } else if (schemaTemplate?.releaseStatuses) {
        // Creating new - use schema template with ALL statuses
        const enabledStatuses = new Set(lidarrConfig.release_statuses);
        result.releaseStatuses = schemaTemplate.releaseStatuses.map((serverItem) => ({
          ...serverItem,
          allowed: enabledStatuses.has(serverItem.releaseStatus?.name as string),
        }));
      } else {
        result.releaseStatuses = lidarrConfig.release_statuses.map((statusName) => ({
          releaseStatus: statusName as ReleaseStatus,
          allowed: true,
        }));
      }
    }

    return result;
  }

  private isConfigEqual(
    resolvedConfig: MetadataProfileResource,
    serverProfile: MetadataProfileResource,
    originalConfig: InputConfigLidarrMetadataProfile,
  ): boolean {
    // Compare name and allowed states
    // Only compare fields that are actually defined in the original config
    // If a field is undefined in config, we skip checking it (leave server as-is)

    const normalizeForComparison = (profile: MetadataProfileResource) => {
      const extractName = (item: any): string => {
        // Handle both nested {albumType: {name: "X"}} and flat {albumType: "X"}
        if (typeof item === "string") return item;
        if (item?.name) return item.name;
        return "";
      };

      return {
        name: profile.name ?? "",
        primaryAlbumTypes:
          profile.primaryAlbumTypes
            ?.map((item) => ({
              name: extractName(item.albumType),
              allowed: item.allowed ?? false,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)) ?? [],
        secondaryAlbumTypes:
          profile.secondaryAlbumTypes
            ?.map((item) => ({
              name: extractName(item.albumType),
              allowed: item.allowed ?? false,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)) ?? [],
        releaseStatuses:
          profile.releaseStatuses
            ?.map((item) => ({
              name: extractName(item.releaseStatus),
              allowed: item.allowed ?? false,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)) ?? [],
      };
    };

    const normalizedConfig = normalizeForComparison(resolvedConfig);
    const normalizedServer = normalizeForComparison(serverProfile);

    // Build sets of enabled types from config (only for defined fields)
    const configEnabledPrimary = new Set(normalizedConfig.primaryAlbumTypes.filter((t) => t.allowed).map((t) => t.name));
    const configEnabledSecondary = new Set(normalizedConfig.secondaryAlbumTypes.filter((t) => t.allowed).map((t) => t.name));
    const configEnabledStatuses = new Set(normalizedConfig.releaseStatuses.filter((t) => t.allowed).map((t) => t.name));

    // Check primary types - ONLY if defined in config
    if (originalConfig.primary_types !== undefined) {
      for (const serverType of normalizedServer.primaryAlbumTypes) {
        const shouldBeEnabled = configEnabledPrimary.has(serverType.name);
        if (serverType.allowed !== shouldBeEnabled) {
          return false;
        }
      }
    }

    // Check secondary types - ONLY if defined in config
    if (originalConfig.secondary_types !== undefined) {
      for (const serverType of normalizedServer.secondaryAlbumTypes) {
        const shouldBeEnabled = configEnabledSecondary.has(serverType.name);
        if (serverType.allowed !== shouldBeEnabled) {
          return false;
        }
      }
    }

    // Check release statuses - ONLY if defined in config
    if (originalConfig.release_statuses !== undefined) {
      for (const serverStatus of normalizedServer.releaseStatuses) {
        const shouldBeEnabled = configEnabledStatuses.has(serverStatus.name);
        if (serverStatus.allowed !== shouldBeEnabled) {
          return false;
        }
      }
    }

    return true;
  }

  async calculateDiff(
    profiles: InputConfigMetadataProfile[],
    serverCache: ServerCache,
  ): Promise<MetadataProfileDiff<MetadataProfileResource> | null> {
    if (profiles == null) {
      this.logger.debug(`Config 'metadata_profiles' not specified. Ignoring.`);
      return null;
    }

    // Validate ALL profiles FIRST before any processing
    this.validateAllProfiles(profiles);

    const serverData = await this.loadFromServer();

    const missingOnServer: InputConfigMetadataProfile[] = [];
    const changed: Array<{ config: InputConfigMetadataProfile; server: MetadataProfileResource }> = [];
    const noChanges: MetadataProfileResource[] = [];

    // Create maps for efficient lookup
    const serverByName = new Map<string, MetadataProfileResource>();
    serverData.forEach((profile) => {
      if (profile.name) {
        serverByName.set(profile.name, profile);
      }
    });

    // Process each config profile
    for (const configProfile of profiles) {
      const serverProfile = serverByName.get(configProfile.name);

      if (!serverProfile) {
        // Profile doesn't exist on server
        missingOnServer.push(configProfile);
      } else {
        // Profile exists, check if configuration matches
        // For comparison, create resolved config WITHOUT server data (simple structure)
        const lidarrConfig = configProfile as InputConfigLidarrMetadataProfile;
        const simpleResolvedConfig: MetadataProfileResource = {
          name: lidarrConfig.name,
          primaryAlbumTypes: lidarrConfig.primary_types?.map((typeName) => ({
            albumType: typeName as PrimaryAlbumType,
            allowed: true,
          })),
          secondaryAlbumTypes: lidarrConfig.secondary_types?.map((typeName) => ({
            albumType: typeName as SecondaryAlbumType,
            allowed: true,
          })),
          releaseStatuses: lidarrConfig.release_statuses?.map((statusName) => ({
            releaseStatus: statusName as ReleaseStatus,
            allowed: true,
          })),
        };

        const isChanged = !this.isConfigEqual(simpleResolvedConfig, serverProfile, lidarrConfig);
        if (isChanged) {
          changed.push({ config: configProfile, server: serverProfile });
        } else {
          noChanges.push(serverProfile);
        }
        // Remove from serverByName so we know it was managed
        serverByName.delete(configProfile.name);
      }
    }

    this.logger.debug({ missingOnServer, changed, noChanges }, "Metadata profile comparison");

    if (missingOnServer.length === 0 && changed.length === 0) {
      this.logger.debug(`Metadata profiles are in sync`);
      return null;
    }

    this.logger.info(`Found ${missingOnServer.length + changed.length} differences for metadata profiles.`);

    return {
      missingOnServer,
      changed,
      noChanges,
    };
  }
}
