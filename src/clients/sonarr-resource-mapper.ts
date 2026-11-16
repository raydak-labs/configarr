import type {
  MediaManagementConfigResource,
  NamingConfigResource,
  QualityDefinitionResource,
  QualityProfileResource,
  ReleaseProfileResource,
} from "../__generated__/sonarr/data-contracts";
import type {
  CustomFormatSpecificationSchema as SonarrCustomFormatSpecificationV5,
  CustomFormatResource as SonarrCustomFormatV5,
  MediaManagementSettingsResource as SonarrMediaManagementV5,
  NamingSettingsResource as SonarrNamingV5,
  QualityDefinitionResource as SonarrQualityDefinitionV5,
  QualityProfileQualityItemResource as SonarrQualityItemV5,
  QualityProfileResource as SonarrQualityProfileV5,
  ReleaseProfileResource as SonarrReleaseProfileV5,
} from "../__generated__/sonarr-v5/data-contracts";
import type { CustomFormatRequest } from "../customFormats/customFormat.types";

export type QualitySize = Pick<QualityDefinitionResource, "minSize" | "maxSize" | "preferredSize">;
export type SonarrProfileQualitySizeValues = Pick<SonarrQualityItemV5, "minSize" | "maxSize" | "preferredSize">;

export type SonarrProfileQualitySize = SonarrProfileQualitySizeValues & { quality: string };

export type SonarrMediaManagementResource = MediaManagementConfigResource | SonarrMediaManagementV5;

export type SonarrProfileQualitySizes = {
  id: number;
  name: string;
  items: SonarrProfileQualitySize[];
};

export function copyV5Naming(settings: SonarrNamingV5): NamingConfigResource {
  return { ...settings };
}

export function copyV5QualityDefinition(definition: SonarrQualityDefinitionV5, sizes: QualitySize | undefined): QualityDefinitionResource {
  return {
    id: definition.id,
    quality: definition.quality,
    title: definition.title,
    weight: definition.weight,
    minSize: sizes?.minSize,
    maxSize: sizes?.maxSize,
    preferredSize: sizes?.preferredSize,
  };
}

export function copyV5QualityProfile(profile: SonarrQualityProfileV5): QualityProfileResource {
  return {
    id: profile.id,
    name: profile.name,
    upgradeAllowed: profile.upgradeAllowed,
    cutoff: profile.cutoff,
    items: profile.items?.map((item) => ({
      id: item.id,
      name: item.name,
      quality: item.quality,
      items: item.items?.map(copyV5QualityProfileItem),
      allowed: item.allowed,
    })),
    minFormatScore: profile.minFormatScore,
    cutoffFormatScore: profile.cutoffFormatScore,
    minUpgradeFormatScore: profile.minUpgradeFormatScore,
    formatItems: profile.formatItems,
  };
}

function copyV5QualityProfileItem(item: SonarrQualityItemV5): NonNullable<QualityProfileResource["items"]>[number] {
  return {
    id: item.id,
    name: item.name,
    quality: item.quality,
    items: item.items?.map(copyV5QualityProfileItem),
    allowed: item.allowed,
  };
}

export function copyV3ReleaseProfile(profile: ReleaseProfileResource): SonarrReleaseProfileV5 {
  return {
    id: profile.id,
    name: profile.name,
    enabled: profile.enabled,
    required: profile.required,
    ignored: profile.ignored,
    indexerIds: profile.indexerId == null || profile.indexerId <= 0 ? [] : [profile.indexerId],
    tags: profile.tags,
  };
}

export function toV3ReleaseProfile(profile: SonarrReleaseProfileV5): ReleaseProfileResource {
  return {
    id: profile.id,
    name: profile.name,
    enabled: profile.enabled,
    required: profile.required,
    ignored: profile.ignored,
    indexerId: profile.indexerIds?.[0] ?? 0,
    tags: profile.tags,
  };
}

export function copyV5MediaManagementToV3(settings: SonarrMediaManagementResource): MediaManagementConfigResource {
  const v3Settings = {
    ...settings,
    recycleBinCleanupDays: settings.recycleBinCleanupDays ?? undefined,
    minimumFreeSpaceWhenImporting: settings.minimumFreeSpaceWhenImporting ?? undefined,
  };
  for (const key of ["skipFreeSpaceCheckWhenGrabbing", "seasonPackUpgrade", "seasonPackUpgradeThreshold", "userRejectedExtensions"]) {
    Reflect.deleteProperty(v3Settings, key);
  }
  return v3Settings;
}

export function mergeV5MediaManagement(settings: SonarrMediaManagementResource, current: SonarrMediaManagementV5): SonarrMediaManagementV5 {
  return {
    ...current,
    ...settings,
    recycleBinCleanupDays: settings.recycleBinCleanupDays ?? current.recycleBinCleanupDays ?? null,
    minimumFreeSpaceWhenImporting: settings.minimumFreeSpaceWhenImporting ?? current.minimumFreeSpaceWhenImporting ?? null,
  };
}

export function toV5CustomFormat(
  format: CustomFormatRequest,
  specificationSchemas: SonarrCustomFormatSpecificationV5[],
): SonarrCustomFormatV5 {
  return {
    id: format.id,
    name: format.name,
    includeCustomFormatWhenRenaming: format.includeCustomFormatWhenRenaming,
    specifications:
      format.specifications?.map((specification) => {
        const schema = specificationSchemas.find((candidate) => candidate.implementation === specification.implementation);
        if (!schema) {
          throw new Error(
            `Sonarr v5 did not provide a schema for custom-format specification '${specification.implementation ?? "unknown"}'.`,
          );
        }

        const fields = specification.fields ?? [];
        return {
          id: specification.id,
          name: specification.name ?? schema.name,
          implementation: specification.implementation ?? schema.implementation,
          implementationName: schema.implementationName,
          infoLink: schema.infoLink,
          negate: specification.negate,
          required: specification.required,
          fields: (schema.fields ?? []).map((field) => ({
            ...field,
            ...fields.find((requestField) => requestField.name === field.name),
          })),
        };
      }) ?? null,
  };
}

function collectQualitySizes(items: SonarrQualityProfileV5["items"], sizes: Map<string, QualitySize[]>): void {
  for (const item of items ?? []) {
    if (item.quality?.name) {
      const found = sizes.get(item.quality.name) ?? [];
      found.push({ minSize: item.minSize, maxSize: item.maxSize, preferredSize: item.preferredSize });
      sizes.set(item.quality.name, found);
    }
    collectQualitySizes(item.items, sizes);
  }
}

export function collectProfileQualitySizes(items: SonarrQualityProfileV5["items"]): SonarrProfileQualitySize[] {
  const sizes: SonarrProfileQualitySize[] = [];
  const collect = (qualityItems: SonarrQualityProfileV5["items"]) => {
    for (const item of qualityItems ?? []) {
      if (item.quality?.name) {
        sizes.push({
          quality: item.quality.name,
          minSize: item.minSize,
          maxSize: item.maxSize,
          preferredSize: item.preferredSize,
        });
      }
      collect(item.items);
    }
  };
  collect(items);
  return sizes;
}

export function mergeProfileQualitySizes(
  items: SonarrQualityProfileV5["items"],
  sizes: ReadonlyMap<string, QualitySize>,
): SonarrQualityProfileV5["items"] {
  if (items == null) {
    return items;
  }
  return items.map((item) => {
    const configured = item.quality?.name ? sizes.get(item.quality.name) : undefined;
    const updated: SonarrQualityItemV5 = { ...item };
    if (item.items != null) {
      updated.items = mergeProfileQualitySizes(item.items, sizes);
    }

    for (const field of ["minSize", "maxSize", "preferredSize"] as const) {
      if (configured?.[field] !== undefined) {
        updated[field] = configured[field];
      }
    }
    return updated;
  });
}

export function commonQualitySizes(profiles: SonarrQualityProfileV5[]): Map<string, QualitySize> {
  const allSizes = new Map<string, QualitySize[]>();
  for (const profile of profiles) collectQualitySizes(profile.items, allSizes);

  const common = new Map<string, QualitySize>();
  for (const [name, entries] of allSizes) {
    const result: QualitySize = {};
    for (const field of ["minSize", "maxSize", "preferredSize"] as const) {
      const first = entries[0]?.[field];
      if (entries.every((entry) => entry[field] === first)) {
        result[field] = first;
      }
    }
    common.set(name, result);
  }
  return common;
}

function indexV5QualityItems(items: SonarrQualityProfileV5["items"]): Map<string, SonarrQualityItemV5> {
  const indexed = new Map<string, SonarrQualityItemV5>();
  for (const item of items ?? []) {
    if (item.quality?.name && !indexed.has(item.quality.name)) {
      indexed.set(item.quality.name, item);
    }
    for (const [qualityName, qualityItem] of indexV5QualityItems(item.items)) {
      if (!indexed.has(qualityName)) indexed.set(qualityName, qualityItem);
    }
  }
  return indexed;
}

export function mergeV5QualityItems(
  desiredItems: QualityProfileResource["items"],
  currentItems: SonarrQualityProfileV5["items"],
  sizes: Map<string, QualitySize>,
  qualityItems: ReadonlyMap<string, SonarrQualityItemV5> = indexV5QualityItems(currentItems),
): SonarrQualityItemV5[] {
  return (desiredItems ?? []).map((item) => {
    const qualityName = item.quality?.name;
    const existing = qualityName
      ? qualityItems.get(qualityName)
      : currentItems?.find((candidate) => (item.id != null ? candidate.id === item.id : candidate.name === item.name));
    const configuredSize = qualityName ? sizes.get(qualityName) : undefined;
    const mergedSize: QualitySize = {};

    for (const field of ["minSize", "maxSize", "preferredSize"] as const) {
      if (existing?.[field] !== undefined) {
        mergedSize[field] = existing[field];
      } else if (configuredSize && configuredSize[field] !== undefined) {
        mergedSize[field] = configuredSize[field];
      }
    }

    return {
      id: item.id,
      name: item.name,
      quality: item.quality,
      items: mergeV5QualityItems(item.items, existing?.items, sizes, qualityItems),
      allowed: item.allowed,
      ...mergedSize,
    };
  });
}
