import path from "path";
import { CustomFormatResource } from "./__generated__/generated-sonarr-api";
import { ConfigarrCF, ImportCF, TrashCF, UserFriendlyField } from "./types";

export const IS_DRY_RUN = process.env.DRY_RUN === "true";
export const IS_LOCAL_SAMPLE_MODE = process.env.LOAD_LOCAL_SAMPLES === "true";

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
    console.log(`ImportCF is wrong ${customId}, ${cf.name}.`);
    throw new Error("ImportCF wrong");
  }

  const specs = rest.specifications.map((spec) => {
    const newFields: UserFriendlyField[] = [];

    if (!spec.fields) {
      console.log(`Spec: ${spec.name} fields is not defined`);
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

export function compareObjectsCarr(object1: any, object2: any): { equal: boolean; changes: string[] } {
  const changes: string[] = [];

  for (const key in object2) {
    if (Object.prototype.hasOwnProperty.call(object2, key)) {
      if (object1.hasOwnProperty(key)) {
        const value1 = object1[key];
        let value2 = object2[key];

        // Todo remove should be already handled
        if (key === "fields") {
          if (!Array.isArray(value2)) {
            value2 = [value2];
          }
        }

        if (Array.isArray(value1)) {
          if (!Array.isArray(value2)) {
            changes.push(`Expected array for key ${key} in object2`);
            continue;
          }

          if (value1.length !== value2.length) {
            changes.push(`Array length mismatch for key ${key}: object1 length ${value1.length}, object2 length ${value2.length}`);
            continue;
          }

          for (let i = 0; i < value1.length; i++) {
            const { equal: isEqual, changes: subChanges } = compareObjectsCarr(value1[i], value2[i]);
            // changes.push(
            //   ...subChanges.map((subChange) => `${key}[${i}].${subChange}`)
            // );

            if (subChanges.length > 0) {
              changes.push(`${key}[${i}].${subChanges[0]}`);
            }

            if (!isEqual && changes.length <= 0) {
              changes.push(`Mismatch found in array element at index ${i} for key ${key}`);
            }
          }
        } else if (typeof value2 === "object" && value2 !== null) {
          if (typeof value1 !== "object" || value1 === null) {
            changes.push(`Expected object for key ${key} in object1`);
            continue;
          }

          const { equal: isEqual, changes: subChanges } = compareObjectsCarr(value1, value2);
          changes.push(...subChanges.map((subChange) => `${key}.${subChange}`));
          if (!isEqual) {
            changes.push(`Mismatch found for key ${key}`);
          }
        } else {
          if (value1 !== value2) {
            changes.push(`Mismatch found for key ${key}: server value ${value1}, value to set ${value2}`);
          }
        }
      } else {
        console.log(`Ignore unknown key for comparison.`);
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

export const ROOT_PATH = path.resolve(process.cwd());
