import { getSpecificClient } from "../clients/unified-client";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { InputConfigProwlarrInstance, InputConfigSyncProfile } from "../types/config.types";
import { AppProfileResource } from "./types";

export interface SyncProfileSyncResult {
  added: number;
  updated: number;
  removed: number;
  diffEntries: DiffEntry[];
  /**
   * Profiles as they will exist after this run, so indexers can resolve one created in the
   * same run. Undefined when the section was absent, which leaves indexers to fetch for
   * themselves. Entries created in a dry run have no `id`.
   */
  profiles?: AppProfileResource[];
}

const RESOURCE_TYPE = "SyncProfile";

/** Prowlarr's own defaults for a new profile, used for whatever the config leaves out. */
const CREATE_DEFAULTS = {
  enableRss: true,
  enableAutomaticSearch: true,
  enableInteractiveSearch: true,
  minimumSeeders: 1,
};

function desiredProps(config: InputConfigSyncProfile): Partial<AppProfileResource> {
  const props: Partial<AppProfileResource> = {
    enableRss: config.enable_rss,
    enableAutomaticSearch: config.enable_automatic_search,
    enableInteractiveSearch: config.enable_interactive_search,
    minimumSeeders: config.minimum_seeders,
  };
  return Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined));
}

/** Only the props the config actually sets are compared, so the rest keep their server value. */
function fieldChanges(config: InputConfigSyncProfile, server: AppProfileResource): FieldChange[] {
  return Object.entries(desiredProps(config))
    .filter(([key, value]) => value !== server[key as keyof AppProfileResource])
    .map(([key, value]) => ({ field: key, from: server[key as keyof AppProfileResource], to: value }));
}

/**
 * Syncs Prowlarr sync profiles ("Sync Profiles" in the UI, `appprofile` in the API).
 *
 * Names are matched case-insensitively, because indexers resolve `sync_profile` the same
 * way; matching exactly here would let `standard` create a duplicate of `Standard` that an
 * indexer reference could not then tell apart.
 *
 * A failed create, update or delete throws: indexers reference these by name, so continuing
 * would bind them to the wrong sync rules.
 */
export async function syncSyncProfiles(section: InputConfigProwlarrInstance["sync_profiles"]): Promise<SyncProfileSyncResult> {
  const configItems = section?.data ?? [];
  const deleteConfig = section?.delete_unmanaged;
  const result: SyncProfileSyncResult = { added: 0, updated: 0, removed: 0, diffEntries: [] };

  if (configItems.length === 0 && !deleteConfig?.enabled) {
    logger.debug("No sync profiles configured and delete_unmanaged not enabled, skipping");
    return result;
  }

  const api = getSpecificClient("PROWLARR");
  const dryRun = getEnvs().DRY_RUN;

  const serverProfiles = await api.getAppProfiles();
  logger.info(`Found ${serverProfiles.length} sync profile(s) on server`);

  const names = configItems.map((c) => c.name.toLowerCase());
  const duplicates = new Set(names.filter((name, i) => names.indexOf(name) !== i));

  const byName = new Map<string, AppProfileResource>();
  for (const profile of serverProfiles) {
    const name = profile.name?.toLowerCase();
    if (name && !byName.has(name)) byName.set(name, profile);
  }

  const profiles = [...serverProfiles];

  for (const config of configItems) {
    const key = config.name.toLowerCase();
    if (duplicates.has(key)) {
      logger.error(`Validation failed for sync profile '${config.name}': name must be unique`);
      continue;
    }

    const server = byName.get(key);

    if (!server) {
      const payload = { ...CREATE_DEFAULTS, ...desiredProps(config), name: config.name };
      result.diffEntries.push({ resourceType: RESOURCE_TYPE, name: config.name, action: "create" });
      result.added++;

      if (dryRun) {
        logger.info(`DryRun: Would create sync profile '${config.name}'.`);
        profiles.push(payload);
        continue;
      }
      try {
        const created = await api.createAppProfile(payload);
        profiles.push(created);
        byName.set(key, created);
        logger.info(`Created sync profile: '${config.name}' (ID: ${created.id})`);
      } catch (error: unknown) {
        throw fatal(`Failed to create sync profile '${config.name}'`, error);
      }
      continue;
    }

    const changes = fieldChanges(config, server);
    if (changes.length === 0) continue;

    result.diffEntries.push({ resourceType: RESOURCE_TYPE, name: config.name, action: "update", fieldChanges: changes });
    result.updated++;

    if (dryRun) {
      logger.info(`DryRun: Would update sync profile '${config.name}'.`);
      continue;
    }
    try {
      await api.updateAppProfile(server.id!.toString(), { ...server, ...desiredProps(config) });
      logger.info(`Updated sync profile: '${config.name}'`);
    } catch (error: unknown) {
      throw fatal(`Failed to update sync profile '${config.name}'`, error);
    }
  }

  const deletedIds = new Set<number>();

  if (deleteConfig?.enabled) {
    const keep = new Set([...names, ...(deleteConfig.ignore ?? []).map((n) => n.toLowerCase())]);

    for (const profile of serverProfiles) {
      const name = profile.name ?? "";
      if (!name || keep.has(name.toLowerCase()) || profile.id == null) continue;

      result.diffEntries.push({ resourceType: RESOURCE_TYPE, name, action: "delete" });
      result.removed++;

      if (dryRun) {
        logger.info(`DryRun: Would delete unmanaged sync profile '${name}'.`);
        continue;
      }
      try {
        await api.deleteAppProfile(profile.id.toString());
        deletedIds.add(profile.id);
        logger.info(`Deleted unmanaged sync profile: '${name}'`);
      } catch (error: unknown) {
        throw fatal(`Failed to delete sync profile '${name}'`, error);
      }
    }
  }

  result.profiles = profiles.filter((p) => p.id == null || !deletedIds.has(p.id));
  return result;
}

function fatal(message: string, error: unknown): Error {
  const full = `${message}: ${error instanceof Error ? error.message : String(error)}`;
  logger.error(full);
  return new Error(full);
}
