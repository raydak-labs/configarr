import { CFProcessing } from "../customFormats/customFormat.types";
import { checkForConflictingCFs } from "../qualityProfiles/qualityProfileBase";
import { loadQualityDefinitionFromTrash, loadTrashCFConflicts, loadTrashCFs, transformTrashQDs } from "../trash-guide";
import { MergedConfigInstance } from "../types/config.types";
import { TrashArrSupported } from "../types/trashguide.types";
import { MediaTrashOps } from "./mediaPipeline";

export function createTrashOps(arrType: TrashArrSupported): MediaTrashOps {
  return {
    loadCFs: () => loadTrashCFs(arrType),
    checkConflicts: async (mergedCFs: CFProcessing, config: MergedConfigInstance) => {
      const conflicts = await loadTrashCFConflicts(arrType);
      checkForConflictingCFs(mergedCFs, config, conflicts);
    },
    loadQdType: async (type: string, preferredRatio?: number) => {
      const qdTrash = await loadQualityDefinitionFromTrash(type, arrType);
      return transformTrashQDs(qdTrash, preferredRatio);
    },
  };
}
