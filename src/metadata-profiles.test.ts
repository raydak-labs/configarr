import { MergedMetadataProfileResource } from "./__generated__/mergedTypes";
import { getUnifiedClient } from "./clients/unified-client";
import { getEnvs } from "./env";
import { logger } from "./logger";
import { ArrType } from "./types/common.types";
import { InputConfigMetadataProfile, MergedConfigInstance } from "./types/config.types";
import { cloneWithJSON, compareObjectsCarr } from "./util";

/**
 * Load metadata profiles from the currently configured Arr instance.
 * If metadata profiles are not supported for the current instance, an empty list is returned.
 */
export const loadMetadataProfilesFromServer = async (): Promise<MergedMetadataProfileResource[]> => {
  const api = getUnifiedClient();

  if (!api.getMetadataProfiles) {
    logger.debug("Metadata profiles are not supported by this Arr instance.");
    return [];
  }

  return (await api.getMetadataProfiles()) as MergedMetadataProfileResource[];
};

/**
 * Map a configuration-level metadata profile into the API shape.
 *
 * The mapping is deliberately thin – the configuration structure stays very close to
 * the underlying Arr application's MetadataProfileResource types. This keeps the
 * implementation future-proof: new fields added by Arr can be forwarded by simply
 * adding them to the YAML + config types without having to change this mapper.
 */
export const mapConfigToApiMetadataProfile = (
  config: InputConfigMetadataProfile,
  arrType: ArrType,
  existing?: MergedMetadataProfileResource,
): MergedMetadataProfileResource => {
  const base: MergedMetadataProfileResource = existing ? cloneWithJSON(existing) : ({} as MergedMetadataProfileResource);

  base.name = config.name;

  if (arrType === "LIDARR") {
    // Lidarr only knows about album types & release statuses
    // The concrete enum-like values (id/name) are normalized by the Lidarr client
    // (normalizeMetadataProfileForLidarr). Here we translate from the user-facing config
    // field names into the API shape.

    const mapToggleItems = (
      items: { id?: number; name?: unknown; enabled?: boolean }[] | undefined,
    ): any[] | undefined => {
      if (!items) {
        return undefined;
      }

      return items.map((item) => {
        const anyItem: any = item;
        return {
          id: anyItem.id,
          albumType: anyItem.name,
          allowed:
            typeof anyItem.enabled === "boolean"
              ? anyItem.enabled
              : undefined,
        };
      });
    };

    const mapStatusItems = (
      items: { id?: number; name?: unknown; enabled?: boolean }[] | undefined,
    ): any[] | undefined => {
      if (!items) {
        return undefined;
      }

      return items.map((item) => {
        const anyItem: any = item;
        return {
          id: anyItem.id,
          releaseStatus: anyItem.name,
          allowed:
            typeof anyItem.enabled === "boolean"
              ? anyItem.enabled
              : undefined,
        };
      });
    };

    base.primaryAlbumTypes = mapToggleItems(config.primary_types as any);
    base.secondaryAlbumTypes = mapToggleItems(config.secondary_types as any);
    base.releaseStatuses = mapStatusItems(config.release_statuses as any);
  } else if (arrType === "READARR") {
    // Readarr metadata profiles
    // Support both snake_case (preferred) and camelCase (legacy) field names
    base.minPopularity = config.min_popularity ?? config.minPopularity;
    base.skipMissingDate = config.skip_missing_date ?? config.skipMissingDate;
    base.skipMissingIsbn = config.skip_missing_isbn ?? config.skipMissingIsbn;
    base.skipPartsAndSets = config.skip_parts_and_sets ?? config.skipPartsAndSets;
    base.skipSeriesSecondary = config.skip_secondary_series ?? config.skipSeriesSecondary;

    // Normalize allowed languages into the string format used by the API
    // (comma-separated ISO-639-2 codes such as "eng,deu").
    base.allowedLanguages = normalizeReadarrAllowedLanguages(
      config.allowed_languages ?? config.allowedLanguages ?? null,
    );

    // Normalize minimum pages.
    base.minPages = config.min_pages ?? config.minPages ?? undefined;

    // Normalize ignored terms. Readarr's schema uses the `ignored` array field.
    const cfgIgnored = config.must_not_contain ?? config.ignored;
    if (cfgIgnored !== undefined) {
      const ignoredArray = Array.isArray(cfgIgnored) ? cfgIgnored : [cfgIgnored];
      base.ignored = ignoredArray;
      // Ensure we don't accidentally carry over any legacy property shape.
      delete (base as any).ignoreds;
    }
  }

  return base;
};

/**
 * Normalize a metadata profile into a comparison-safe shape.
 * This strips fields that are either not relevant for our configuration or not stable
 * across API calls (e.g. database IDs) and focuses on the semantic configuration.
 */


/**
 * Normalize Readarr `allowedLanguages` config values to the API format.
 *
 * Readarr expects a comma-separated list of ISO-639-2 three-letter language codes,
 * e.g. "eng" for English. Users may reasonably specify values such as "en" or
 * "english" in the config; here we map a small set of common aliases to their
 * canonical codes while leaving unknown values untouched so that advanced users
 * can provide the exact codes supported by their Readarr instance.
 */

function normalizeReadarrAllowedLanguages(
  value: string | string[] | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  const LANGUAGE_CODE_MAP: Record<string, string> = {
    // Common aliases -> ISO-639-2 codes
    en: "eng",
    eng: "eng",
    english: "eng",

    fr: "fra",
    fre: "fra",
    fra: "fra",
    french: "fra",

    de: "deu",
    ger: "deu",
    deu: "deu",
    german: "deu",

    es: "spa",
    spa: "spa",
    spanish: "spa",

    it: "ita",
    ita: "ita",
    italian: "ita",

    pt: "por",
    por: "por",
    portuguese: "por",
  };

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

  const parts = rawParts
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (!parts.length) {
    return null;
  }

  const mapped = parts.map((p) => {
    const key = p.toLowerCase();
    if (key === "null") {
      return "null";
    }
    return LANGUAGE_CODE_MAP[key] ?? key;
  });

  // Deduplicate while preserving order
  const unique: string[] = [];
  for (const code of mapped) {
    if (!unique.includes(code)) {
      unique.push(code);
    }
  }

  return unique.join(",");
}

export const normalizeMetadataProfileForComparison = (
  profile: MergedMetadataProfileResource,
  arrType: ArrType,
): any => {
  if (arrType === "LIDARR") {
    const normalizeAlbumItems = (items: any[] | null | undefined) =>
      (items ?? [])
        .map((it) => ({
          // ID removed from comparison - only used for API operations, not equality
          allowed: it.allowed ?? true,
          albumType:
            typeof it.albumType === "string"
              ? it.albumType.toLowerCase()
              : it.albumType && typeof it.albumType.name === "string"
              ? it.albumType.name.toLowerCase()
              : it.albumType && typeof it.albumType.id === "number"
              ? it.albumType.id
              : null,
        }))
        .sort((a, b) => {
          // Sort by albumType for stable comparison (ignores order-only changes)
          const aKey = `${String(a.albumType ?? "")}`;
          const bKey = `${String(b.albumType ?? "")}`;
          if (aKey < bKey) return -1;
          if (aKey > bKey) return 1;
          return 0;
        });

    const normalizeStatusItems = (items: any[] | null | undefined) =>
      (items ?? [])
        .map((it) => ({
          // ID removed from comparison - only used for API operations, not equality
          allowed: it.allowed ?? true,
          releaseStatus:
            typeof it.releaseStatus === "string"
              ? it.releaseStatus.toLowerCase()
              : it.releaseStatus && typeof it.releaseStatus.name === "string"
              ? it.releaseStatus.name.toLowerCase()
              : it.releaseStatus && typeof it.releaseStatus.id === "number"
              ? it.releaseStatus.id
              : null,
        }))
        .sort((a, b) => {
          // Sort by releaseStatus for stable comparison (ignores order-only changes)
          const aKey = `${String(a.releaseStatus ?? "")}`;
          const bKey = `${String(b.releaseStatus ?? "")}`;
          if (aKey < bKey) return -1;
          if (aKey > bKey) return 1;
          return 0;
        });

    return {
      name: profile.name ?? "",
      primaryAlbumTypes: normalizeAlbumItems(profile.primaryAlbumTypes ?? []),
      secondaryAlbumTypes: normalizeAlbumItems(profile.secondaryAlbumTypes ?? []),
      releaseStatuses: normalizeStatusItems(profile.releaseStatuses ?? []),
    };
  }

  if (arrType === "READARR") {
    // Readarr schema (v1/metadataprofile/schema) exposes:
    //   minPopularity: number
    //   skipMissingDate / skipMissingIsbn / skipPartsAndSets / skipSeriesSecondary: boolean
    //   allowedLanguages: string (comma-separated ISO-639-2 codes)
    //   minPages: number
    //   ignored: string[]
    //
    // We normalize both server and desired objects into this exact shape for
    // comparison to avoid false "no change" results when the server applies
    // defaults or minor formatting differences.
    const rawIgnored = profile.ignored ?? (profile as any).ignoreds ?? [];
    const ignoredArray = Array.isArray(rawIgnored) ? rawIgnored : [String(rawIgnored)];

    const normalizedAllowed = normalizeReadarrAllowedLanguages(profile.allowedLanguages ?? null);

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
  }

  // Other Arr types do not support metadata profiles for now.
  return {
    name: profile.name ?? "",
  };
};

export const isMetadataProfileEqual = (
  arrType: ArrType,
  a: MergedMetadataProfileResource,
  b: MergedMetadataProfileResource,
): boolean => {
  const na = normalizeMetadataProfileForComparison(a, arrType);
  const nb = normalizeMetadataProfileForComparison(b, arrType);

  // compareObjectsCarr returns an object with { equal, changes }.
  // For metadata profiles we only care about the boolean equality flag.
  const result = compareObjectsCarr(na, nb);
  return result.equal;
};

export const calculateMetadataProfilesDiff = async (
  arrType: ArrType,
  config: MergedConfigInstance,
  serverProfiles: MergedMetadataProfileResource[],
): Promise<{
  create: MergedMetadataProfileResource[];
  update: MergedMetadataProfileResource[];
  noChanges: string[];
}> => {
  const configProfiles: InputConfigMetadataProfile[] = config.metadata_profiles ?? [];
  const serverByName = new Map<string, MergedMetadataProfileResource>();

  for (const p of serverProfiles) {
    if (p.name) {
      serverByName.set(p.name, p);
    }
  }

  const create: MergedMetadataProfileResource[] = [];
  const update: MergedMetadataProfileResource[] = [];
  const noChanges: string[] = [];

  for (const cfgProfile of configProfiles) {
    const serverProfile = serverByName.get(cfgProfile.name);
    const desired = mapConfigToApiMetadataProfile(cfgProfile, arrType, serverProfile);

    if (!serverProfile) {
      // No server profile with this name -> create
      create.push(desired);
      continue;
    }

    if (!isMetadataProfileEqual(arrType, desired, serverProfile)) {
      desired.id = serverProfile.id;
      update.push(desired);
    } else {
      noChanges.push(cfgProfile.name);
    }

    serverByName.delete(cfgProfile.name);
  }

  return { create, update, noChanges };
};

export const getUnmanagedMetadataProfiles = (
  serverProfiles: MergedMetadataProfileResource[],
  configProfiles: InputConfigMetadataProfile[] | undefined,
): MergedMetadataProfileResource[] => {
  const desiredNames = new Set((configProfiles ?? []).map((p) => p.name));
  return serverProfiles.filter((p) => p.name && !desiredNames.has(p.name));
};

export const deleteMetadataProfile = async (profile: MergedMetadataProfileResource): Promise<void> => {
  const api = getUnifiedClient();

  if (!api.deleteMetadataProfile) {
    throw new Error("Metadata profiles are not supported by this Arr instance.");
  }

  if (profile.id == null) {
    throw new Error(`Cannot delete metadata profile '${profile.name ?? "unknown"}' without an ID.`);
  }

  await api.deleteMetadataProfile(String(profile.id));
  logger.info(`Deleted MetadataProfile: '${profile.name ?? profile.id}'`);
};

/**
 * Convenience helper used by tests and potential tooling to wipe *all* metadata
 * profiles from an instance. Not used in the main pipeline.
 */
export const deleteAllMetadataProfiles = async (profiles: MergedMetadataProfileResource[]): Promise<void> => {
  if (getEnvs().DRY_RUN) {
    logger.info(`DryRun: Would delete all MetadataProfiles: ${profiles.map((p) => p.name).join(", ")}`);
    return;
  }

  for (const p of profiles) {
    await deleteMetadataProfile(p);
  }
};