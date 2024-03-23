import { CustomFormatResource } from "./__generated__/MySuperbApi";
import { ConfigarrCF, TrashCF, UserFriendlyField } from "./types";

export const trashToCarrCF = ({
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

export const toCarrCF = (input: TrashCF | ConfigarrCF): ConfigarrCF => {
  if ("configarr_id" in input) {
    return input;
  }

  return trashToCarrCF(input);
};

export const trashCfToValidCf = (trashCf: TrashCF): CustomFormatResource => {
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

export const carrCfToValidCf = (cf: ConfigarrCF): CustomFormatResource => {
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

export function compareObjectsCarr(
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
