import { MetadataProfileResource } from "../__generated__/readarr/data-contracts";
import { ServerCache } from "../cache";
import { ReadarrClient } from "../clients/readarr-client";
import { getSpecificClient } from "../clients/unified-client";
import { InputConfigReadarrMetadataProfile, InputConfigMetadataProfile } from "../types/config.types";
import { compareObjectsCarr } from "../util";
import { MetadataProfileDiff } from "./metadataProfile.types";
import { BaseMetadataProfileSync } from "./metadataProfileBase";

export class ReadarrMetadataProfileSync extends BaseMetadataProfileSync<MetadataProfileResource> {
  protected api: ReadarrClient = getSpecificClient<ReadarrClient>();

  protected getArrType(): "READARR" {
    return "READARR";
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

  private normalizeReadarrAllowedLanguages(value: string | string[] | null | undefined): string | null {
    if (value == null) {
      return null;
    }

    const rawParts: string[] = [];

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry === null || entry === undefined) {
          rawParts.push("null");
        } else {
          rawParts.push(String(entry));
        }
      }
    } else {
      rawParts.push(
        ...value
          .split(/[;, ]+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0),
      );
    }

    const parts = rawParts.map((p) => p.trim()).filter((p) => p.length > 0);

    if (!parts.length) {
      return null;
    }

    // Deduplicate while preserving order
    const unique: string[] = [];
    for (const code of parts) {
      if (!unique.includes(code)) {
        unique.push(code);
      }
    }

    return unique.join(",");
  }

  protected async loadFromServer(): Promise<MetadataProfileResource[]> {
    return await this.api.getMetadataProfiles();
  }

  public async resolveConfig(config: InputConfigMetadataProfile, serverCache: ServerCache): Promise<MetadataProfileResource> {
    const readarrConfig = config as InputConfigReadarrMetadataProfile;

    const result: MetadataProfileResource = {
      name: readarrConfig.name,
    };

    if (readarrConfig.min_popularity !== undefined) {
      result.minPopularity = readarrConfig.min_popularity;
    }

    if (readarrConfig.skip_missing_date !== undefined) {
      result.skipMissingDate = readarrConfig.skip_missing_date;
    }

    if (readarrConfig.skip_missing_isbn !== undefined) {
      result.skipMissingIsbn = readarrConfig.skip_missing_isbn;
    }

    if (readarrConfig.skip_parts_and_sets !== undefined) {
      result.skipPartsAndSets = readarrConfig.skip_parts_and_sets;
    }

    if (readarrConfig.skip_secondary_series !== undefined) {
      result.skipSeriesSecondary = readarrConfig.skip_secondary_series;
    }

    // Normalize allowed languages
    const allowedLanguages = this.normalizeReadarrAllowedLanguages(readarrConfig.allowed_languages ?? null);
    if (allowedLanguages !== null) {
      result.allowedLanguages = allowedLanguages;
    }

    // Normalize minimum pages
    if (readarrConfig.min_pages !== undefined && readarrConfig.min_pages !== null) {
      result.minPages = readarrConfig.min_pages;
    }

    // Normalize ignored terms
    if (readarrConfig.must_not_contain !== undefined) {
      const ignoredArray = Array.isArray(readarrConfig.must_not_contain)
        ? readarrConfig.must_not_contain
        : [readarrConfig.must_not_contain];
      result.ignored = ignoredArray;
    }

    return result;
  }

  private isConfigEqual(resolvedConfig: MetadataProfileResource, serverProfile: MetadataProfileResource): boolean {
    // Normalize both for comparison
    const normalizeForComparison = (profile: MetadataProfileResource) => {
      const rawIgnored = profile.ignored ?? [];
      const ignoredArray = Array.isArray(rawIgnored) ? rawIgnored : [String(rawIgnored)];

      const normalizedAllowed = this.normalizeReadarrAllowedLanguages(profile.allowedLanguages ?? null);

      return {
        name: profile.name ?? "",
        minPopularity: profile.minPopularity ?? 0,
        skipMissingDate: Boolean(profile.skipMissingDate),
        skipMissingIsbn: Boolean(profile.skipMissingIsbn),
        skipPartsAndSets: Boolean(profile.skipPartsAndSets),
        skipSeriesSecondary: Boolean(profile.skipSeriesSecondary),
        allowedLanguages: normalizedAllowed,
        minPages: profile.minPages ?? 0,
        ignored: ignoredArray.slice().sort(),
      };
    };

    const normalizedConfig = normalizeForComparison(resolvedConfig);
    const normalizedServer = normalizeForComparison(serverProfile);

    return compareObjectsCarr(normalizedServer, normalizedConfig).equal;
  }

  async calculateDiff(
    profiles: InputConfigMetadataProfile[],
    serverCache: ServerCache,
  ): Promise<MetadataProfileDiff<MetadataProfileResource> | null> {
    if (profiles == null) {
      this.logger.debug(`Config 'metadata_profiles' not specified. Ignoring.`);
      return null;
    }

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
        const resolvedConfig = await this.resolveConfig(configProfile, serverCache);
        const isChanged = !this.isConfigEqual(resolvedConfig, serverProfile);
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
