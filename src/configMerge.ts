import { loadLocalRecyclarrTemplate } from "./local-importer";
import { logger } from "./logger";
import { mergeNotifications } from "./notifications/mergeNotifications";
import { filterInvalidQualityProfiles } from "./qualityProfiles/qualityProfileBase";
import { loadRecyclarrTemplates } from "./recyclarr-importer";
import {
  loadAllQDsFromTrash,
  loadQPFromTrash,
  loadTrashCustomFormatGroups,
  TransformTrashCFGroupsOptions,
  TransformTrashQPCFGroupsOptions,
} from "./trash-guide";
import { ArrType, MappedMergedTemplates, MappedTemplates } from "./types/common.types";
import {
  ConfigQualityProfile,
  InputConfigArrInstance,
  InputConfigCustomFormat,
  InputConfigMetadataProfile,
  InputConfigSchema,
  MergedConfigInstance,
} from "./types/config.types";
import { TrashCFGroupMapping, TrashQP, TrashQualityDefinition } from "./types/trashguide.types";
import { cloneWithJSON } from "./util";
import { validateConfig } from "./config";
import { expandAndAppendCustomFormatGroups, filterConfigarrReleaseProfiles, includeTemplateOrderDefault } from "./configTemplates";
import { mapConfigMediaNamingToApi } from "./configMediaNaming";

type MergedScoreInfo = {
  score?: number;
  use_default_score?: boolean;
};

const mergeAndReduceCustomFormats = (cfs: InputConfigCustomFormat[]) => {
  const idToQualityProfileToScore = new Map<string, Map<string, MergedScoreInfo>>();

  cfs.forEach((cf) => {
    if (!cf.trash_ids || cf.trash_ids.length === 0) {
      logger.info(
        `Custom format entry does not have trash_ids defined (empty trash_ids or not defined at all. Cleanup your config to remove this log). Entry: ${JSON.stringify(cf)}`,
      );
      return;
    }

    cf.trash_ids.forEach((id) => {
      if (!idToQualityProfileToScore.has(id)) {
        idToQualityProfileToScore.set(id, new Map());
      }

      const existing = idToQualityProfileToScore.get(id)!;

      [...(cf.quality_profiles || []), ...(cf.assign_scores_to || [])].forEach((qp) => {
        const hasUseDefaultScore = qp.use_default_score === true;

        if (!existing.has(qp.name)) {
          // Undefined score selects the TRaSH default during resolution.
          existing.set(qp.name, {
            score: hasUseDefaultScore ? undefined : qp.score,
            use_default_score: hasUseDefaultScore,
          });
        } else {
          const current = existing.get(qp.name)!;

          // Explicit default overrides earlier scores.
          if (hasUseDefaultScore) {
            existing.set(qp.name, { score: undefined, use_default_score: true });
          } else if (qp.score != null && qp.score != current.score) {
            // A new explicit score replaces the current score.
            existing.set(qp.name, { score: qp.score, use_default_score: false });
          }
          // Keep the current score otherwise.
        }
      });
    });
  });

  return Array.from(idToQualityProfileToScore.entries()).map(([trashId, qualityProfiles]) => {
    const assign_scores_to = Array.from(qualityProfiles.entries()).map(([name, info]) => ({
      name,
      score: info.score,
      use_default_score: info.use_default_score,
    }));

    const result: InputConfigCustomFormat = {
      trash_ids: [trashId],
      assign_scores_to,
    };

    return result;
  });
};

function mergeQualitySizes(
  previous: ConfigQualityProfile["quality_sizes"],
  current: ConfigQualityProfile["quality_sizes"],
): ConfigQualityProfile["quality_sizes"] {
  if (previous == null && current == null) {
    return undefined;
  }
  const merged = new Map((previous ?? []).map((size) => [size.quality, size]));
  for (const size of current ?? []) {
    merged.set(size.quality, { ...merged.get(size.quality), ...size });
  }
  return [...merged.values()];
}

/** Merge global, template, and instance config into one validated instance. */
export const mergeConfigsAndTemplates = async (
  globalConfig: InputConfigSchema,
  instanceConfig: InputConfigArrInstance,
  arrType: ArrType,
  options: { supportsProfileQualitySizes?: boolean } = {},
): Promise<{ config: MergedConfigInstance }> => {
  const localTemplateMap = loadLocalRecyclarrTemplate(arrType);
  let recyclarrTemplateMap: Map<string, MappedTemplates> = new Map();
  let trashTemplates: Map<string, TrashQP> = new Map();
  let trashQDTemplates: Map<string, TrashQualityDefinition> = new Map();
  let trashCFGroupMapping: TrashCFGroupMapping = new Map();
  if (arrType === "RADARR" || arrType === "SONARR") {
    recyclarrTemplateMap = loadRecyclarrTemplates(arrType);
    trashTemplates = await loadQPFromTrash(arrType);
    trashQDTemplates = await loadAllQDsFromTrash(arrType);
    trashCFGroupMapping = await loadTrashCustomFormatGroups(arrType);
  }
  logger.debug(
    `Loaded ${recyclarrTemplateMap.size} Recyclarr templates, ${localTemplateMap.size} local templates and ${trashTemplates.size} trash templates.`,
  );
  const mergedTemplates: MappedMergedTemplates = {
    custom_formats: [],
    quality_profiles: [],
  };
  // Legacy flag selects exclude semantics; default is include semantics.
  const useExcludeSemantics = globalConfig.compatibilityTrashGuide20260219Enabled === true;
  const supportsProfileQualitySizes = arrType === "SONARR" && options.supportsProfileQualitySizes === true;
  const autoTrashCfGroupDefaults: TransformTrashQPCFGroupsOptions = {
    includeDefaultOptionalCfs: instanceConfig.trash_cfgroup_config?.include_optional ?? true,
    includeUnrequired: instanceConfig.trash_cfgroup_config?.include_unrequired ?? false,
    includeCfs: instanceConfig.trash_cfgroup_config?.include_cfs,
    excludeCfs: instanceConfig.trash_cfgroup_config?.exclude_cfs,
    silenceRequiredExclusionWarnings: globalConfig.silenceRequiredCfGroupExclusionWarnings === true,
  };
  const cfGroupOptions: TransformTrashCFGroupsOptions = {
    silenceRequiredCfGroupExclusionWarnings: globalConfig.silenceRequiredCfGroupExclusionWarnings === true,
  };
  if (instanceConfig.include) {
    await includeTemplateOrderDefault(
      instanceConfig.include,
      {
        recyclarr: recyclarrTemplateMap,
        local: localTemplateMap,
        trash: trashTemplates,
        trashQD: trashQDTemplates,
        arrType,
        supportsProfileQualitySizes,
        trashCFGroupMapping,
        useExcludeSemantics,
        cfGroupOptions,
        autoTrashCfGroupDefaults,
      },
      {
        mergedTemplates,
      },
    );
  }

  // Expand groups before direct custom formats.
  if (instanceConfig.custom_format_groups) {
    expandAndAppendCustomFormatGroups(instanceConfig.custom_format_groups, trashCFGroupMapping, mergedTemplates, cfGroupOptions);
  }
  if (instanceConfig.custom_formats) {
    mergedTemplates.custom_formats.push(...instanceConfig.custom_formats);
  }

  if (instanceConfig.delete_unmanaged_custom_formats) {
    mergedTemplates.delete_unmanaged_custom_formats = instanceConfig.delete_unmanaged_custom_formats;
  }

  if (instanceConfig.delete_unmanaged_quality_profiles) {
    mergedTemplates.delete_unmanaged_quality_profiles = instanceConfig.delete_unmanaged_quality_profiles;
  }

  // Instance tags override template tags.
  if (instanceConfig.tags) {
    mergedTemplates.tags = instanceConfig.tags;
  }

  // Keep template-protected tags when merging instance ignores.
  if (instanceConfig.delete_unmanaged_tags) {
    mergedTemplates.delete_unmanaged_tags = {
      enabled: instanceConfig.delete_unmanaged_tags.enabled,
      ignore: [
        ...new Set([...(mergedTemplates.delete_unmanaged_tags?.ignore ?? []), ...(instanceConfig.delete_unmanaged_tags.ignore ?? [])]),
      ],
    };
  }

  if (instanceConfig.quality_profiles) {
    // User profiles must be complete; templates are completed during merging.
    mergedTemplates.quality_profiles.push(...(instanceConfig.quality_profiles as ConfigQualityProfile[]));
  }

  if (instanceConfig.media_management && Object.keys(instanceConfig.media_management).length > 0) {
    mergedTemplates.media_management = { ...mergedTemplates.media_management, ...instanceConfig.media_management };
  }

  if (instanceConfig.host_config !== undefined) mergedTemplates.host_config = instanceConfig.host_config;
  if (instanceConfig.import_lists !== undefined) mergedTemplates.import_lists = instanceConfig.import_lists;

  if (instanceConfig.ui_config && Object.keys(instanceConfig.ui_config).length > 0) {
    mergedTemplates.ui_config = { ...mergedTemplates.ui_config, ...instanceConfig.ui_config };
  }
  if (instanceConfig.metadata !== undefined) mergedTemplates.metadata = instanceConfig.metadata;
  if (instanceConfig.indexer_settings !== undefined) mergedTemplates.indexer_settings = instanceConfig.indexer_settings;
  if (instanceConfig.indexer_config !== undefined) {
    mergedTemplates.indexer_config = { ...mergedTemplates.indexer_config, ...instanceConfig.indexer_config };
  }

  if (instanceConfig.media_naming && Object.keys(instanceConfig.media_naming).length > 0) {
    mergedTemplates.media_naming_api = {
      ...mergedTemplates.media_naming_api,
      ...(await mapConfigMediaNamingToApi(arrType, instanceConfig.media_naming)),
    };
  }

  if (instanceConfig.media_naming_api && Object.keys(instanceConfig.media_naming_api).length > 0) {
    mergedTemplates.media_naming_api = { ...mergedTemplates.media_naming_api, ...instanceConfig.media_naming_api };
  }

  if (instanceConfig.quality_definition) {
    mergedTemplates.quality_definition = {
      ...mergedTemplates.quality_definition,
      ...instanceConfig.quality_definition,
      qualities: [...(mergedTemplates.quality_definition?.qualities || []), ...(instanceConfig.quality_definition.qualities || [])],
    };
  }

  if (globalConfig.customFormatDefinitions) {
    if (Array.isArray(globalConfig.customFormatDefinitions)) {
      mergedTemplates.customFormatDefinitions = [
        ...(mergedTemplates.customFormatDefinitions || []),
        ...globalConfig.customFormatDefinitions,
      ];
    } else {
      logger.warn(`CustomFormatDefinitions in global config file must be an array. Ignoring.`);
    }
  }

  if (instanceConfig.customFormatDefinitions) {
    if (Array.isArray(instanceConfig.customFormatDefinitions)) {
      mergedTemplates.customFormatDefinitions = [
        ...(mergedTemplates.customFormatDefinitions || []),
        ...instanceConfig.customFormatDefinitions,
      ];
    } else {
      logger.warn(`CustomFormatDefinitions in instance config file must be an array. Ignoring.`);
    }
  }

  if (instanceConfig.renameQualityProfiles && instanceConfig.renameQualityProfiles.length > 0) {
    const renameOrder: string[] = [];

    instanceConfig.renameQualityProfiles.forEach((e) => {
      const renameFrom = e.from;
      const renameTo = e.to;

      renameOrder.push(`'${renameFrom}' -> '${renameTo}'`);

      let renamedQPReferences = 0;
      let renamedCFAssignments = 0;

      mergedTemplates.quality_profiles.forEach((p) => {
        if (p.name === renameFrom) {
          p.name = renameTo;
          renamedQPReferences += 1;
        }
      });

      mergedTemplates.custom_formats.forEach((p) => {
        p.assign_scores_to?.some((cf) => {
          if (cf.name === renameFrom) {
            cf.name = renameTo;
            renamedCFAssignments += 1;
            return true;
          }
          return false;
        });
      });

      if (renamedQPReferences + renamedCFAssignments > 0) {
        logger.debug(
          `Renamed profile from '${renameFrom}' to '${renameTo}'. Found QP references ${renamedQPReferences}, CF references ${renamedCFAssignments}`,
        );
      }
    });

    if (renameOrder.length > 0) {
      logger.debug(`Will rename quality profiles in this order: ${renameOrder}`);
    }
  }

  if (instanceConfig.cloneQualityProfiles && instanceConfig.cloneQualityProfiles.length > 0) {
    const cloneOrder: string[] = [];

    const clonedReorderedProfiles: ConfigQualityProfile[] = [];

    instanceConfig.cloneQualityProfiles.forEach((e) => {
      const cloneSource = e.from;
      const cloneTarget = e.to;

      cloneOrder.push(`'${cloneSource}' -> '${cloneTarget}'`);

      let cloneQPReferences = 0;
      let cloneCFAssignments = 0;

      mergedTemplates.quality_profiles.forEach((p) => {
        clonedReorderedProfiles.push(p);

        if (p.name === cloneSource) {
          const clonedQP = cloneWithJSON(p);
          clonedQP.name = cloneTarget;
          clonedReorderedProfiles.push(clonedQP);
          cloneQPReferences++;
        }
      });

      mergedTemplates.custom_formats.forEach((p) => {
        const cf = p.assign_scores_to?.find((cf) => {
          if (cf.name === cloneSource) {
            cloneCFAssignments++;
            return true;
          }
          return false;
        });

        if (cf) {
          p.assign_scores_to?.push({ name: cloneTarget, score: cf.score });
        }
      });

      if (cloneQPReferences + cloneCFAssignments > 0) {
        logger.debug(
          `Cloning profile: source '${cloneSource}' - target '${cloneTarget}'. Found QP references ${cloneQPReferences}, CF references ${cloneCFAssignments}`,
        );
      }
    });

    mergedTemplates.quality_profiles = clonedReorderedProfiles;

    if (cloneOrder.length > 0) {
      logger.debug(`Will clone quality profiles in this order: ${cloneOrder}`);
    }
  }

  const recyclarrProfilesMerged = mergedTemplates.quality_profiles.reduce<Map<string, ConfigQualityProfile>>((p, c) => {
    const profile = p.get(c.name);

    if (profile == null) {
      p.set(c.name, c);
    } else {
      p.set(c.name, {
        ...profile,
        ...c,
        quality_sizes: mergeQualitySizes(profile.quality_sizes, c.quality_sizes),
        reset_unmatched_scores: {
          enabled: c.reset_unmatched_scores?.enabled ?? profile.reset_unmatched_scores?.enabled ?? true,
          except: c.reset_unmatched_scores?.except ?? profile.reset_unmatched_scores?.except,
        },
        upgrade: {
          ...profile.upgrade,
          ...c.upgrade,
        },
      });
    }

    return p;
  }, new Map());

  mergedTemplates.quality_profiles = Array.from(recyclarrProfilesMerged.values());

  mergedTemplates.quality_profiles = filterInvalidQualityProfiles(mergedTemplates.quality_profiles);

  if (instanceConfig.metadata_profiles) {
    mergedTemplates.metadata_profiles = [...(mergedTemplates.metadata_profiles || []), ...instanceConfig.metadata_profiles];

    // Instance metadata profiles override same-named template profiles.
    const metadataProfilesByName = new Map<string, InputConfigMetadataProfile>();

    for (const profile of mergedTemplates.metadata_profiles) {
      metadataProfilesByName.set(profile.name, profile);
    }

    mergedTemplates.metadata_profiles = Array.from(metadataProfilesByName.values());
  }

  if (instanceConfig.delete_unmanaged_metadata_profiles) {
    const templateIgnore = mergedTemplates.delete_unmanaged_metadata_profiles?.ignore ?? [];
    const instanceIgnore = instanceConfig.delete_unmanaged_metadata_profiles.ignore ?? [];
    const mergedIgnore = [...new Set([...templateIgnore, ...instanceIgnore])];

    mergedTemplates.delete_unmanaged_metadata_profiles = {
      enabled: instanceConfig.delete_unmanaged_metadata_profiles.enabled,
      ignore: mergedIgnore,
    };
  }

  if (instanceConfig.root_folders) {
    mergedTemplates.root_folders = [...(mergedTemplates.root_folders || []), ...instanceConfig.root_folders];
  }

  if (mergedTemplates.root_folders) {
    // Keep the first root folder for each path.
    const seenPaths = new Set<string>();
    mergedTemplates.root_folders = mergedTemplates.root_folders.filter((folder) => {
      const path = typeof folder === "string" ? folder : folder.path;
      if (seenPaths.has(path)) {
        return false;
      }
      seenPaths.add(path);
      return true;
    });
  }

  if (instanceConfig.delay_profiles) {
    mergedTemplates.delay_profiles = instanceConfig.delay_profiles;
  }

  if (instanceConfig.release_profiles) {
    const filtered = filterConfigarrReleaseProfiles(instanceConfig.release_profiles);
    if (filtered !== undefined) {
      mergedTemplates.release_profiles = filtered;
    }
  }

  if (instanceConfig.download_clients) {
    const existingData = mergedTemplates.download_clients?.data || [];
    const instanceData = instanceConfig.download_clients.data || [];
    const existingDeleteManaged = mergedTemplates.download_clients?.delete_unmanaged;
    const instanceDeleteManaged = instanceConfig.download_clients.delete_unmanaged;
    const existingConfig = mergedTemplates.download_clients?.config;
    const instanceConfig_ = instanceConfig.download_clients.config;
    const existingRemotePaths = mergedTemplates.download_clients?.remote_paths || [];
    const instanceRemotePaths = instanceConfig.download_clients.remote_paths || [];

    mergedTemplates.download_clients = {
      data: [...existingData, ...instanceData],
      update_password: instanceConfig.download_clients.update_password ?? mergedTemplates.download_clients?.update_password,
      update_password_on_test_fail:
        instanceConfig.download_clients.update_password_on_test_fail ?? mergedTemplates.download_clients?.update_password_on_test_fail,
      delete_unmanaged: instanceDeleteManaged ? instanceDeleteManaged : existingDeleteManaged,
      config: instanceConfig_ ? { ...existingConfig, ...instanceConfig_ } : existingConfig,
      remote_paths: [...existingRemotePaths, ...instanceRemotePaths],
      delete_unmanaged_remote_paths: instanceConfig.download_clients.delete_unmanaged_remote_paths,
    };
  }

  if (instanceConfig.notifications) {
    mergedTemplates.notifications = mergeNotifications(mergedTemplates.notifications, instanceConfig.notifications);
  }

  if (mergedTemplates.custom_formats && mergedTemplates.custom_formats.length > 0) {
    mergedTemplates.custom_formats = mergeAndReduceCustomFormats(mergedTemplates.custom_formats);
  }

  const validatedConfig = validateConfig(mergedTemplates);
  // Log section names only; download-client fields contain secrets.
  logger.debug(`Merged config sections: '${Object.keys(validatedConfig).join(", ")}'`);

  return { config: validatedConfig };
};
