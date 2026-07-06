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

// Keys audited directly against the real, currently-shipped TRaSH-Guides data (both
// custom-formats' trash_scores and quality-profiles' trash_score_set) - this list had
// drifted 8 keys behind what TRaSH-Guides actually ships, silently losing the intended
// score for any CF assigned via one of the missing score-sets (falls back to "default").
export const TrashScoresSchema = z.object({
  default: z.number().optional(),
  "anime-sonarr": z.number().optional(),
  "anime-radarr": z.number().optional(),
  "sqp-1-1080p": z.number().optional(),
  "sqp-1-2160p": z.number().optional(),
  "sqp-1-web-1080p": z.number().optional(),
  "sqp-1-web-2160p": z.number().optional(),
  "sqp-2": z.number().optional(),
  "sqp-3": z.number().optional(),
  "sqp-4": z.number().optional(),
  "sqp-4-ma-hybrid": z.number().optional(),
  "sqp-5": z.number().optional(),
  "french-vostfr": z.number().optional(),
  "french-multi-vf": z.number().optional(),
  "french-multi-vo": z.number().optional(),
  "french-anime-multi": z.number().optional(),
  "french-anime-vostfr": z.number().optional(),
  german: z.number().optional(),
  "german-anime": z.number().optional(),
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
  // Real TRaSH-Guide profile JSON commonly omits this (meaning "no score-set adjustment");
  // downstream code (trash-guide.ts's transformTrashQPToTemplate) already tolerates undefined here.
  // .keyof() derives from TrashScoresSchema instead of z.string() so this stays a single
  // source of truth with InputConfigQualityProfileSchema.score_set - both are ultimately
  // "one of TrashScores' known keys, or unset".
  trash_score_set: TrashScoresSchema.keyof().optional(),
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
export type TrashQP = z.infer<typeof TrashQPSchema>;

export const TrashArrSupportedConst = ["RADARR", "SONARR"] as const satisfies readonly ArrType[];
export type TrashArrSupported = (typeof TrashArrSupportedConst)[number];

export const TrashRadarrNamingSchema = z.object({
  folder: z.record(z.string(), z.string()),
  file: z.record(z.string(), z.string()),
});
export type TrashRadarrNaming = z.infer<typeof TrashRadarrNamingSchema>;

export const TrashSonarrNamingSchema = z.object({
  season: z.record(z.string(), z.string()),
  series: z.record(z.string(), z.string()),
  episodes: z.object({
    standard: z.record(z.string(), z.string()),
    daily: z.record(z.string(), z.string()),
    anime: z.record(z.string(), z.string()),
  }),
});
export type TrashSonarrNaming = z.infer<typeof TrashSonarrNamingSchema>;

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
  /**
   * Required CFs for the profile. Will be added
   */
  required: z.boolean(),
  /**
   * Selection if should be added even if required is false
   */
  default: z.union([z.boolean(), z.string()]).optional(),
});
export type TrashCFGItem = z.infer<typeof TrashCFGItemSchema>;

export const TrashCustomFormatGroupsSchema = z.object({
  name: z.string(),
  trash_id: z.string(),
  trash_description: z.string().optional(),
  /**
   * If this group should be added in always for TRaSH-Guide profiles
   * Should also be an boolean in theory but is an string in the guide
   */
  default: z.union([z.string(), z.boolean()]).optional(),
  custom_formats: z.array(TrashCFGItemSchema),
  quality_profiles: z
    .object({
      /**
       * @deprecated Use include instead. Kept for compatibility with old TRaSH-Guides versions.
       * Exclude profiles for which this group should not be applied if enabled in default.
       */
      exclude: z.record(z.string(), z.string()).optional(), // name to id like: "HD Bluray + WEB": "d1d67249d3890e49bc12e275d989a7e9"
      /**
       * Profiles for which this group should be applied.
       * Only profiles listed here will receive the CFs from this group.
       */
      include: z.record(z.string(), z.string()).optional(), // name to id like: "HD Bluray + WEB": "d1d67249d3890e49bc12e275d989a7e9"
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
