import type { QualityProfileQualityItemResource, QualityProfileResource } from "../__generated__/chaptarr/data-contracts";

/** Chaptarr's spec allows `quality: null` on a group item; the shared quality item models absence as `undefined`. */
export type ChaptarrQualityItem = Omit<QualityProfileQualityItemResource, "quality" | "items"> & {
  quality?: NonNullable<QualityProfileQualityItemResource["quality"]>;
  items?: ChaptarrQualityItem[] | null;
};

export type ChaptarrQualityProfileResource = Omit<QualityProfileResource, "items"> & { items?: ChaptarrQualityItem[] | null };

function normalizeQualityItem({ quality, items, ...rest }: QualityProfileQualityItemResource): ChaptarrQualityItem {
  return {
    ...rest,
    ...(quality != null && { quality }),
    ...(items !== undefined && { items: items === null ? null : items.map(normalizeQualityItem) }),
  };
}

export function normalizeQualityProfile({ items, ...rest }: QualityProfileResource): ChaptarrQualityProfileResource {
  return { ...rest, ...(items !== undefined && { items: items === null ? null : items.map(normalizeQualityItem) }) };
}
