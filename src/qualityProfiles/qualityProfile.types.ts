export type QualityItem = {
  id?: number;
  name?: string | null;
  quality?: { id?: number; name?: string | null; resolution?: number; source?: string } | null;
  items?: QualityItem[] | null;
  allowed?: boolean;
};

export type FormatItem = { id?: number; format?: number; name?: string | null; score?: number };

export type QualityProfileLanguage = { id?: number; name?: string | null; nameLower?: string | null };

export type CustomFormatRef = { id?: number; name?: string | null };

/** Config→API mapping document. Arr-specific fields are omitted before send. */
export type QualityProfilePayload = {
  id?: number;
  name?: string | null;
  upgradeAllowed?: boolean;
  cutoff?: number;
  items?: QualityItem[] | null;
  minFormatScore?: number;
  cutoffFormatScore?: number;
  minUpgradeFormatScore?: number;
  formatItems?: FormatItem[] | null;
  language?: QualityProfileLanguage | null;
};
