export type QualityItem = {
  id?: number;
  name?: string | null;
  quality?: { id?: number; name?: string | null; resolution?: number };
  items?: QualityItem[] | null;
  allowed?: boolean;
  // Sonarr v5 only. Absent means "leave whatever the server has", and null clears it.
  minSize?: number | null;
  maxSize?: number | null;
  preferredSize?: number | null;
};

export type FormatItem = { id?: number; format?: number; name?: string | null; score?: number };

export type QualityProfileLanguage = { id?: number; name?: string | null; nameLower?: string | null };

export type CustomFormatRef = { id?: number; name?: string | null };

export type QualityProfileShared = {
  id?: number;
  name?: string | null;
  upgradeAllowed?: boolean;
  cutoff?: number;
  items?: QualityItem[] | null;
  minFormatScore?: number;
  cutoffFormatScore?: number;
  formatItems?: FormatItem[] | null;
  minUpgradeFormatScore?: number;
  language?: QualityProfileLanguage;
};
