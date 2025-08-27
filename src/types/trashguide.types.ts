import { ArrType, ArrTypeConst, CFIDToConfigGroup, ImportCF } from "./common.types";

export type TrashQualityDefinitionQuality = {
  quality: string;
  title?: string;
  min: number;
  preferred: number;
  max: number;
};

export type TrashQualityDefinition = {
  trash_id: string;
  type: string;
  qualities: TrashQualityDefinitionQuality[];
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

export const TrashArrSupportedConst = ["RADARR", "SONARR"] as const satisfies readonly ArrType[];
export type TrashArrSupported = (typeof TrashArrSupportedConst)[number];

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
      series: TrashQualityDefinition;
      anime: TrashQualityDefinition;
    };
    naming: TrashSonarrNaming | null;
  };
  RADARR: {
    qualityProfiles: Map<string, TrashQP>;
    customFormats: CFIDToConfigGroup;
    customFormatsGroups: TrashCFGroupMapping;
    qualityDefinition: {
      movie: TrashQualityDefinition;
    };
    naming: TrashRadarrNaming | null;
  };
};

type TrashCFGItem = {
  name: string;
  trash_id: string;
  /**
   * Required CFs for the profile. Will be added
   */
  required: boolean;
  /**
   * Selection if should be added even if required is false
   */
  default?: boolean;
};

export type TrashCustomFormatGroups = {
  name: string;
  trash_id: string;
  trash_description?: string;
  /**
   * If this group should be added in always for TRaSH-Guide profiles
   * Should also be an boolean in theory but is an string in the guide
   */
  default?: string;
  custom_formats: TrashCFGItem[];
  quality_profiles?: {
    /**
     * Exclude profiles for which this group should not be applied if enabled in default.
     */
    exclude: Record<string, string>; // name to id like: "HD Bluray + WEB": "d1d67249d3890e49bc12e275d989a7e9"
  };
};

export type TrashCFGroupMapping = Map<string, TrashCustomFormatGroups>;
