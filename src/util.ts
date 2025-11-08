import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import simpleGit, { CheckRepoActions } from "simple-git";
import { MergedCustomFormatResource } from "./__generated__/mergedTypes";
import { getHelpers } from "./env";
import { logger } from "./logger";
import { ConfigarrCF, ImportCF, UserFriendlyField } from "./types/common.types";
import { TrashCF } from "./types/trashguide.types";

const recyclarrConfigPath = `${getHelpers().repoPath}/recyclarr-config`;
const recyclarrSonarrRoot = `${recyclarrConfigPath}/sonarr`;
const recyclarrSonarrCFs = `${recyclarrSonarrRoot}/includes/custom-formats`;
const recyclarrSonarrQDs = `${recyclarrSonarrRoot}/includes/quality-definitions`;
const recyclarrSonarrQPs = `${recyclarrSonarrRoot}/includes/quality-profiles`;

const recyclarrRadarrRoot = `${recyclarrConfigPath}/radarr`;
const recyclarrRadarrCFs = `${recyclarrRadarrRoot}/includes/custom-formats`;
const recyclarrRadarrQDs = `${recyclarrRadarrRoot}/includes/quality-definitions`;
const recyclarrRadarrQPs = `${recyclarrRadarrRoot}/includes/quality-profiles`;

const trashRepoRoot = `${getHelpers().repoPath}/trash-guides`;
const trashRepoPath = "docs/json";
const trashRepoSonarrRoot = `${trashRepoRoot}/${trashRepoPath}/sonarr`;
const trashRepoRadarrRoot = `${trashRepoRoot}/${trashRepoPath}/radarr`;

export const trashRepoPaths = {
  root: trashRepoRoot,
  sonarrCF: `${trashRepoSonarrRoot}/cf`,
  sonarrCFGroups: `${trashRepoSonarrRoot}/cf-groups`,
  sonarrQualitySize: `${trashRepoSonarrRoot}/quality-size`,
  sonarrQP: `${trashRepoSonarrRoot}/quality-profiles`,
  sonarrNaming: `${trashRepoSonarrRoot}/naming`,
  radarrCF: `${trashRepoRadarrRoot}/cf`,
  radarrCFGroups: `${trashRepoRadarrRoot}/cf-groups`,
  radarrQualitySize: `${trashRepoRadarrRoot}/quality-size`,
  radarrQP: `${trashRepoRadarrRoot}/quality-profiles`,
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

export const mapImportCfToRequestCf = (cf: TrashCF | ConfigarrCF): MergedCustomFormatResource => {
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

    // 2024-09-30: Test if this handles all cases
    newFields.push(...Object.entries(spec.fields).map(([key, value]) => ({ name: key, value })));

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

export function compareCustomFormats(
  serverObject: MergedCustomFormatResource,
  localObject: MergedCustomFormatResource,
): ReturnType<typeof compareObjectsCarr> {
  return compareObjectsCarr(serverObject, localObject);
}

export function compareNaming(serverObject: any, localObject: any): ReturnType<typeof compareObjectsCarr> {
  return compareObjectsCarr(serverObject, localObject);
}

export function compareMediamanagement(serverObject: any, localObject: any): ReturnType<typeof compareObjectsCarr> {
  return compareObjectsCarr(serverObject, localObject);
}

export function compareObjectsCarr(serverObject: any, localObject: any, parent?: string): { equal: boolean; changes: string[] } {
  const changes: string[] = [];

  for (const key in localObject) {
    if (Object.prototype.hasOwnProperty.call(localObject, key)) {
      if (Object.prototype.hasOwnProperty.call(serverObject, key)) {
        const serverProperty = serverObject[key];
        let localProperty = localObject[key];

        if (Array.isArray(serverProperty)) {
          if (!Array.isArray(localProperty)) {
            changes.push(`Expected array for key ${key} in localProperty`);
            continue;
          }

          let arrayLengthMismatch = false;

          if (key === "fields") {
            // Only if server does provide less props as we have -> assume change required.
            // For example if radarr introduces new fields for custom formats and we do not have them included this would result in always changed results.
            arrayLengthMismatch = serverProperty.length < localProperty.length;
          } else if (serverProperty.length != localProperty.length) {
            arrayLengthMismatch = true;
          }

          if (arrayLengthMismatch) {
            changes.push(
              `Array length mismatch for key ${key} (parent: ${parent}): serverProperty length ${serverProperty.length}, localProperty length ${localProperty.length}`,
            );
            continue;
          }

          for (let i = 0; i < serverProperty.length; i++) {
            const { equal: isEqual, changes: subChanges } = compareObjectsCarr(serverProperty[i], localProperty[i], key);
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

          const { equal: isEqual, changes: subChanges } = compareObjectsCarr(serverProperty, localProperty, key);
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

export const loadJsonFile = <T = object>(filePath: string) => {
  const file = readFileSync(filePath, { encoding: "utf-8" });
  return JSON.parse(file) as T;
};

export function zip<T extends unknown[][]>(...arrays: T): Array<{ [K in keyof T]: T[K] extends (infer U)[] ? U : never }> {
  let length = -1;
  let mismatch = false;

  for (const arrayElement of arrays) {
    if (length <= 0) {
      length = arrayElement.length;
    } else {
      mismatch = length !== arrayElement.length;
    }
  }

  if (mismatch) {
    throw new Error("Zip error with not equal lengths");
  }

  const result = [];

  for (let i = 0; i < length; i++) {
    result.push(arrays.map((arr) => arr[i]));
  }

  return result as Array<{ [K in keyof T]: T[K] extends (infer U)[] ? U : never }>;
}

export function zipNLength<T extends unknown[][]>(...arrays: T): Array<{ [K in keyof T]: T[K] extends (infer U)[] ? U : never }> {
  const minLength = Math.min(...arrays.map((arr) => arr.length));
  const result = [];

  for (let i = 0; i < minLength; i++) {
    result.push(arrays.map((arr) => arr[i]));
  }

  return result as Array<{ [K in keyof T]: T[K] extends (infer U)[] ? U : never }>;
}

export const cloneGitRepo = async (
  localPath: string,
  gitUrl: string,
  revision: string,
  cloneConf: {
    disabled: boolean;
    sparseDirs?: string[];
  },
) => {
  const rootPath = localPath;

  if (!existsSync(rootPath)) {
    mkdirSync(rootPath, { recursive: true });
  }

  const gitClient = simpleGit({ baseDir: rootPath });
  const r = await gitClient.checkIsRepo(CheckRepoActions.IS_REPO_ROOT);

  if (!r) {
    let sparseEnabled = false;

    if (!cloneConf.disabled && cloneConf.sparseDirs && cloneConf.sparseDirs.length > 0) {
      sparseEnabled = true;
    }

    await simpleGit().clone(gitUrl, rootPath, ["--filter=blob:none", (sparseEnabled && "--sparse") || ""]);

    if (sparseEnabled) {
      await gitClient.raw(["sparse-checkout", "set", ...cloneConf.sparseDirs!]);
    }
    logger.info(`Freshly cloned repository: '${gitUrl}' at '${revision}'`);
  }

  await gitClient.checkout(revision, ["-f"]);
  const result = await gitClient.status();

  let updated = false;

  if (!result.detached) {
    const res = await gitClient.pull();
    if (res.files.length > 0) {
      updated = true;
      logger.info(`Repository updated to new commit: '${gitUrl}' at '${revision}'`);
    }
  }

  let hash: string = "unknown";

  try {
    hash = await gitClient.revparse(["--verify", "HEAD"]);
  } catch (err: unknown) {
    // Ignore
    logger.debug(`Unable to extract hash from commit`);
  }

  return {
    ref: result.current,
    hash: hash,
    localPath: localPath,
    updated,
  };
};

export const roundToDecimal = (num: number, decimalPlaces = 0) => {
  const p = Math.pow(10, decimalPlaces);
  return Math.round((num + Number.EPSILON) * p) / p;
};

export function pickFromConst<T extends readonly string[], K extends T[number]>(constArray: T, keys: readonly K[]): readonly K[] {
  return keys.filter((key): key is K => constArray.includes(key));
}

export function isInConstArray<T extends readonly unknown[]>(array: T, value: unknown): value is T[number] {
  return array.includes(value as T[number]);
}
