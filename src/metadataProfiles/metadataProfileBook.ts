import type { ServerCache } from "../cache";
import type { FieldChange } from "../diffReport/diffReport.types";
import type { InputConfigMetadataProfile, InputConfigReadarrMetadataProfile } from "../types/config.types";
import { compareObjectsCarr } from "../util";
import type { MetadataProfileDiff } from "./metadataProfile.types";
import { BaseMetadataProfileSync } from "./metadataProfileBase";

/** Metadata profile fields Readarr and Chaptarr share; each app's generated resource is a superset. */
export type BookMetadataProfileResource = {
  id?: number;
  name?: string | null;
  minPopularity?: number;
  skipMissingDate?: boolean;
  skipMissingIsbn?: boolean;
  skipPartsAndSets?: boolean;
  skipSeriesSecondary?: boolean;
  allowedLanguages?: string | null;
  minPages?: number;
  ignored?: string[] | null;
};

export abstract class BookMetadataProfileSync extends BaseMetadataProfileSync<BookMetadataProfileResource> {
  private normalizeAllowedLanguages(value: string | string[] | null | undefined): string | null {
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

  public async resolveConfig(config: InputConfigMetadataProfile, serverCache: ServerCache): Promise<BookMetadataProfileResource> {
    const bookConfig = config as InputConfigReadarrMetadataProfile;

    const result: BookMetadataProfileResource = {
      name: bookConfig.name,
    };

    if (bookConfig.min_popularity !== undefined) {
      result.minPopularity = bookConfig.min_popularity;
    }

    if (bookConfig.skip_missing_date !== undefined) {
      result.skipMissingDate = bookConfig.skip_missing_date;
    }

    if (bookConfig.skip_missing_isbn !== undefined) {
      result.skipMissingIsbn = bookConfig.skip_missing_isbn;
    }

    if (bookConfig.skip_parts_and_sets !== undefined) {
      result.skipPartsAndSets = bookConfig.skip_parts_and_sets;
    }

    if (bookConfig.skip_secondary_series !== undefined) {
      result.skipSeriesSecondary = bookConfig.skip_secondary_series;
    }

    // Normalize allowed languages
    const allowedLanguages = this.normalizeAllowedLanguages(bookConfig.allowed_languages ?? null);
    if (allowedLanguages !== null) {
      result.allowedLanguages = allowedLanguages;
    }

    // Normalize minimum pages
    if (bookConfig.min_pages !== undefined && bookConfig.min_pages !== null) {
      result.minPages = bookConfig.min_pages;
    }

    // Normalize ignored terms
    if (bookConfig.must_not_contain !== undefined) {
      const ignoredArray = Array.isArray(bookConfig.must_not_contain) ? bookConfig.must_not_contain : [bookConfig.must_not_contain];
      result.ignored = ignoredArray;
    }

    return result;
  }

  private compareConfig(
    resolvedConfig: BookMetadataProfileResource,
    serverProfile: BookMetadataProfileResource,
  ): { equal: boolean; changes: FieldChange[] } {
    // Normalize both for comparison
    const normalizeForComparison = (profile: BookMetadataProfileResource) => {
      const rawIgnored = profile.ignored ?? [];
      const ignoredArray = Array.isArray(rawIgnored) ? rawIgnored : [String(rawIgnored)];

      const normalizedAllowed = this.normalizeAllowedLanguages(profile.allowedLanguages ?? null);

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

    return compareObjectsCarr(normalizedServer, normalizedConfig);
  }

  async calculateDiff(
    profiles: InputConfigMetadataProfile[] | null,
    serverCache: ServerCache,
  ): Promise<MetadataProfileDiff<BookMetadataProfileResource> | null> {
    if (profiles == null) {
      this.logger.debug(`Config 'metadata_profiles' not specified. Ignoring.`);
      return null;
    }

    const serverData = await this.loadFromServer();

    const missingOnServer: InputConfigMetadataProfile[] = [];
    const changed: Array<{ config: InputConfigMetadataProfile; server: BookMetadataProfileResource; fieldChanges: FieldChange[] }> = [];
    const noChanges: BookMetadataProfileResource[] = [];

    // Create maps for efficient lookup
    const serverByName = new Map<string, BookMetadataProfileResource>();
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
        const comparison = this.compareConfig(resolvedConfig, serverProfile);
        if (!comparison.equal) {
          changed.push({ config: configProfile, server: serverProfile, fieldChanges: comparison.changes });
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
