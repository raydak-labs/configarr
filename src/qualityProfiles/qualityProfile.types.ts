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

export type QualityProfileShared = {
  id?: number;
  name?: string | null;
  upgradeAllowed?: boolean;
  cutoff?: number;
  items?: QualityItem[] | null;
  minFormatScore?: number;
  cutoffFormatScore?: number;
  formatItems?: FormatItem[] | null;
};

export type QualityProfileSonarrResource = QualityProfileShared & {
  minUpgradeFormatScore?: number;
};

export type QualityProfileRadarrWhisparrResource = QualityProfileShared & {
  minUpgradeFormatScore?: number;
  language?: QualityProfileLanguage | null;
};

export type QualityProfileLidarrReadarrResource = QualityProfileShared;

export type QualityProfilePayload =
  QualityProfileSonarrResource | QualityProfileRadarrWhisparrResource | QualityProfileLidarrReadarrResource;
