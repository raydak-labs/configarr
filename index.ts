import "dotenv/config";

import { readFileSync, readdirSync } from "fs";
import path from "path";
import simpleGit from "simple-git";
import { parse } from "yaml";
import {
  Api,
  CustomFormatResource,
  CustomFormatSpecificationSchema,
  Field,
  PrivacyLevel,
  QualityProfileResource,
} from "./src/__generated__/MySuperbApi";

const api = new Api({
  //   headers: {
  //     "X-Api-Key": process.env.SONARR_API_KEY!,
  //   },
  // url: process.env.SONARR_URL!,
  // baseURL: process.env.SONARR_URL!,
  baseUrl: process.env.SONARR_URL!,
  baseApiParams: {
    headers: {
      "X-Api-Key": process.env.SONARR_API_KEY!,
    },
  },
});

type DynamicImportType<T> = { default: T };

/** Used in the UI of Sonarr/Radarr to import. Trash JSON are based on that so users can copy&paste stuff */
type UserFriendlyField = {
  name?: string | null;
  value?: any;
} & Pick<CustomFormatSpecificationSchema, "negate" | "required">;

type TrashCFSpF = { min: number; max: number };

type TC1 = Omit<CustomFormatSpecificationSchema, "fields"> & {
  implementation: "ReleaseTitleSpecification" | "LanguageSpecification";
  fields?: UserFriendlyField | null;
};

type TC2 = Omit<CustomFormatSpecificationSchema, "fields"> & {
  implementation: "SizeSpecification";
  fields?: TrashCFSpF;
};

type TCM = TC1 | TC2;

type TrashCFResource = Omit<CustomFormatResource, "specifications"> & {
  specifications?: TCM[] | null;
};

type TrashCF = {
  trash_id: string;
  trash_scores?: {
    default: number;
  };
  trash_regex?: string;
} & TrashCFResource;

type ConfigarrCF = {
  configarr_id: string;
  configarr_scores?: {
    default: number;
  };
} & TrashCFResource;

type CFProcessing = {
  carrIdMapping: Map<
    string,
    {
      carrConfig: ConfigarrCF;
      requestConfig: CustomFormatResource;
    }
  >;
  cfNameToCarrConfig: Map<string, ConfigarrCF>;
};

type YamlList = {
  trash_ids?: string[];
  quality_profiles: { name: string }[];
};

type YamlInput = {
  custom_formats: YamlList[];
};

const trashToCarrCF = ({
  trash_id,
  trash_regex,
  trash_scores,
  ...rest
}: TrashCF): ConfigarrCF => {
  return {
    ...rest,
    configarr_id: trash_id,
    configarr_scores: trash_scores,
  };
};

const toCarrCF = (input: TrashCF | ConfigarrCF): ConfigarrCF => {
  if ("configarr_id" in input) {
    return input;
  }

  return trashToCarrCF(input);
};

const trashCfToValidCf = (trashCf: TrashCF): CustomFormatResource => {
  const { trash_id, trash_regex, trash_scores, ...rest } = trashCf;

  if (!rest.specifications) {
    console.log(`TrashCF is wrong ${trash_id}, ${rest.name}.`);
    throw new Error("TrashCF wrong");
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

const carrCfToValidCf = (cf: ConfigarrCF): CustomFormatResource => {
  const { configarr_id, configarr_scores, ...rest } = cf;

  if (!rest.specifications) {
    console.log(`ConfigarrCF is wrong ${configarr_id}, ${rest.name}.`);
    throw new Error("ConfigarrCF wrong");
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

const ROOT_PATH = path.resolve(process.cwd());

// const getObjectDiff = (obj1, obj2, compareRef = false) => {
//   return Object.keys(obj1).reduce((result, key) => {
//     if (!obj2.hasOwnProperty(key)) {
//       result.push(key);
//     } else if (_.isEqual(obj1[key], obj2[key])) {
//       const resultKeyIndex = result.indexOf(key);

//       if (compareRef && obj1[key] !== obj2[key]) {
//         result[resultKeyIndex] = `${key} (ref)`;
//       } else {
//         result.splice(resultKeyIndex, 1);
//       }
//     }
//     return result;
//   }, Object.keys(obj2));
// };

function differenceInObj(firstObj: any, secondObj: any): any {
  let differenceObj: any = {};
  for (const key in firstObj) {
    if (Object.prototype.hasOwnProperty.call(firstObj, key)) {
      if (firstObj[key] !== secondObj[key]) {
        differenceObj[key] = firstObj[key];
      }
    }
  }

  return differenceObj;
}

const testGo = async () => {
  const object2: TrashCF = {
    trash_id: "eb3d5cc0a2be0db205fb823640db6a3c",
    trash_scores: {
      default: 6,
    },
    name: "Repack v2",
    includeCustomFormatWhenRenaming: false,
    specifications: [
      {
        name: "Repack v2",
        implementation: "ReleaseTitleSpecification",
        negate: false,
        required: false,
        fields: {
          value: "\\b(repack2)\\b",
        },
      },
      {
        name: "Proper v2",
        implementation: "ReleaseTitleSpecification",
        negate: false,
        required: false,
        fields: {
          value: "\\b(proper2)\\b",
        },
      },
    ],
  };

  const object1 = {
    id: 7,
    name: "Repack v2",
    includeCustomFormatWhenRenaming: false,
    specifications: [
      {
        name: "Repack v2",
        implementation: "ReleaseTitleSpecification",
        implementationName: "Release Title",
        infoLink: "https://wiki.servarr.com/sonarr/settings#custom-formats-2",
        negate: false,
        required: false,
        fields: [
          {
            order: 0,
            name: "value",
            label: "Regular Expression",
            helpText: "Custom Format RegEx is Case Insensitive",
            value: "\\b(repack2)\\b",
            type: "textbox",
            advanced: false,
            privacy: PrivacyLevel.Normal,
            isFloat: false,
          },
        ],
      },
      {
        name: "Proper v2",
        implementation: "ReleaseTitleSpecification",
        implementationName: "Release Title",
        infoLink: "https://wiki.servarr.com/sonarr/settings#custom-formats-2",
        negate: false,
        required: false,
        fields: [
          {
            order: 0,
            name: "value",
            label: "Regular Expression",
            helpText: "Custom Format RegEx is Case Insensitive",
            value: "\\b(proper2)\\b",
            type: "textbox",
            advanced: false,
            privacy: PrivacyLevel.Normal,
            isFloat: false,
          },
        ],
      },
    ],
  };

  console.log(differenceInObj(object2, object1));

  console.log(compareObjects2(object1, object2)); // Output: true
};

function compareObjects(
  fullObject: CustomFormatResource,
  partialObject: Partial<TrashCFResource>
): boolean {
  if (!partialObject.name || !partialObject.specifications) {
    return false;
  }

  if (
    fullObject.name !== partialObject.name ||
    fullObject.includeCustomFormatWhenRenaming !==
      partialObject.includeCustomFormatWhenRenaming
  ) {
    return false;
  }

  if (!fullObject.specifications || !partialObject.specifications) {
    // TODO not sure
    return false;
  }

  if (
    fullObject.specifications &&
    fullObject.specifications.length !== partialObject.specifications.length
  ) {
    return false;
  }

  for (let i = 0; i < fullObject.specifications.length; i++) {
    const fullSpec = fullObject.specifications[i];
    const partialSpec = partialObject.specifications.find(
      (spec) => spec.name === fullSpec.name
    );

    if (!partialSpec) {
      return false;
    }

    if (!fullSpec.fields || !partialSpec.fields) {
      // TODO not sure
      return false;
    }

    if (
      typeof fullSpec.fields === "object" &&
      !Array.isArray(fullSpec.fields)
    ) {
      // Assume single object as array with single element
      if (
        !Array.isArray(partialSpec.fields) ||
        partialSpec.fields.length !== 1
      ) {
        return false;
      }

      const fullFieldValue = (fullSpec.fields as { value: string }).value;
      const partialFieldValue = (partialSpec.fields[0] as Field).value;

      if (fullFieldValue !== partialFieldValue) {
        return false;
      }
    } else {
      if (
        !Array.isArray(fullSpec.fields) ||
        !Array.isArray(partialSpec.fields) ||
        fullSpec.fields.length !== partialSpec.fields.length
      ) {
        return false;
      }

      for (let j = 0; j < fullSpec.fields.length; j++) {
        const fullField = fullSpec.fields[j];
        const partialField = partialSpec.fields.find(
          (field) => field.name === fullField.name
        );

        if (!partialField || partialField.value !== fullField.value) {
          return false;
        }
      }
    }
  }

  return true;
}

function compareObjects2(
  object1: CustomFormatResource,
  object2: Partial<TrashCF>
): { equal: boolean; changes: string[] } {
  const changes: string[] = [];

  for (const key in object2) {
    if (Object.prototype.hasOwnProperty.call(object2, key)) {
      if (object1.hasOwnProperty(key)) {
        const value1 = object1[key];
        let value2 = object2[key];

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
            changes.push(
              `Array length mismatch for key ${key}: object1 length ${value1.length}, object2 length ${value2.length}`
            );
            continue;
          }

          for (let i = 0; i < value1.length; i++) {
            const { equal: isEqual, changes: subChanges } = compareObjects2(
              value1[i],
              value2[i]
            );
            // changes.push(
            //   ...subChanges.map((subChange) => `${key}[${i}].${subChange}`)
            // );

            if (subChanges.length > 0) {
              changes.push(`${key}[${i}].${subChanges[0]}`);
            }

            if (!isEqual && changes.length <= 0) {
              changes.push(
                `Mismatch found in array element at index ${i} for key ${key}`
              );
            }
          }
        } else if (typeof value1 === "object" && value1 !== null) {
          if (typeof value2 !== "object" || value2 === null) {
            changes.push(`Expected object for key ${key} in object2`);
            continue;
          }

          const { equal: isEqual, changes: subChanges } = compareObjects2(
            value1,
            value2
          );
          changes.push(...subChanges.map((subChange) => `${key}.${subChange}`));
          if (!isEqual) {
            changes.push(`Mismatch found for key ${key}`);
          }
        } else {
          if (value1 !== value2) {
            changes.push(
              `Mismatch found for key ${key}: server value ${value1}, value to set ${value2}`
            );
          }
        }
      } else {
      }
    }
  }

  const equal = changes.length === 0;
  return { equal, changes };
}

function compareObjects3(
  object1: CustomFormatResource,
  trashCf: TrashCF
): { equal: boolean; changes: string[] } {
  const changes: string[] = [];

  const object2 = trashCfToValidCf(trashCf);

  for (const key in object2) {
    if (Object.prototype.hasOwnProperty.call(object2, key)) {
      if (object1.hasOwnProperty(key)) {
        const value1 = object1[key];
        let value2 = object2[key];

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
            changes.push(
              `Array length mismatch for key ${key}: object1 length ${value1.length}, object2 length ${value2.length}`
            );
            continue;
          }

          for (let i = 0; i < value1.length; i++) {
            const { equal: isEqual, changes: subChanges } = compareObjects2(
              value1[i],
              value2[i]
            );
            // changes.push(
            //   ...subChanges.map((subChange) => `${key}[${i}].${subChange}`)
            // );

            if (subChanges.length > 0) {
              changes.push(`${key}[${i}].${subChanges[0]}`);
            }

            if (!isEqual && changes.length <= 0) {
              changes.push(
                `Mismatch found in array element at index ${i} for key ${key}`
              );
            }
          }
        } else if (typeof value1 === "object" && value1 !== null) {
          if (typeof value2 !== "object" || value2 === null) {
            changes.push(`Expected object for key ${key} in object2`);
            continue;
          }

          const { equal: isEqual, changes: subChanges } = compareObjects2(
            value1,
            value2
          );
          changes.push(...subChanges.map((subChange) => `${key}.${subChange}`));
          if (!isEqual) {
            changes.push(`Mismatch found for key ${key}`);
          }
        } else {
          if (value1 !== value2) {
            changes.push(
              `Mismatch found for key ${key}: server value ${value1}, value to set ${value2}`
            );
          }
        }
      } else {
      }
    }
  }

  const equal = changes.length === 0;
  return { equal, changes };
}

function compareObjectsCarr(
  object1: CustomFormatResource,
  object2: CustomFormatResource
): { equal: boolean; changes: string[] } {
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
            changes.push(
              `Array length mismatch for key ${key}: object1 length ${value1.length}, object2 length ${value2.length}`
            );
            continue;
          }

          for (let i = 0; i < value1.length; i++) {
            const { equal: isEqual, changes: subChanges } = compareObjectsCarr(
              value1[i],
              value2[i]
            );
            // changes.push(
            //   ...subChanges.map((subChange) => `${key}[${i}].${subChange}`)
            // );

            if (subChanges.length > 0) {
              changes.push(`${key}[${i}].${subChanges[0]}`);
            }

            if (!isEqual && changes.length <= 0) {
              changes.push(
                `Mismatch found in array element at index ${i} for key ${key}`
              );
            }
          }
        } else if (typeof value2 === "object" && value2 !== null) {
          if (typeof value1 !== "object" || value1 === null) {
            changes.push(`Expected object for key ${key} in object1`);
            continue;
          }

          const { equal: isEqual, changes: subChanges } = compareObjectsCarr(
            value1,
            value2
          );
          changes.push(...subChanges.map((subChange) => `${key}.${subChange}`));
          if (!isEqual) {
            changes.push(`Mismatch found for key ${key}`);
          }
        } else {
          console.log(value1, value2);
          if (value1 !== value2) {
            changes.push(
              `Mismatch found for key ${key}: server value ${value1}, value to set ${value2}`
            );
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

const loadYamlFile = () => {
  const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), ".");

  const file = readFileSync(`${PATH_TO_OUTPUT_DIR}/input.yml`, "utf8");
  const yamlRes = parse(file) as YamlInput;

  console.log(yamlRes);

  return yamlRes;
};

const calculateCFsToManage = (yaml: YamlInput) => {
  const cfTrashToManage: Set<string> = new Set();

  yaml.custom_formats.map((cf) => {
    if (cf.trash_ids) {
      cf.trash_ids.forEach((tid) => cfTrashToManage.add(tid));
    }
  });

  return cfTrashToManage;
};

const gitStuff = async () => {
  const trashRepoPath = "./repos/trash-guides";

  const gitClient = simpleGit(trashRepoPath);
  const r = await gitClient.checkIsRepo();

  if (r) {
    await gitClient.pull();
  } else {
    await simpleGit().clone(
      "https://github.com/BlackDark/fork-TRASH-Guides",
      "."
    );
  }

  console.log(r);
};

const loadTrashCfs = async () => {
  const trashRepoPath = "./repos/trash-guides";
  const trashJsonDir = "docs/json";
  const trashRadarrPath = `${trashJsonDir}/radarr`;
  const trashRadarrCfPath = `${trashRadarrPath}/cf`;

  const trashSonarrPath = `${trashJsonDir}/sonarr`;
  const trashSonarrCfPath = `${trashSonarrPath}/cf`;

  const files = readdirSync(`${trashRepoPath}/${trashSonarrCfPath}`).filter(
    (fn) => fn.endsWith("json")
  );

  const trashIdToObject = new Map<
    string,
    { trashConfig: TrashCF; requestConfig: CustomFormatResource }
  >();

  const cfNameToTrashId = new Map<string, string>();

  for (const file of files) {
    const name = `${trashRepoPath}/${trashSonarrCfPath}/${file}`;
    const cf: DynamicImportType<TrashCF> = await import(`${ROOT_PATH}/${name}`);

    trashIdToObject.set(cf.default.trash_id, {
      trashConfig: cf.default,
      requestConfig: trashCfToValidCf(cf.default),
    });

    if (cf.default.name) {
      cfNameToTrashId.set(cf.default.name, cf.default.trash_id);
    }
  }

  console.log(`Trash CFs: ${trashIdToObject.size}`);

  return { trashIdToObject, cfNameToTrashId };
};

const loadLocalCfs = async (): Promise<CFProcessing | null> => {
  const sonarrLocalPath = process.env.SONARR_LOCAL_PATH;
  if (!sonarrLocalPath) {
    console.log("Ignoring local cfs.");
    return null;
  }

  const files = readdirSync(`${sonarrLocalPath}`).filter((fn) =>
    fn.endsWith("json")
  );

  const carrIdToObject = new Map<
    string,
    { carrConfig: ConfigarrCF; requestConfig: CustomFormatResource }
  >();

  const cfNameToCarrObject = new Map<string, ConfigarrCF>();

  for (const file of files) {
    const name = `${sonarrLocalPath}/${file}`;
    const cf: DynamicImportType<TrashCF | ConfigarrCF> = await import(
      `${ROOT_PATH}/${name}`
    );

    const cfD = toCarrCF(cf.default);

    carrIdToObject.set(cfD.configarr_id, {
      carrConfig: cfD,
      requestConfig: carrCfToValidCf(cfD),
    });

    if (cfD.name) {
      cfNameToCarrObject.set(cfD.name, cfD);
    }
  }

  return {
    carrIdMapping: carrIdToObject,
    cfNameToCarrConfig: cfNameToCarrObject,
  };
};

const loadQualityProfiles = async () => {
  const qualityProfile = await api.api.v3QualityprofileList();
  return qualityProfile.data;
};

const calculateProfileActions = async (
  yaml: YamlInput,
  profiles: QualityProfileResource[]
) => {
  const configProfiles: Set<string> = new Set();
  const serverProfiles = profiles.map((sp) => sp.name!);

  yaml.custom_formats.map((cf) => {
    cf.quality_profiles.forEach((qp) => configProfiles.add(qp.name));
  });

  const { create, update } = Array.from(configProfiles.values()).reduce<{
    create: string[];
    update: string[];
  }>(
    ({ create, update }, c) => {
      if (serverProfiles.includes(c)) {
        return {
          create,
          update: update.concat(c),
        };
      }
      return {
        create: create.concat(c),
        update,
      };
    },
    {
      create: [],
      update: [],
    }
  );

  console.log(`Profiles to create: ${create}`);
  console.log(`Profiles to potentially update: ${update}`);
};

const getServerCFs = async (): Promise<CustomFormatResource[]> => {
  return (await import("./test/samples/cfs.json"))
    .default as unknown as Promise<CustomFormatResource[]>;

  const cfOnServer = await api.api.v3CustomformatList();
  return cfOnServer.data;
};

const go2 = async () => {
  const yamlStuff = loadYamlFile();
  const profile = await loadQualityProfiles();

  calculateProfileActions(yamlStuff, profile);
};

const go = async () => {
  const yamlStuff = loadYamlFile();

  const cfTrashToManage: Set<string> = new Set();

  yamlStuff.custom_formats.map((cf) => {
    if (cf.trash_ids) {
      cf.trash_ids.forEach((tid) => cfTrashToManage.add(tid));
    }
  });

  const trashRepoPath = "./repos/trash-guides";
  const trashJsonDir = "docs/json";
  const trashRadarrPath = `${trashJsonDir}/radarr`;
  const trashRadarrCfPath = `${trashRadarrPath}/cf`;

  const trashSonarrPath = `${trashJsonDir}/sonarr`;
  const trashSonarrCfPath = `${trashSonarrPath}/cf`;

  const files = readdirSync(`${trashRepoPath}/${trashSonarrCfPath}`).filter(
    (fn) => fn.endsWith("json")
  );

  const trashIdToObject = new Map<
    string,
    { trashConfig: TrashCF; requestConfig: CustomFormatResource }
  >();
  const cfNameToTrashId = new Map<string, string>();

  for (const file of files) {
    const name = `${trashRepoPath}/${trashSonarrCfPath}/${file}`;
    const cf: DynamicImportType<TrashCF> = await import(`${ROOT_PATH}/${name}`);

    trashIdToObject.set(cf.default.trash_id, {
      trashConfig: cf.default,
      requestConfig: trashCfToValidCf(cf.default),
    });

    if (cf.default.name) {
      cfNameToTrashId.set(cf.default.name, cf.default.trash_id);
    }
  }

  console.log(`Trash CFs: ${trashIdToObject.size}`);

  const cfOnServer = await api.api.v3CustomformatList();

  console.log(`CFs on server: ${cfOnServer.data.length}`);

  const existingCfToObject = new Map<string, any>();
  const unknownCfToObject = new Map<string, any>();

  for (const cfServer of cfOnServer.data) {
    if (!cfServer.name) {
      console.log("CF without name found", cfServer);
      continue;
    }
    if (cfNameToTrashId.has(cfServer.name)) {
      existingCfToObject.set(cfServer.name, cfServer);
    } else {
      unknownCfToObject.set(cfServer.name, cfServer);
    }
  }

  const manageCf = async (trashId: string) => {
    const tr = trashIdToObject.get(trashId);

    if (!tr) {
      console.log(`TrashID to manage ${trashId} does not exists`);
      return;
    }

    const existingCf = existingCfToObject.get(tr.trashConfig.name!);

    if (existingCf) {
      // Update if necessary
      const comparison = compareObjects3(existingCf, tr.trashConfig);

      if (!comparison.equal) {
        console.log(
          `Found mismatch for ${tr.requestConfig.name}.`,
          comparison.changes
        );

        try {
          const updateResult = await api.api.v3CustomformatUpdate(
            existingCf.id,
            {
              id: existingCf.id,
              ...tr.requestConfig,
            }
          );

          console.log(`Updated CF ${tr.requestConfig.name}`);
        } catch (err) {
          console.log(`Failed updating CF ${tr.requestConfig.name}`, err.error);
        }
      } else {
        console.log(`CF ${tr.requestConfig.name} does not need update.`);
      }
    } else {
      // Create

      try {
        console.log(JSON.stringify(tr.requestConfig));
        const createResult = await api.api.v3CustomformatCreate(
          tr.requestConfig
        );

        console.log(`Created CF ${tr.requestConfig.name}`);
      } catch (err) {
        console.log(`Failed creating CF ${tr.requestConfig.name}`, err.error);
      }
    }
  };
  //   console.log(
  //     `Matching CF names found on server: ${existingCfToObject.size}`,
  //     existingCfToObject.keys()
  //   );

  for (const manage of cfTrashToManage) {
    console.log(`Manage ${manage}`);

    await manageCf(manage);
  }

  //   for (const [key, value] of existingCfToObject.entries()) {
  //     const trashThing = trashIdToObject.get(cfNameToTrashId.get(key)!)!;

  //     const comparison = compareObjects2(value, trashThing.trashConfig);

  //     if (!comparison.equal) {
  //       console.log(`Found mismatch for ${key}.`, comparison.changes);
  //       console.log(JSON.stringify(trashThing.requestConfig));
  //       console.log(JSON.stringify(trashThing.trashConfig));
  //       console.log(JSON.stringify(value));

  //       try {
  //         const updateResult = await api.api.v3CustomformatUpdate(value.id, {
  //           id: value.id,
  //           ...trashThing.requestConfig,
  //         });

  //         console.log(updateResult.data);
  //       } catch (err) {
  //         console.log(err.error);
  //       }
  //     }
  //   }

  console.log(
    `Unknown CF names found on server: ${unknownCfToObject.size}`,
    unknownCfToObject.keys()
  );

  return;

  const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), ".");

  const file = readFileSync(`${PATH_TO_OUTPUT_DIR}/input.yml`, "utf8");
  const yamlRes = parse(file);

  console.log(yamlRes);

  return;

  const result = await api.api.v3CustomformatList();
  console.log(result.data);

  //   const test = await api.api.v3CustomformatCreate({
  //     name: "Test this",
  //     specifications: [
  //       {
  //         implementation: "SizeSpecification",
  //         name: "Hello",
  //         fields: [
  //           { name: "min", value: 15 },
  //           { name: "max", value: 40 },
  //         ],
  //       },
  //     ],
  //   });
};

const testCompare = () => {
  const object22: TrashCF = {
    trash_id: "eb3d5cc0a2be0db205fb823640db6a3c",
    trash_scores: {
      default: 6,
    },
    name: "Repack v2",
    includeCustomFormatWhenRenaming: false,
    specifications: [
      {
        name: "Repack v2",
        implementation: "ReleaseTitleSpecification",
        negate: false,
        required: false,
        fields: {
          value: "\\b(repack22)\\b",
        },
      },
      {
        name: "Proper v2",
        implementation: "ReleaseTitleSpecification",
        negate: false,
        required: false,
        fields: {
          value: "\\b(proper2)\\b",
        },
      },
    ],
  };

  const object11 = {
    id: 7,
    name: "Repack v2",
    includeCustomFormatWhenRenaming: false,
    specifications: [
      {
        name: "Repack v2",
        implementation: "ReleaseTitleSpecification",
        implementationName: "Release Title",
        infoLink: "https://wiki.servarr.com/sonarr/settings#custom-formats-2",
        negate: false,
        required: false,
        fields: [
          {
            order: 0,
            name: "value",
            label: "Regular Expression",
            helpText: "Custom Format RegEx is Case Insensitive",
            value: "\\b(repack2)\\b",
            type: "textbox",
            advanced: false,
            privacy: PrivacyLevel.Normal,
            isFloat: false,
          },
        ],
      },
      {
        name: "Proper v2",
        implementation: "ReleaseTitleSpecification",
        implementationName: "Release Title",
        infoLink: "https://wiki.servarr.com/sonarr/settings#custom-formats-2",
        negate: false,
        required: false,
        fields: [
          {
            order: 0,
            name: "value",
            label: "Regular Expression",
            helpText: "Custom Format RegEx is Case Insensitive",
            value: "\\b(proper2)\\b",
            type: "textbox",
            advanced: false,
            privacy: PrivacyLevel.Normal,
            isFloat: false,
          },
        ],
      },
    ],
  };

  const comparisonResult2 = compareObjects2(object11, object22);
  console.log("Objects are equal:", comparisonResult2.equal);
  console.log("Changes:", comparisonResult2.changes);
};

const mergeCfSources = (listOfCfs: (CFProcessing | null)[]): CFProcessing => {
  return listOfCfs.reduce<CFProcessing>(
    (p, c) => {
      if (!c) {
        return p;
      }

      for (const [key, value] of c.carrIdMapping.entries()) {
        if (p.carrIdMapping.has(key)) {
          console.log(`Overwriting ${key} during CF merge`);
        }
        p.carrIdMapping.set(key, value);
      }

      for (const [key, value] of c.cfNameToCarrConfig.entries()) {
        if (p.cfNameToCarrConfig.has(key)) {
          console.log(`Overwriting ${key} during CF merge`);
        }
        p.cfNameToCarrConfig.set(key, value);
      }

      return p;
    },
    {
      carrIdMapping: new Map(),
      cfNameToCarrConfig: new Map(),
    }
  );
};

const manageCf = async (
  cfProcessing: CFProcessing,
  serverCfs: Map<string, CustomFormatResource>,
  cfsToManage: Set<string>
) => {
  const {
    carrIdMapping: trashIdToObject,
    cfNameToCarrConfig: existingCfToObject,
  } = cfProcessing;

  const manageSingle = async (carrId: string) => {
    const tr = trashIdToObject.get(carrId);

    if (!tr) {
      console.log(`TrashID to manage ${carrId} does not exists`);
      return;
    }

    const existingCf = serverCfs.get(tr.carrConfig.name!);

    if (existingCf) {
      // Update if necessary
      console.log(JSON.stringify(existingCf), JSON.stringify(existingCf));
      const comparison = compareObjectsCarr(existingCf, tr.requestConfig);

      if (!comparison.equal) {
        console.log(
          `Found mismatch for ${tr.requestConfig.name}.`,
          comparison.changes
        );

        try {
          const updateResult = await api.api.v3CustomformatUpdate(
            existingCf.id + "",
            {
              id: existingCf.id,
              ...tr.requestConfig,
            }
          );

          console.log(`Updated CF ${tr.requestConfig.name}`);
        } catch (err) {
          console.log(`Failed updating CF ${tr.requestConfig.name}`, err.error);
        }
      } else {
        console.log(`CF ${tr.requestConfig.name} does not need update.`);
      }
    } else {
      // Create

      try {
        console.log(JSON.stringify(tr.requestConfig));
        const createResult = await api.api.v3CustomformatCreate(
          tr.requestConfig
        );

        console.log(`Created CF ${tr.requestConfig.name}`);
      } catch (err) {
        console.log(`Failed creating CF ${tr.requestConfig.name}`, err.error);
      }
    }
  };
  cfsToManage.forEach((cf) => manageSingle(cf));
};

const pipeline = async () => {
  const yaml = loadYamlFile();
  const result = await loadLocalCfs();
  const mergedCFs = mergeCfSources([result]);

  const idsToManage = calculateCFsToManage(yaml);

  console.log(`Stuff to manage: ${Array.from(idsToManage)}`);

  const serverCFs = await getServerCFs();
  console.log(`CFs on server: ${serverCFs.length}`);

  const serverCFMapping = serverCFs.reduce((p, c) => {
    p.set(c.name!, c);
    return p;
  }, new Map<string, CustomFormatResource>());

  for (const key of idsToManage) {
    await manageCf(mergedCFs, serverCFMapping, idsToManage);
  }
  /*
  - load trash
  - load custom resources
  - merge stuff together to see what actually needs to be done
  - create/update CFs
  - future: somehow track managed CFs?
  - create/update quality profiles
  - future: quality definitions
  */
};

pipeline();
//go();
//go2();
//testGo();
//testCompare();
