import { z } from "zod";
import { ArrType, ArrTypeConst, CFIDToConfigGroup, ImportCF } from "./common.types";

// --- Schemas ---

export const TrashQualityDefinitionQualitySchema = z.object({
  quality: z.string(),
  title: z.string().optional(),
  min: z.number(),
  preferred: z.number(),
  max: z.number(),
});
export type TrashQualityDefinitionQuality = z.infer<typeof TrashQualityDefinitionQualitySchema>;

export const TrashQualityDefinitionSchema = z.object({
  trash_id: z.string(),
  type: z.string(),
  qualities: z.array(TrashQualityDefinitionQualitySchema).min(1),
});
export type TrashQualityDefinition = z.infer<typeof TrashQualityDefinitionSchema>;

export const TrashScoresSchema = z.object({
  default: z.number().optional(),
  "anime-sonarr": z.number().optional(),
  "anime-radarr": z.number().optional(),
  "sqp-1-1080p": z.number().optional(),
  "sqp-1-2160p": z.number().optional(),
  "sqp-2": z.number().optional(),
  "sqp-3": z.number().optional(),
  "sqp-4": z.number().optional(),
  "sqp-5": z.number().optional(),
  "french-vostfr": z.number().optional(),
  german: z.number().optional(),
});
export type TrashScores = z.infer<typeof TrashScoresSchema>;

export const TrashCFMetaSchema = z.object({
  trash_id: z.string(),
  trash_scores: TrashScoresSchema.optional(),
  trash_regex: z.string().optional(),
  trash_description: z.string().optional(),
});
export type TrashCFMeta = z.infer<typeof TrashCFMetaSchema>;

export type TrashCF = TrashCFMeta & ImportCF;

export const TrashCFSchema: z.ZodType<TrashCF> = z
  .any()
  .refine((v) => v != null && typeof v === "object" && typeof v.trash_id === "string" && typeof v.name === "string", {
    message: "TrashCF must be an object with 'trash_id' and 'name' string fields",
  });

export const TrashCFSpFSchema = z.object({
  min: z.number(),
  max: z.number(),
  exceptLanguage: z.boolean(),
  value: z.any(),
});
export type TrashCFSpF = z.infer<typeof TrashCFSpFSchema>;

export const TrashQPSchema = z.object({
  trash_id: z.string(),
  name: z.string(),
  trash_score_set: z.string(),
  language: z.string().optional(),
  upgradeAllowed: z.boolean(),
  cutoff: z.string(),
  minFormatScore: z.number(),
  cutoffFormatScore: z.number(),
  items: z.array(
    z.object({
      name: z.string(),
      allowed: z.boolean(),
      items: z.array(z.string()).optional(),
    }),
  ),
  formatItems: z.record(z.string(), z.string()),
});

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
    conflicts: TrashCFConflict[];
  };
  RADARR: {
    qualityProfiles: Map<string, TrashQP>;
    customFormats: CFIDToConfigGroup;
    customFormatsGroups: TrashCFGroupMapping;
    qualityDefinition: {
      movie: TrashQualityDefinition;
    };
    naming: TrashRadarrNaming | null;
    conflicts: TrashCFConflict[];
  };
};

export const TrashCFGItemSchema = z.object({
  name: z.string(),
  trash_id: z.string(),
  required: z.boolean(),
  default: z.boolean().optional(),
});

export const TrashCustomFormatGroupsSchema = z.object({
  name: z.string(),
  trash_id: z.string(),
  trash_description: z.string().optional(),
  default: z.string().optional(),
  custom_formats: z.array(TrashCFGItemSchema),
  quality_profiles: z
    .object({
      exclude: z.record(z.string(), z.string()).optional(),
      include: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});
export type TrashCustomFormatGroups = z.infer<typeof TrashCustomFormatGroupsSchema>;

export type TrashCFGroupMapping = Map<string, TrashCustomFormatGroups>;

export type TrashCFConflict = {
  trash_id: string;
  name: string;
  trash_description?: string;
  custom_formats: Array<{
    trash_id: string;
    name: string;
  }>;
};
