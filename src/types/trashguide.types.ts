import { ImportCF } from "./common.types";

export type TrashQualityDefintionQuality = {
  quality: string;
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
  trash_score_set: keyof TrashCF["trash_scores"];
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
