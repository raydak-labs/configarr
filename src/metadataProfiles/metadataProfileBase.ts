import { ServerCache } from "../cache";
import { getUnifiedClient, IArrClient } from "../clients/unified-client";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { ArrType } from "../types/common.types";
import { InputConfigMetadataProfile, MergedConfigInstance } from "../types/config.types";
import { DiffEntry } from "../diffReport/diffReport.types";
import { BaseMetadataProfileResource, MetadataProfileDiff, MetadataProfileSyncResult } from "./metadataProfile.types";

export function metadataProfileDiffToDiffEntries(diff: MetadataProfileDiff): DiffEntry[] {
  const entries: DiffEntry[] = diff.missingOnServer.map((profile) => ({
    resourceType: "MetadataProfile",
    name: profile.name,
    action: "create" as const,
  }));

  for (const { config, fieldChanges } of diff.changed) {
    entries.push({ resourceType: "MetadataProfile", name: config.name, action: "update", fieldChanges });
  }

  return entries;
}

// Base class for metadata profile synchronization
export abstract class BaseMetadataProfileSync<T extends BaseMetadataProfileResource = any> {
  protected api: IArrClient = getUnifiedClient();
  protected logger = logger;

  protected abstract loadFromServer(): Promise<T[]>;
  protected abstract getArrType(): ArrType;

  protected abstract createMetadataProfile(resolvedConfig: T): Promise<T>;
  protected abstract updateMetadataProfile(id: string, resolvedConfig: T): Promise<T>;
  protected abstract deleteProfile(id: string): Promise<void>;

  abstract calculateDiff(profiles: InputConfigMetadataProfile[], serverCache: ServerCache): Promise<MetadataProfileDiff<T> | null>;

  public abstract resolveConfig(config: InputConfigMetadataProfile, serverCache: ServerCache): Promise<T>;

  /**
   * Sync metadata profiles - handles add/update and optional deletion
   */
  async syncMetadataProfiles(config: MergedConfigInstance, serverCache: ServerCache): Promise<MetadataProfileSyncResult> {
    const profiles = config.metadata_profiles || [];
    const deleteConfig = config.delete_unmanaged_metadata_profiles;

    // Step 1: Perform sync (add/update)
    const { added, updated, diffEntries } = await this.performSync(profiles, serverCache);

    // Step 2: Handle deletion if requested
    let removed = 0;
    let deletionDiffEntries: DiffEntry[] = [];
    if (deleteConfig) {
      const deletionResult = await this.performDeletion(profiles, deleteConfig);
      removed = deletionResult.removed;
      deletionDiffEntries = deletionResult.diffEntries;
    }

    // Combine results
    const totalChanges = added + updated + removed;
    if (totalChanges > 0) {
      this.logger.info(`Updated MetadataProfiles: +${added} ~${updated} -${removed}`);
    }

    return {
      added,
      updated,
      removed,
      diffEntries: [...diffEntries, ...deletionDiffEntries],
    };
  }

  private async performSync(
    profiles: InputConfigMetadataProfile[],
    serverCache: ServerCache,
  ): Promise<{ added: number; updated: number; diffEntries: DiffEntry[] }> {
    const diff = await this.calculateDiff(profiles, serverCache);

    if (!diff) {
      return { added: 0, updated: 0, diffEntries: [] };
    }

    const diffEntries = metadataProfileDiffToDiffEntries(diff);

    if (getEnvs().DRY_RUN) {
      this.logger.info("DryRun: Would update MetadataProfiles.");
      return {
        added: diff.missingOnServer.length,
        updated: diff.changed.length,
        diffEntries,
      };
    }

    let added = 0,
      updated = 0;

    // Add missing profiles
    for (const profile of diff.missingOnServer) {
      this.logger.info(`Adding MetadataProfile missing on server: ${profile.name}`);
      const resolvedConfig = await this.resolveConfig(profile, serverCache);
      await this.createMetadataProfile(resolvedConfig);
      added++;
    }

    // Update changed profiles
    for (const { config, server } of diff.changed) {
      this.logger.info(`Updating MetadataProfile: ${config.name}`);
      const resolvedConfig = await this.resolveConfig(config, serverCache);
      await this.updateMetadataProfile(String(server.id), resolvedConfig);
      updated++;
    }

    return { added, updated, diffEntries };
  }

  private async performDeletion(
    managedProfiles: InputConfigMetadataProfile[],
    deleteConfig: NonNullable<MergedConfigInstance["delete_unmanaged_metadata_profiles"]>,
  ): Promise<{ removed: number; diffEntries: DiffEntry[] }> {
    const shouldDelete = deleteConfig.enabled;

    if (!shouldDelete) {
      return { removed: 0, diffEntries: [] };
    }

    const ignoreList = deleteConfig.ignore ?? [];
    const serverProfiles = await this.loadFromServer();
    const managedNames = new Set(managedProfiles.map((p) => p.name));
    const ignoreSet = new Set(ignoreList);

    // Always ignore the built-in 'None' metadata profile by default (e.g. Readarr, Lidarr).
    ignoreSet.add("None");

    const toDelete = serverProfiles.filter((p: any) => p.name && !managedNames.has(p.name) && !ignoreSet.has(p.name));

    if (toDelete.length === 0) {
      return { removed: 0, diffEntries: [] };
    }

    const diffEntries: DiffEntry[] = toDelete.map((p: any) => ({
      resourceType: "MetadataProfile",
      name: p.name,
      action: "delete" as const,
    }));

    if (getEnvs().DRY_RUN) {
      this.logger.info(
        `DryRun: Would delete ${toDelete.length} unmanaged MetadataProfiles: ${toDelete.map((p: any) => p.name).join(", ")}`,
      );
      return { removed: toDelete.length, diffEntries };
    }

    this.logger.info(`Deleting ${toDelete.length} unmanaged MetadataProfiles ...`);
    let deleted = 0;

    for (const profile of toDelete) {
      try {
        await this.deleteProfile(String(profile.id));
        this.logger.info(`Deleted MetadataProfile: '${profile.name || profile.id}'`);
        deleted++;
      } catch (err: any) {
        // Check if profile is in use
        const errorMessage = err?.message || err?.toString() || "";
        const isInUse = errorMessage.toLowerCase().includes("in use") || errorMessage.toLowerCase().includes("being used");

        if (isInUse) {
          this.logger.info(`Metadata profile "${profile.name ?? profile.id}" is in use and could not be deleted.`);
        } else {
          this.logger.error(
            `Failed deleting MetadataProfile (${profile.name ?? profile.id}). ` +
              "This profile will be left in place; check your Arr logs if you expected it to be removable.",
          );
          this.logger.debug(err, "Error while deleting MetadataProfile");
        }
        // Continue with other profiles; deleting unmanaged metadata profiles is best-effort.
      }
    }

    return { removed: deleted, diffEntries };
  }
}
