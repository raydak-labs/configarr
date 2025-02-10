import { ArrType, CFIDToConfigGroup, ImportCF } from "./common.types";

export type TrashQualityDefintionQuality = {
  quality: string;
  title?: string;
  min: number;
  preferred: number;
  max: number;
};

export type TrashQualityDefintion = {
  trash_id: string;
  type: string;
  qualities: TrashQualityDefintionQuality[];
};

export type TrashScores = {
  default?: number;
  "anime-sonarr"?: number;
  "anime-radarr"?: number;
  "sqp-1-1080p"?: number;
  "sqp-1-2160p"?: number;
  "sqp-2"?: number;
  "sqp-3"?: number;
  "sqp-4"?: number;
  "sqp-5"?: number;
  "french-vostfr"?: number;
  german?: number;
};

export type TrashCFMeta = {
  trash_id: string;
  trash_scores?: TrashScores;
  trash_regex?: string;
  trash_description?: string;
};

export type TrashCF = TrashCFMeta & ImportCF;

type TrashQPItem = {
  name: string;
  allowed: boolean;
  items?: string[];
};

export type TrashQP = {
  trash_id: string;
  name: string;
  trash_score_set: keyof Required<TrashScores>;
  language?: string;
  upgradeAllowed: boolean;
  cutoff: string;
  minFormatScore: number;
  cutoffFormatScore: number;
  items: TrashQPItem[];
  formatItems: {
    [key: string]: string;
  };
};

export type TrashCFSpF = { min: number; max: number; exceptLanguage: boolean; value: any };

export type TrashArrSupported = Subset<ArrType, "RADARR" | "SONARR">;

export type TrashRadarrNaming = {
  folder: {
    [key: string]: string;
  };
  file: {
    [key: string]: string;
  };
};

export type TrashSonarrNaming = {
  season: {
    [key: string]: string;
  };
  series: {
    [key: string]: string;
  };
  episodes: {
    standard: {
      [key: string]: string;
    };

    daily: {
      [key: string]: string;
    };

    anime: {
      [key: string]: string;
    };
  };
};

export type TrashCache = {
  SONARR: {
    qualityProfiles: Map<string, TrashQP>;
    customFormats: CFIDToConfigGroup;
    customFormatsGroups: TrashCFGroupMapping;
    qualityDefinition: {
      series: TrashQualityDefintion;
      anime: TrashQualityDefintion;
    };
    naming: TrashSonarrNaming | null;
  };
  RADARR: {
    qualityProfiles: Map<string, TrashQP>;
    customFormats: CFIDToConfigGroup;
    customFormatsGroups: TrashCFGroupMapping;
    qualityDefinition: {
      movie: TrashQualityDefintion;
    };
    naming: TrashRadarrNaming | null;
  };
};

type TrashCFGItem = {
  name: string;
  trash_id: string;
  required: boolean;
};

export type TrashCustomFormatGroups = {
  name: string;
  trash_id: string;
  custom_formats: TrashCFGItem[];
  quality_profiles?: {
    exclude: Record<string, string>;
  };
};

export type TrashCFGroupMapping = Map<string, TrashCustomFormatGroups>;
