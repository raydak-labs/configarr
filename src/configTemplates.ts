import { logger } from "./logger";
import { mergeNotifications } from "./notifications/mergeNotifications";
import {
  transformTrashCFGroups,
  TransformTrashCFGroupsOptions,
  TransformTrashQPCFGroupsOptions,
  transformTrashQDs,
  transformTrashQPCFGroups,
  transformTrashQPCFs,
  transformTrashQPToTemplate,
} from "./trash-guide";
import { ArrType, MappedMergedTemplates, MappedTemplates } from "./types/common.types";
import {
  InputConfigCustomFormatGroup,
  InputConfigIncludeItem,
  InputConfigQualitySize,
  InputConfigRecyclarrReleaseProfile,
  InputConfigReleaseProfile,
} from "./types/config.types";
import { ConfigValidationError, warnOrThrowConfig } from "./validation";
import {
  TrashCFGroupMapping,
  TrashQP,
  TrashQualityDefinition,
  TrashQualityDefinitionQuality,
  TrashQualityDefinitionSchema,
} from "./types/trashguide.types";
import { isUrl, loadTemplateFromUrl } from "./url-template-importer";

export const expandAndAppendCustomFormatGroups = (
  customFormatGroups: InputConfigCustomFormatGroup[] | undefined,
  trashCFGroupMapping: TrashCFGroupMapping,
  mergedTemplates: MappedMergedTemplates,
  cfGroupOptions?: TransformTrashCFGroupsOptions,
) => {
  if (!customFormatGroups || customFormatGroups.length === 0) return;
  const expanded = transformTrashCFGroups(trashCFGroupMapping, customFormatGroups, cfGroupOptions);
  if (expanded.length > 0) {
    logger.debug(`Expanded and appended ${expanded.length} custom formats from customFormatGroups`);
    mergedTemplates.custom_formats.push(...expanded);
  }
};

function isRecyclarrReleaseProfile(
  profile: InputConfigReleaseProfile | InputConfigRecyclarrReleaseProfile,
): profile is InputConfigRecyclarrReleaseProfile {
  return "trash_ids" in profile;
}

export function filterConfigarrReleaseProfiles(
  profiles: (InputConfigReleaseProfile | InputConfigRecyclarrReleaseProfile)[],
): InputConfigReleaseProfile[] | undefined {
  const ours = profiles.filter((profile): profile is InputConfigReleaseProfile => !isRecyclarrReleaseProfile(profile));
  const skipped = profiles.length - ours.length;
  if (skipped > 0) {
    logger.warn(`Ignoring ${skipped} Recyclarr-style release_profiles (trash_ids). Use custom_formats instead.`);
  }
  if (ours.length === 0 && skipped > 0) {
    return undefined;
  }
  return ours;
}

/**
 * Merge a single template into the accumulated instance template mapping.
 * Applies template rules and settings into the target merged template object.
 */
const includeRecyclarrTemplate = (
  template: MappedTemplates,
  {
    mergedTemplates,
    trashCFGroupMapping,
    cfGroupOptions,
  }: {
    mergedTemplates: MappedMergedTemplates;
    trashCFGroupMapping: TrashCFGroupMapping;
    cfGroupOptions?: TransformTrashCFGroupsOptions;
  },
) => {
  // First expand and append group custom formats
  if (template.custom_format_groups) {
    expandAndAppendCustomFormatGroups(template.custom_format_groups, trashCFGroupMapping, mergedTemplates, cfGroupOptions);
  }
  // Then push direct custom formats after, so they always win
  if (template.custom_formats) {
    mergedTemplates.custom_formats.push(...template.custom_formats);
  }

  if (template.quality_definition) {
    mergedTemplates.quality_definition = {
      ...mergedTemplates.quality_definition,
      ...template.quality_definition,
      qualities: [...(mergedTemplates.quality_definition?.qualities || []), ...(template.quality_definition.qualities || [])],
    };
  }

  if (template.quality_profiles) {
    for (const qp of template.quality_profiles) {
      mergedTemplates.quality_profiles.push(qp);
    }
  }

  if (template.metadata_profiles) {
    mergedTemplates.metadata_profiles = [...(mergedTemplates.metadata_profiles || []), ...template.metadata_profiles];
  }

  if (template.metadata !== undefined) mergedTemplates.metadata = template.metadata;
  if (template.indexer_settings !== undefined) mergedTemplates.indexer_settings = template.indexer_settings;
  if (template.indexer_config !== undefined) {
    mergedTemplates.indexer_config = { ...mergedTemplates.indexer_config, ...template.indexer_config };
  }
  if (template.notifications) {
    mergedTemplates.notifications = mergeNotifications(mergedTemplates.notifications, template.notifications);
  }

  if (template.delete_unmanaged_metadata_profiles) {
    mergedTemplates.delete_unmanaged_metadata_profiles = template.delete_unmanaged_metadata_profiles;
  }

  // Collectives accumulate across templates so a later include cannot drop what an earlier one
  // contributed; the instance config still overrides, since it runs last.
  if (template.tags) {
    mergedTemplates.tags = [...new Set([...(mergedTemplates.tags ?? []), ...template.tags])];
  }

  if (template.delete_unmanaged_tags) {
    mergedTemplates.delete_unmanaged_tags = {
      enabled: template.delete_unmanaged_tags.enabled,
      ignore: [...new Set([...(mergedTemplates.delete_unmanaged_tags?.ignore ?? []), ...(template.delete_unmanaged_tags.ignore ?? [])])],
    };
  }

  if (template.media_management) {
    mergedTemplates.media_management = { ...mergedTemplates.media_management, ...template.media_management };
  }

  if (template.media_naming) {
    mergedTemplates.media_naming = { ...mergedTemplates.media_naming, ...template.media_naming };
  }

  if (template.media_naming_api) {
    mergedTemplates.media_naming_api = { ...mergedTemplates.media_naming_api, ...template.media_naming_api };
  }

  if (template.customFormatDefinitions) {
    if (Array.isArray(template.customFormatDefinitions)) {
      mergedTemplates.customFormatDefinitions = [...(mergedTemplates.customFormatDefinitions || []), ...template.customFormatDefinitions];
    } else {
      logger.warn(`CustomFormatDefinitions in template must be an array. Ignoring.`);
    }
  }

  if (template.root_folders) {
    if (Array.isArray(template.root_folders)) {
      mergedTemplates.root_folders = [...(mergedTemplates.root_folders || []), ...template.root_folders];
    } else {
      logger.warn(`Root folders in template must be an array. Ignoring.`);
    }
  }

  if (template.delay_profiles) {
    mergedTemplates.delay_profiles = template.delay_profiles;
  }

  if (template.release_profiles) {
    const filtered = filterConfigarrReleaseProfiles(template.release_profiles);
    if (filtered !== undefined) {
      mergedTemplates.release_profiles = filtered;
    }
  }

  if (template.download_clients) {
    const existing = mergedTemplates.download_clients;
    mergedTemplates.download_clients = {
      ...existing,
      ...template.download_clients,
      data: [...(existing?.data ?? []), ...(template.download_clients.data ?? [])],
      remote_paths: [...(existing?.remote_paths ?? []), ...(template.download_clients.remote_paths ?? [])],
      update_password: template.download_clients.update_password ?? existing?.update_password,
      update_password_on_test_fail: template.download_clients.update_password_on_test_fail ?? existing?.update_password_on_test_fail,
      delete_unmanaged: template.download_clients.delete_unmanaged ?? existing?.delete_unmanaged,
    };
  }

  // TODO Ignore recursive include for now
  if (template.include) {
    logger.warn(`Recursive includes not supported at the moment. Ignoring.`);
  }
};

// TODO: local TRaSH-Guides QP templates do not work yet
const includeTrashTemplate = (
  template: TrashQP,
  {
    mergedTemplates,
    trashQD,
    arrType,
    supportsProfileQualitySizes,
    trashCFGroupMapping,
    useExcludeSemantics,
    autoTrashCfGroupOptions,
  }: {
    mergedTemplates: MappedMergedTemplates;
    trashQD: Map<string, TrashQualityDefinition>;
    arrType: ArrType;
    supportsProfileQualitySizes: boolean;
    trashCFGroupMapping: TrashCFGroupMapping;
    useExcludeSemantics: boolean;
    autoTrashCfGroupOptions: TransformTrashQPCFGroupsOptions;
  },
) => {
  let qualitySizes: InputConfigQualitySize[] | undefined;
  if (arrType === "SONARR" && template.trash_quality_definition) {
    if (supportsProfileQualitySizes) {
      const references = Object.entries(template.trash_quality_definition);
      if (references.length !== 1 || !/^[a-f\d]{32}$/i.test(references[0]?.[1] ?? "")) {
        throw new ConfigValidationError(
          `TRaSH quality profile '${template.name}' must contain exactly one valid trash_id in trash_quality_definition.`,
        );
      }
      const [, trashId] = references[0]!;
      const definition = trashQD.get(trashId.toLowerCase());
      if (definition == null) {
        throw new ConfigValidationError(`TRaSH quality profile '${template.name}' references unknown quality definition '${trashId}'.`);
      }
      qualitySizes = definition.qualities.map(({ quality, min, preferred, max }) => ({ quality, min, preferred, max }));
    } else {
      logger.warn(
        `TRaSH quality profile '${template.name}' references '${Object.keys(template.trash_quality_definition)[0]}' quality sizes, which are only supported by Sonarr v5. Ignoring for this Sonarr instance.`,
      );
    }
  }

  // useExcludeSemantics=true means use old TRaSH-Guides behavior (before Feb 2026)
  // This affects both CF groups semantics and quality ordering
  mergedTemplates.quality_profiles.push(transformTrashQPToTemplate(template, useExcludeSemantics, qualitySizes));
  mergedTemplates.custom_formats.push(transformTrashQPCFs(template));

  // For TrashGuide profiles, check and include default CF groups
  const requiredCFsFromCFGroups = transformTrashQPCFGroups(template, trashCFGroupMapping, useExcludeSemantics, autoTrashCfGroupOptions);

  const numberOfCfsLoaded = requiredCFsFromCFGroups.reduce((p, c) => {
    (c.trash_ids || []).forEach((id) => p.add(id));
    return p;
  }, new Set<string>());

  // Log how many CFs were loaded from groups
  logger.info(`Loaded ${numberOfCfsLoaded.size} default CFs from CF-Groups for TRaSH-Guide profile '${template.name}'`);
  mergedTemplates.custom_formats.push(...requiredCFsFromCFGroups);
};

export const isTrashQualityDefinition = (json: unknown): json is TrashQualityDefinition => {
  const result = TrashQualityDefinitionSchema.safeParse(json);
  if (!result.success) return false;
  if (Array.isArray((json as Record<string, unknown>).items)) return false;
  return true;
};

const applyQualityDefinitionFromInclude = (
  qd: TrashQualityDefinition,
  preferredRatio: number | undefined,
  mergedTemplates: MappedMergedTemplates,
): void => {
  const qualities: TrashQualityDefinitionQuality[] =
    preferredRatio != null && preferredRatio >= 0 && preferredRatio <= 1 ? transformTrashQDs(qd, preferredRatio) : qd.qualities;

  mergedTemplates.quality_definition = {
    ...mergedTemplates.quality_definition,
    qualities: [...(mergedTemplates.quality_definition?.qualities || []), ...qualities],
  };
  logger.info(`QualityDefinition: Applied '${qd.type}' from include (${qualities.length} qualities).`);
};

export const includeTemplateOrderDefault = async (
  include: InputConfigIncludeItem[],
  {
    recyclarr,
    local,
    trash,
    trashQD,
    arrType,
    supportsProfileQualitySizes,
    trashCFGroupMapping,
    useExcludeSemantics,
    cfGroupOptions,
    autoTrashCfGroupDefaults,
  }: {
    recyclarr: Map<string, MappedTemplates>;
    local: Map<string, MappedTemplates>;
    trash: Map<string, TrashQP>;
    trashQD: Map<string, TrashQualityDefinition>;
    arrType: ArrType;
    supportsProfileQualitySizes: boolean;
    trashCFGroupMapping: TrashCFGroupMapping;
    useExcludeSemantics: boolean;
    cfGroupOptions?: TransformTrashCFGroupsOptions;
    autoTrashCfGroupDefaults: TransformTrashQPCFGroupsOptions;
  },
  { mergedTemplates }: { mergedTemplates: MappedMergedTemplates },
) => {
  const resolveAutoTrashCfGroupOptions = (includeItem: InputConfigIncludeItem): TransformTrashQPCFGroupsOptions => ({
    includeDefaultOptionalCfs: includeItem.trash_cfgroup_include_optional ?? autoTrashCfGroupDefaults.includeDefaultOptionalCfs ?? true,
    includeUnrequired: includeItem.trash_cfgroup_include_unrequired ?? autoTrashCfGroupDefaults.includeUnrequired ?? false,
    includeCfs: includeItem.trash_cfgroup_include_cfs ?? autoTrashCfGroupDefaults.includeCfs,
    excludeCfs: includeItem.trash_cfgroup_exclude_cfs ?? autoTrashCfGroupDefaults.excludeCfs,
    silenceRequiredExclusionWarnings: autoTrashCfGroupDefaults.silenceRequiredExclusionWarnings,
  });

  const mappedIncludes = include.reduce<{
    local: InputConfigIncludeItem[];
    recyclarr: InputConfigIncludeItem[];
    trash: InputConfigIncludeItem[];
    url: InputConfigIncludeItem[];
  }>(
    (previous, current) => {
      // Check if template is a URL - all URLs go to url array, source is passed to loader
      if (isUrl(current.template)) {
        previous.url.push(current);
        return previous;
      }

      switch (current.source) {
        case "TRASH":
          if (trash.has(current.template) || trashQD.has(current.template.toLowerCase())) {
            previous.trash.push(current);
          } else {
            warnOrThrowConfig(`Included 'TRASH' template: ${current.template} not found.`);
          }
          break;
        case "RECYCLARR":
        // RECYCLARR intentionally shares LOCAL fallback matching; strict separation would break defaults.
        case undefined:
          let recyclarrFound = false;
          let localFound = false;

          if (recyclarr.has(current.template)) {
            recyclarrFound = true;
          }

          if (local.has(current.template)) {
            localFound = true;
          }

          if (recyclarrFound === true && localFound === true) {
            logger.warn(`Found matching 'RECYCLARR' and 'LOCAL' template for '${current.template}. Using 'LOCAL'.`);
            previous.local.push(current);
          } else if (recyclarrFound === true) {
            previous.recyclarr.push(current);
          } else if (localFound === true) {
            previous.local.push(current);
          } else {
            warnOrThrowConfig(`No matching 'RECYCLARR' or 'LOCAL' template for '${current.template}'`);
          }

          break;
      }

      return previous;
    },
    { recyclarr: [], trash: [], local: [], url: [] },
  );

  logger.info(
    `Found ${include.length} templates to include. Mapped to [recyclarr]=${mappedIncludes.recyclarr.length}, [local]=${mappedIncludes.local.length}, [trash]=${mappedIncludes.trash.length}, [url]=${mappedIncludes.url.length} ...`,
  );

  // Load URL templates up front so profiles can resolve quality definitions regardless of include order.
  const urlTemplates: { include: InputConfigIncludeItem; template: MappedTemplates | TrashQP | TrashQualityDefinition }[] = [];
  for (const e of mappedIncludes.url) {
    const resolvedTemplate = await loadTemplateFromUrl(e.template, e.source);
    if (resolvedTemplate == null) {
      logger.warn(`Failed to load template from URL: '${e.template}'`);
      continue;
    }

    if (e.source === "TRASH" && isTrashQualityDefinition(resolvedTemplate)) {
      trashQD.set(resolvedTemplate.trash_id.toLowerCase(), resolvedTemplate);
    }
    urlTemplates.push({ include: e, template: resolvedTemplate });
  }

  // Process URL templates in their configured order.
  for (const { include: e, template: resolvedTemplate } of urlTemplates) {
    // Route to appropriate handler based on source
    if (e.source === "TRASH") {
      if (isTrashQualityDefinition(resolvedTemplate)) {
        applyQualityDefinitionFromInclude(resolvedTemplate, e.preferred_ratio, mergedTemplates);
      } else {
        includeTrashTemplate(resolvedTemplate as TrashQP, {
          mergedTemplates,
          trashQD,
          arrType,
          supportsProfileQualitySizes,
          trashCFGroupMapping,
          useExcludeSemantics,
          autoTrashCfGroupOptions: resolveAutoTrashCfGroupOptions(e),
        });
      }
    } else {
      includeRecyclarrTemplate(resolvedTemplate as MappedTemplates, { mergedTemplates, trashCFGroupMapping, cfGroupOptions });
    }
  }

  mappedIncludes.trash.forEach((e) => {
    // Check QD map first — quality definitions have a different structure than quality profiles
    const qdTemplate = trashQD.get(e.template.toLowerCase());
    if (qdTemplate) {
      applyQualityDefinitionFromInclude(qdTemplate, e.preferred_ratio, mergedTemplates);
      return;
    }

    const resolvedTemplate = trash.get(e.template);
    if (resolvedTemplate == null) {
      return;
    }
    includeTrashTemplate(resolvedTemplate, {
      mergedTemplates,
      trashQD,
      arrType,
      supportsProfileQualitySizes,
      trashCFGroupMapping,
      useExcludeSemantics,
      autoTrashCfGroupOptions: resolveAutoTrashCfGroupOptions(e),
    });
  });
  mappedIncludes.recyclarr.forEach((e) => {
    const resolvedTemplate = recyclarr.get(e.template);
    if (resolvedTemplate == null) {
      return;
    }
    includeRecyclarrTemplate(resolvedTemplate, { mergedTemplates, trashCFGroupMapping, cfGroupOptions });
  });
  mappedIncludes.local.forEach((e) => {
    const resolvedTemplate = local.get(e.template);
    if (resolvedTemplate == null) {
      return;
    }
    includeRecyclarrTemplate(resolvedTemplate, { mergedTemplates, trashCFGroupMapping, cfGroupOptions });
  });
};
