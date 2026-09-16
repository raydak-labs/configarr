import fs from "node:fs";
import { ServerCache } from "../cache";
import { ArrTypeToClient } from "../clients/client";
import { mergeConfigsAndTemplates } from "../config";
import { CFIDToConfigGroup, CFProcessing, CustomFormatRequest } from "../customFormats/customFormat.types";
import {
  calculateCFsToManage,
  deleteCustomFormat,
  loadCustomFormatDefinitions,
  loadServerCustomFormats,
  manageCf,
} from "../customFormats/customFormats";
import { BaseDelayProfileSync, delayProfilesToDiffEntries } from "../delayProfiles/delayProfileBase";
import { DelayProfileShared } from "../delayProfiles/delayProfile.types";
import { DiffCollector } from "../diffReport/diffCollector";
import { InstanceDiffReport } from "../diffReport/diffReport.types";
import { downloadClientConfigDiffToDiffEntries, syncDownloadClientConfig } from "../downloadClientConfig/downloadClientConfigSyncer";
import { syncDownloadClients } from "../downloadClients/downloadClientSyncer";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { MediaManagementSync, mediamanagementDiffToDiffEntries, namingDiffToDiffEntries } from "../mediaManagement/mediaManagement";
import { QualityDefinitionSync, qualityDefinitionsToDiffEntries } from "../qualityDefinitions/qualityDefinition";
import { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";
import { BaseQualityProfileSync, getUnmanagedQualityProfiles, qualityProfilesToDiffEntries } from "../qualityProfiles/qualityProfileBase";
import { QualityProfileShared } from "../qualityProfiles/qualityProfile.types";
import { syncRemotePaths } from "../remotePaths/remotePathSyncer";
import { BaseRootFolderSync } from "../rootFolder/rootFolderBase";
import { loadServerTags } from "../tags/tags";
import { getTelemetryInstance, Telemetry } from "../telemetry";
import { MediaArrType } from "../types/common.types";
import { InputConfigArrInstance, InputConfigSchema, MergedConfigInstance } from "../types/config.types";
import { TrashQualityDefinitionQuality } from "../types/trashguide.types";
import { syncUiConfig, uiConfigDiffToDiffEntries } from "../uiConfigs/uiConfigSyncer";

export type MediaFeatureSyncs = {
  qd: QualityDefinitionSync<QualityDefinitionShared>;
  mm: MediaManagementSync<{ id?: number }, { id?: number }>;
  qp: BaseQualityProfileSync<QualityProfileShared>;
  delay: BaseDelayProfileSync<DelayProfileShared>;
  root: BaseRootFolderSync;
};

export type MediaTrashOps = {
  loadCFs: () => Promise<CFIDToConfigGroup>;
  checkConflicts: (mergedCFs: CFProcessing, config: MergedConfigInstance) => Promise<void>;
  loadQdType: (type: string, preferredRatio?: number) => Promise<TrashQualityDefinitionQuality[]>;
};

export type MediaSyncContext<T extends MediaArrType = MediaArrType> = {
  arrType: T;
  instanceName: string;
  client: ArrTypeToClient[T];
  config: MergedConfigInstance;
  serverCache: ServerCache;
  collector: DiffCollector;
  syncs: MediaFeatureSyncs;
};

export type MediaSyncToQualityProfilesArgs<T extends MediaArrType = MediaArrType> = {
  arrType: T;
  instanceName: string;
  globalConfig: InputConfigSchema;
  instanceConfig: InputConfigArrInstance;
  client: ArrTypeToClient[T];
  syncs: MediaFeatureSyncs;
  trash?: MediaTrashOps;
};

export const runMediaSyncToQualityProfiles = async <T extends MediaArrType>(
  args: MediaSyncToQualityProfilesArgs<T>,
): Promise<MediaSyncContext<T>> => {
  const { arrType, instanceName, globalConfig, instanceConfig, client, syncs, trash } = args;
  const { qd: qdSync, mm: mmSync, qp: qpSync } = syncs;
  const collector = new DiffCollector();

  const system = await client.getSystemStatus();
  logger.info(`System status: ${JSON.stringify(system)}`);

  const serverCFs = await loadServerCustomFormats(arrType);
  const serverQD = await qdSync.loadFromServer();
  const languages = await client.getLanguages();

  const serverCache = new ServerCache({
    qualityDefinitions: serverQD,
    customFormats: serverCFs,
    languages,
  });

  logger.info(`Server objects: CustomFormats ${serverCFs.length}`);

  const { config } = await mergeConfigsAndTemplates(globalConfig, instanceConfig, arrType);

  if (Telemetry.isEnabled()) {
    getTelemetryInstance().trackInstanceConfig(config, arrType);
  }

  const idsToManage = calculateCFsToManage(config);
  logger.debug(Array.from(idsToManage), `CustomFormats to manage`);

  const trashCFs = trash ? await trash.loadCFs() : new Map();
  const mergedCFs = await loadCustomFormatDefinitions(idsToManage, config.customFormatDefinitions || [], trashCFs);
  if (trash && !globalConfig.silenceTrashConflictWarnings) {
    await trash.checkConflicts(mergedCFs, config);
  }

  const serverCFMapping = serverCache.customFormats.reduce((p, c) => {
    p.set(c.name!, c);
    return p;
  }, new Map<string, CustomFormatRequest>());

  const cfUpdateResult = await manageCf(arrType, mergedCFs, serverCFMapping);
  collector.add(cfUpdateResult.diffEntries);

  // add missing CFs to list because we need it for further steps
  // serverCFs.push(...cfUpdateResult.createCFs);
  if (cfUpdateResult.createCFs.length > 0 || cfUpdateResult.updatedCFs.length > 0) {
    // refresh cfs
    serverCache.customFormats = await loadServerCustomFormats(arrType);
  }

  if (config.delete_unmanaged_custom_formats?.enabled) {
    const idToCf = mergedCFs.carrIdMapping;

    const mm = Array.from(idsToManage).reduce((p, c) => {
      const cfName = idToCf.get(c)?.carrConfig.name;
      if (cfName != null) {
        p.set(cfName, true);
      }
      return p;
    }, new Map<string, boolean>());

    config.delete_unmanaged_custom_formats.ignore?.forEach((e) => {
      mm.set(e, true);
    });

    const cfsToDelete = serverCache.customFormats.filter((e) => (e.name && mm.get(e.name)) !== true);

    if (cfsToDelete.length > 0) {
      collector.add(cfsToDelete.map((e) => ({ resourceType: "CustomFormat", name: e.name!, action: "delete" as const })));

      if (getEnvs().DRY_RUN) {
        logger.info(`DryRun: Would delete CF: ${cfsToDelete.map((e) => e.name).join(", ")}`);
      } else {
        logger.info(`Deleting ${cfsToDelete.length} CustomFormats ...`);
        logger.debug(
          cfsToDelete.map((e) => e.name),
          `This CustomFormats will be deleted:`,
        );

        for (const element of cfsToDelete) {
          await deleteCustomFormat(arrType, element);
        }
      }
    }
  }

  logger.info(`CustomFormats synchronized`);

  // load tags
  const serverTags = await loadServerTags(arrType);
  serverCache.tags = serverTags;

  if (config.quality_definition != null) {
    const mergedQDs: TrashQualityDefinitionQuality[] = [];
    const qualityDefinitionType = config.quality_definition.type;

    // TODO: maybe add id reference as usage
    if (qualityDefinitionType != null) {
      if (!trash) {
        logger.warn(`QualityDefinition type is not supported for ${arrType} (${qualityDefinitionType}).`);
      } else {
        try {
          mergedQDs.push(...(await trash.loadQdType(qualityDefinitionType, config.quality_definition?.preferred_ratio)));
        } catch (e: unknown) {
          if (e instanceof Error) {
            logger.error(e.message);
          } else {
            throw e;
          }
        }
      }
    } else {
      logger.debug(`QualityDefinition: No TRaSH-Guide filename defined (type).`);
    }

    if (config.quality_definition.qualities) {
      mergedQDs.push(...config.quality_definition.qualities);
    }

    const writeQd = !getEnvs().DRY_RUN;
    const { changeMap, restData } = await qdSync.persist(serverCache.qualityDefinitions, mergedQDs, writeQd);

    if (changeMap.size > 0) {
      collector.add(qualityDefinitionsToDiffEntries(changeMap));

      if (!writeQd) {
        logger.info("DryRun: Would update QualityDefinitions.");
      } else {
        logger.info(`Diffs in quality definitions found ${changeMap.values()}`);
        serverCache.qualityDefinitions = restData;
        logger.info(`Updated QualityDefinitions`);
      }
    } else {
      logger.info(`QualityDefinitions do not need update!`);
    }
  } else {
    logger.debug(`No QualityDefinition configured.`);
  }

  const write = !getEnvs().DRY_RUN;
  const namingDiff = await mmSync.persistNaming(config.media_naming_api, write);

  if (namingDiff) {
    collector.add(namingDiffToDiffEntries(namingDiff));

    if (!write) {
      logger.info("DryRun: Would update MediaNaming.");
    } else {
      logger.info(`Updated MediaNaming`);
    }
  }

  const managementDiff = await mmSync.persistMediamanagement(config.media_management, write);

  if (managementDiff) {
    collector.add(mediamanagementDiffToDiffEntries(managementDiff));

    if (!write) {
      logger.info("DryRun: Would update MediaManagement.");
    } else {
      logger.info(`Updated MediaManagement`);
    }
  }

  const uiConfigResult = await syncUiConfig(arrType, config.ui_config);
  collector.add(uiConfigDiffToDiffEntries(uiConfigResult));

  const serverQP = await qpSync.loadFromServer();
  serverCache.qualityProfiles = serverQP;

  logger.info(`Server objects: QualityProfiles ${serverQP.length}`);

  // calculate diff from server <-> what we want to be there
  const { changedQPs, create, noChanges, changes: qpChanges } = await qpSync.calculateQualityProfilesDiff(mergedCFs, config, serverCache);

  collector.add(qualityProfilesToDiffEntries(create, changedQPs, qpChanges));

  if (getEnvs().DEBUG_CREATE_FILES) {
    create.concat(changedQPs).forEach((e, i) => {
      fs.writeFileSync(`debug/test${i}.json`, JSON.stringify(e, null, 2), "utf-8");
    });
  }

  logger.info(`QualityProfiles: Create: ${create.length}, Update: ${changedQPs.length}, Unchanged: ${noChanges.length}`);

  const writeQualityProfiles = !getEnvs().DRY_RUN;
  if (!writeQualityProfiles && (create.length > 0 || changedQPs.length > 0)) {
    logger.info("DryRun: Would create/update QualityProfiles.");
  }
  await qpSync.persist({ create, changedQPs, noChanges, changes: qpChanges }, writeQualityProfiles);

  if (config.delete_unmanaged_quality_profiles?.enabled) {
    const unmanagedQPs = getUnmanagedQualityProfiles(serverCache.qualityProfiles, config.quality_profiles);

    const ignoreSet = new Set(config.delete_unmanaged_quality_profiles.ignore ?? []);

    const qpsToDelete = unmanagedQPs.filter((qp) => qp.name && !ignoreSet.has(qp.name));

    if (qpsToDelete.length > 0) {
      if (getEnvs().DRY_RUN) {
        logger.info(`DryRun: Would delete QP: ${qpsToDelete.map((e) => e.name).join(", ")}`);
      } else {
        logger.info(`Deleting ${qpsToDelete.length} QualityProfiles ...`);
        logger.debug(
          qpsToDelete.map((e) => e.name),
          "This QualityProfile will be deleted:",
        );
        for (const element of qpsToDelete) {
          await qpSync.deleteOnServer(element);
          logger.info(`Deleted QP: '${element.name || element.id}'`);
        }
      }
    }
  }

  return { arrType, instanceName, client, config, serverCache, collector, syncs };
};

export const completeMediaSync = async <T extends MediaArrType>(ctx: MediaSyncContext<T>): Promise<InstanceDiffReport> => {
  const { arrType, instanceName, client, config, serverCache, collector, syncs } = ctx;
  const delaySync = syncs.delay;

  const rootFolderResult = !config.root_folders
    ? { added: 0, removed: 0, updated: 0, diffEntries: [] }
    : await syncs.root.syncRootFolders(config.root_folders, serverCache);
  collector.add(rootFolderResult.diffEntries);

  // Handle delay profiles
  if (
    config.delay_profiles == null ||
    (config.delay_profiles.default == null && (config.delay_profiles.additional == null || config.delay_profiles.additional.length === 0))
  ) {
    logger.debug(`Config 'delay_profiles' not specified. Ignoring.`);
  } else {
    const delayProfilesDiff = await delaySync.calculateDiff(config.delay_profiles, serverCache.tags);

    if (delayProfilesDiff) {
      collector.add(delayProfilesToDiffEntries(delayProfilesDiff));
    }

    if (delayProfilesDiff?.defaultProfileChanged || delayProfilesDiff?.additionalProfilesChanged) {
      if (getEnvs().DRY_RUN) {
        logger.info("DryRun: Would update DelayProfiles.");
      } else {
        if (delayProfilesDiff.missingTags.length > 0) {
          logger.info(`Creating missing tags on server: ${delayProfilesDiff.missingTags.join(", ")}`);
          try {
            for (const tagName of delayProfilesDiff.missingTags) {
              const newTag = await client.createTag({ label: tagName });
              serverCache.tags.push(newTag);
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`Failed creating tags: ${message}`);
            throw err;
          }
        }

        if (delayProfilesDiff.defaultProfileChanged && delayProfilesDiff.defaultProfile) {
          if (delayProfilesDiff.defaultProfileId == null) {
            throw new Error("Default delay profile id missing from server; cannot update.");
          }
          logger.info(`Updating default DelayProfile`);
          await delaySync.updateDefaultFromConfig(delayProfilesDiff.defaultProfile, serverCache.tags, delayProfilesDiff.defaultProfileId);
        }

        if (delayProfilesDiff.additionalProfilesChanged && delayProfilesDiff.additionalProfiles) {
          logger.info(`Updating additional DelayProfiles (deleting old ones and recreate all) ...`);

          await delaySync.recreateAdditionalFromConfig(delayProfilesDiff.additionalProfiles, serverCache.tags);
        }

        logger.info(`Successfully synched delay profiles.`);
      }
    }
  }

  // Download Clients
  if (config.download_clients?.data || config.download_clients?.delete_unmanaged?.enabled) {
    try {
      const downloadClientsResult = await syncDownloadClients(arrType, config, serverCache);
      collector.add(downloadClientsResult.diffEntries);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to sync download clients: ${message}`);
    }
  }

  // Download Client Configuration
  if (config.download_clients?.config) {
    try {
      const downloadClientConfigResult = await syncDownloadClientConfig(arrType, config, serverCache);
      collector.add(downloadClientConfigDiffToDiffEntries(downloadClientConfigResult));
    } catch (err: any) {
      logger.error(`Failed to sync download client config: ${err.message}`);
    }
  }

  // Sync remote path mappings
  if (
    config.download_clients?.remote_paths !== undefined &&
    (config.download_clients.remote_paths.length > 0 || config.download_clients.delete_unmanaged_remote_paths)
  ) {
    logger.debug(`[DEBUG] About to sync remote paths for ${arrType}. Count: ${config.download_clients.remote_paths.length}`);
    try {
      const remotePathsResult = await syncRemotePaths(arrType, config);
      collector.add(remotePathsResult.diffEntries);
    } catch (err: any) {
      logger.error(`Failed to sync remote path mappings: ${err.message}`);
    }
  } else {
    logger.debug(`[DEBUG] No remote paths to sync for ${arrType}. download_clients: ${JSON.stringify(config.download_clients)}`);
  }

  return { arrType, instanceName, entries: collector.getEntries() };
};
