import fs from "fs";
import path from "path";
import { CustomFormatResource } from "./__generated__/MySuperbApi";
import { CFProcessing, ConfigarrCF, DynamicImportType, TrashCF } from "./types";
import { carrCfToValidCf, toCarrCF } from "./util";

export const loadSonarrTrashCFs = async (): Promise<CFProcessing> => {
  const trashRepoPath = "./repos/trash-guides";
  const trashJsonDir = "docs/json";
  const trashRadarrPath = `${trashJsonDir}/radarr`;
  const trashRadarrCfPath = `${trashRadarrPath}/cf`;

  const trashSonarrPath = `${trashJsonDir}/sonarr`;
  const trashSonarrCfPath = `${trashSonarrPath}/cf`;

  const files = fs
    .readdirSync(`${trashRepoPath}/${trashSonarrCfPath}`)
    .filter((fn) => fn.endsWith("json"));

  const trashIdToObject = new Map<
    string,
    { trashConfig: TrashCF; requestConfig: CustomFormatResource }
  >();

  const cfNameToTrashId = new Map<string, string>();

  const carrIdToObject = new Map<
    string,
    { carrConfig: ConfigarrCF; requestConfig: CustomFormatResource }
  >();

  const cfNameToCarrObject = new Map<string, ConfigarrCF>();

  for (const file of files) {
    const name = `${trashRepoPath}/${trashSonarrCfPath}/${file}`;

    const cf: DynamicImportType<TrashCF> = await import(path.resolve(name));

    const carrConfig = toCarrCF(cf.default);

    carrIdToObject.set(carrConfig.configarr_id, {
      carrConfig: carrConfig,
      requestConfig: carrCfToValidCf(carrConfig),
    });

    if (carrConfig.name) {
      cfNameToCarrObject.set(carrConfig.name, carrConfig);
    }
  }

  console.log(`Trash CFs: ${trashIdToObject.size}`);

  return {
    carrIdMapping: carrIdToObject,
    cfNameToCarrConfig: cfNameToCarrObject,
  };
};
