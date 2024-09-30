import path from "path";
import { CustomFormatResource } from "./__generated__/generated-sonarr-api";
import { logger } from "./logger";
import { ConfigarrCF, ImportCF, TrashCF, UserFriendlyField } from "./types";

export const IS_DRY_RUN = process.env.DRY_RUN === "true";
export const IS_LOCAL_SAMPLE_MODE = process.env.LOAD_LOCAL_SAMPLES === "true";
export const DEBUG_CREATE_FILES = process.env.DEBUG_CREATE_FILES === "true";

export const repoPath = path.resolve(process.env.CUSTOM_REPO_ROOT || "./repos");

const recyclarrConfigPath = `${repoPath}/recyclarr-config`;
const recyclarrSonarrRoot = `${recyclarrConfigPath}/sonarr`;
const recyclarrSonarrCFs = `${recyclarrSonarrRoot}/includes/custom-formats`;
const recyclarrSonarrQDs = `${recyclarrSonarrRoot}/includes/quality-definitions`;
const recyclarrSonarrQPs = `${recyclarrSonarrRoot}/includes/quality-profiles`;

const recyclarrRadarrRoot = `${recyclarrConfigPath}/radarr`;
const recyclarrRadarrCFs = `${recyclarrRadarrRoot}/includes/custom-formats`;
const recyclarrRadarrQDs = `${recyclarrRadarrRoot}/includes/quality-definitions`;
const recyclarrRadarrQPs = `${recyclarrRadarrRoot}/includes/quality-profiles`;

const trashRepoPath = "docs/json";
const trashRepoRoot = `${repoPath}/trash-guides`;
const trashRepoSonarrRoot = `${trashRepoRoot}/${trashRepoPath}/sonarr`;
const trashRepoRadarrRoot = `${trashRepoRoot}/${trashRepoPath}/radarr`;

export const trashRepoPaths = {
  root: trashRepoRoot,
  sonarrCF: `${trashRepoSonarrRoot}/cf`,
  sonarrQuality: `${trashRepoSonarrRoot}/quality-size`,
  sonarrNaming: `${trashRepoSonarrRoot}/naming`,
  radarrCF: `${trashRepoRadarrRoot}/cf`,
  radarrQuality: `${trashRepoRadarrRoot}/quality-size`,
  radarrNaming: `${trashRepoRadarrRoot}/naming`,
};

export const recyclarrRepoPaths = {
  root: recyclarrConfigPath,
  sonarrCF: `${recyclarrSonarrCFs}`,
  sonarrQD: `${recyclarrSonarrQDs}`,
  sonarrQP: `${recyclarrSonarrQPs}`,
  radarrCF: `${recyclarrRadarrCFs}`,
  radarrQD: `${recyclarrRadarrQDs}`,
  radarrQP: `${recyclarrRadarrQPs}`,
};

export const trashToCarrCF = ({ trash_id, trash_regex, trash_scores, ...rest }: TrashCF): ConfigarrCF => {
  return {
    ...rest,
    configarr_id: trash_id,
    configarr_scores: trash_scores,
  };
};

export const toCarrCF = (input: TrashCF | ConfigarrCF): ConfigarrCF => {
  if ("configarr_id" in input) {
    return input;
  }

  return trashToCarrCF(input);
};

export const mapImportCfToRequestCf = (cf: TrashCF | ConfigarrCF): CustomFormatResource => {
  let customId;
  let rest: ImportCF;

  if ("trash_id" in cf) {
    customId = cf.trash_id;
    const { trash_id, trash_scores, ...restCf } = cf;
    rest = restCf;
  } else {
    customId = cf.configarr_id;
    const { configarr_id, configarr_scores, ...restCf } = cf;
    rest = restCf;
  }

  if (!rest.specifications) {
    logger.info(`ImportCF is wrong ${customId}, ${cf.name}.`);
    throw new Error("ImportCF wrong");
  }

  const specs = rest.specifications.map((spec) => {
    const newFields: UserFriendlyField[] = [];

    if (!spec.fields) {
      logger.info(`Spec: ${spec.name} fields is not defined`);
      throw new Error(`Spec is not correctly defined: ${spec.name}`);
    }

    switch (spec.implementation) {
      case "SizeSpecification":
        newFields.push({
          name: "min",
          value: spec.fields.min,
        });
        newFields.push({
          name: "max",
          value: spec.fields.max,
        });
        break;
      case "ReleaseTitleSpecification":
      case "LanguageSpecification":
      default:
        newFields.push({
          value: spec.fields.value,
        });
        break;
    }

    return {
      ...spec,
      fields: newFields.map((f) => {
        if (f.name) {
          return f;
        }

        return { ...f, name: "value" };
      }),
    };
  });

  return { ...rest, specifications: specs };
};

export function compareObjectsCarr(serverObject: any, localObject: any): { equal: boolean; changes: string[] } {
  const changes: string[] = [];

  for (const key in localObject) {
    if (Object.prototype.hasOwnProperty.call(localObject, key)) {
      if (Object.prototype.hasOwnProperty.call(serverObject, key)) {
        const serverProperty = serverObject[key];
        let localProperty = localObject[key];

        // Todo remove should be already handled
        if (key === "fields") {
          if (!Array.isArray(localProperty)) {
            localProperty = [localProperty];
          }
        }

        if (Array.isArray(serverProperty)) {
          if (!Array.isArray(localProperty)) {
            changes.push(`Expected array for key ${key} in localProperty`);
            continue;
          }

          if (serverProperty.length < localProperty.length) {
            // Only if server does provide less props as we have -> assume change required.
            // For example if radarr introduces new fields for custom formats and we do not have them included this would result in always changed results.
            changes.push(
              `Array length mismatch for key ${key}: serverProperty length ${serverProperty.length}, localProperty length ${localProperty.length}`,
            );
            continue;
          }

          for (let i = 0; i < serverProperty.length; i++) {
            const { equal: isEqual, changes: subChanges } = compareObjectsCarr(serverProperty[i], localProperty[i]);
            // changes.push(
            //   ...subChanges.map((subChange) => `${key}[${i}].${subChange}`)
            // );

            if (subChanges.length > 0) {
              changes.push(`${key}[${i}].${subChanges[0]}`);
            }

            if (!isEqual && changes.length <= 0) {
              changes.push(`Mismatch found in array element at index ${i} for key '${key}'`);
            }
          }
        } else if (typeof localProperty === "object" && localProperty !== null) {
          if (typeof serverProperty !== "object" || serverProperty === null) {
            changes.push(`Expected object for key '${key}' in serverProperty`);
            continue;
          }

          const { equal: isEqual, changes: subChanges } = compareObjectsCarr(serverProperty, localProperty);
          changes.push(...subChanges.map((subChange) => `${key}.${subChange}`));
          if (!isEqual) {
            changes.push(`Mismatch found for key '${key}'`);
          }
        } else {
          if (serverProperty !== localProperty) {
            changes.push(`Mismatch found for key '${key}': server value '${serverProperty}', value to set '${localProperty}'`);
          }
        }
      } else {
        logger.debug(`Ignore unknown key '${key}' for comparison.`);
      }
    }
  }

  const equal = changes.length === 0;
  return { equal, changes };
}

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  if (value === null || value === undefined) return false;
  const testDummy: TValue = value;
  return true;
}

export const cloneWithJSON = <T>(input: T): T => {
  return JSON.parse(JSON.stringify(input));
};

export const ROOT_PATH = path.resolve(process.cwd());
