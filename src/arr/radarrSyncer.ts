import { getClient } from "../clients/client";
import { InstanceDiffReport } from "../diffReport/diffReport.types";
import { InputConfigArrInstance, InputConfigSchema } from "../types/config.types";
import { completeMediaSync, createMediaFeatureSyncs, runMediaSyncToQualityProfiles } from "./mediaPipeline";
import { createTrashOps } from "./trashOps";

const ARR = "RADARR" as const;

export class RadarrSyncer {
  async run(globalConfig: InputConfigSchema, instance: InputConfigArrInstance, instanceName: string): Promise<InstanceDiffReport> {
    const ctx = await runMediaSyncToQualityProfiles({
      arrType: ARR,
      instanceName,
      globalConfig,
      instanceConfig: instance,
      client: getClient(ARR),
      syncs: createMediaFeatureSyncs(ARR),
      trash: createTrashOps(ARR),
    });
    return completeMediaSync(ctx);
  }
}
