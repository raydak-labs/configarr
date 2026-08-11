import { default as fs } from "node:fs";
import yaml from "yaml";
import { getConfig } from "./config";
import { logger } from "./logger";
import { MappedTemplates } from "./types/common.types";
import { RecyclarrArrSupported, RecyclarrTemplates } from "./types/recyclarr.types";
import { cloneGitRepo, recyclarrRepoPaths } from "./util";

const DEFAULT_RECYCLARR_GIT_URL = "https://github.com/recyclarr/config-templates";

/**
 * Last commit on recyclarr/config-templates that still ships the legacy
 * includes/ fragment layout Configarr loads. Upstream v8 (merged into master
 * on 2026-08-07) deleted those directories in favor of bundled starter templates.
 * See https://github.com/raydak-labs/configarr/issues/504
 */
export const DEFAULT_RECYCLARR_REVISION = "4ae377bb704fc7fd69a544ad04e91357e0b09f62";

export const resolveRecyclarrRevision = (recyclarrRevision?: string, recyclarrConfigUrl?: string): string => {
  if (recyclarrRevision) {
    return recyclarrRevision;
  }

  const gitUrl = recyclarrConfigUrl ?? DEFAULT_RECYCLARR_GIT_URL;
  // Custom forks may not contain the pinned SHA; keep branch tip for those.
  if (gitUrl !== DEFAULT_RECYCLARR_GIT_URL) {
    return "master";
  }

  return DEFAULT_RECYCLARR_REVISION;
};

export const cloneRecyclarrTemplateRepo = async () => {
  logger.info(`Checking Recyclarr repo ...`);

  const rootPath = recyclarrRepoPaths.root;
  const applicationConfig = getConfig();
  const gitUrl = applicationConfig.recyclarrConfigUrl ?? DEFAULT_RECYCLARR_GIT_URL;
  const revision = resolveRecyclarrRevision(applicationConfig.recyclarrRevision, applicationConfig.recyclarrConfigUrl);
  const sparseDisabled = applicationConfig.enableFullGitClone === true;

  if (!applicationConfig.recyclarrRevision && gitUrl === DEFAULT_RECYCLARR_GIT_URL) {
    logger.info(
      `Using pinned Recyclarr config-templates revision ${DEFAULT_RECYCLARR_REVISION} (legacy includes/). Override with recyclarrRevision if needed.`,
    );
  }

  const cloneResult = await cloneGitRepo(rootPath, gitUrl, revision, {
    disabled: sparseDisabled,
    sparseDirs: ["radarr/", "sonarr/"],
  });
  logger.info(`Recyclarr repo: ref[${cloneResult.ref}], hash[${cloneResult.hash}], path[${cloneResult.localPath}]`);
};

export const loadRecyclarrTemplates = (arrType: RecyclarrArrSupported): Map<string, MappedTemplates> => {
  const map = new Map<string, RecyclarrTemplates>();

  const fillMap = (path: string) => {
    const files = fs
      .readdirSync(`${path}`, { recursive: true, encoding: "utf8" })
      .filter((fn) => fn.endsWith("yaml") || fn.endsWith("yml"));

    // recyclarr config templates can have sub folders
    files.forEach((f) => {
      const filename = f.substring(f.lastIndexOf("/") + 1, f.lastIndexOf("."));
      map.set(filename, yaml.parse(fs.readFileSync(`${path}/${f}`, "utf8")));
    });
  };

  if (arrType === "RADARR") {
    fillMap(recyclarrRepoPaths.radarrCF);
    fillMap(recyclarrRepoPaths.radarrQD);
    fillMap(recyclarrRepoPaths.radarrQP);
  } else {
    fillMap(recyclarrRepoPaths.sonarrCF);
    fillMap(recyclarrRepoPaths.sonarrQD);
    fillMap(recyclarrRepoPaths.sonarrQP);
  }

  logger.debug(`Found ${map.size} Recyclarr templates.`);

  return new Map(
    Array.from(map, ([k, v]) => {
      const customFormats = v.custom_formats?.map((cf) => {
        // Changes from Recyclarr 7.2.0: https://github.com/recyclarr/recyclarr/releases/tag/v7.2.0
        if (cf.assign_scores_to == null && cf.quality_profiles == null) {
          logger.warn(`Recyclarr Template "${k}" does not provide correct profile for custom format. Ignoring.`);
        }

        if (cf.quality_profiles) {
          logger.warn(
            `Deprecated: (Recyclarr Template '${k}') For custom_formats please rename 'quality_profiles' to 'assign_scores_to'. See recyclarr v7.2.0`,
          );
        }
        return { ...cf, assign_scores_to: cf.assign_scores_to ?? cf.quality_profiles ?? [] };
      });

      return [
        k,
        {
          ...v,
          custom_formats: customFormats,
        },
      ];
    }),
  );
};
