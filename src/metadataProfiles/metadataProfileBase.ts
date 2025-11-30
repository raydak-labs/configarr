import { ServerCache } from "../cache";
import { getUnifiedClient, IArrClient } from "../clients/unified-client";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { ArrType } from "../types/common.types";
import { InputConfigMetadataProfile, MergedConfigInstance } from "../types/config.types";
import { BaseMetadataProfileResource, MetadataProfileDiff, MetadataProfileSyncResult } from "./metadataProfile.types";

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
    const syncResult = await this.performSync(profiles, serverCache);

    // Step 2: Handle deletion if requested
    let removed = 0;
    if (deleteConfig) {
      removed = await this.performDeletion(profiles, deleteConfig);
    }

    // Combine results
    const totalChanges = syncResult.added + syncResult.updated + removed;
    if (totalChanges > 0) {
      this.logger.info(`Updated MetadataProfiles: +${syncResult.added} ~${syncResult.updated} -${removed}`);
    }

    return {
      added: syncResult.added,
      updated: syncResult.updated,
      removed,
    };
  }

  private async performSync(profiles: InputConfigMetadataProfile[], serverCache: ServerCache): Promise<{ added: number; updated: number }> {
    const diff = await this.calculateDiff(profiles, serverCache);

    if (!diff) {
      return { added: 0, updated: 0 };
    }

    if (getEnvs().DRY_RUN) {
      this.logger.info("DryRun: Would update MetadataProfiles.");
      return {
        added: diff.missingOnServer.length,
        updated: diff.changed.length,
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

    return { added, updated };
  }

  private async performDeletion(
    managedProfiles: InputConfigMetadataProfile[],
    deleteConfig: NonNullable<MergedConfigInstance["delete_unmanaged_metadata_profiles"]>,
  ): Promise<number> {
    const shouldDelete = deleteConfig.enabled;

    if (!shouldDelete) {
      return 0;
    }

    const ignoreList = deleteConfig.ignore ?? [];
    const serverProfiles = await this.loadFromServer();
    const managedNames = new Set(managedProfiles.map((p) => p.name));
    const ignoreSet = new Set(ignoreList);

    // Always ignore the built-in 'None' metadata profile by default (e.g. Readarr, Lidarr).
    ignoreSet.add("None");

    const toDelete = serverProfiles.filter((p: any) => p.name && !managedNames.has(p.name) && !ignoreSet.has(p.name));

    if (toDelete.length === 0) {
      return 0;
    }

    if (getEnvs().DRY_RUN) {
      this.logger.info(
        `DryRun: Would delete ${toDelete.length} unmanaged MetadataProfiles: ${toDelete.map((p: any) => p.name).join(", ")}`,
      );
      return toDelete.length;
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

    return deleted;
  }
}
