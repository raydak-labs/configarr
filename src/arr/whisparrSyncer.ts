import { getClient } from "../clients/client";
import { InstanceDiffReport } from "../diffReport/diffReport.types";
import { InputConfigArrInstance, InputConfigSchema } from "../types/config.types";
import { completeMediaSync, createMediaFeatureSyncs, runMediaSyncToQualityProfiles } from "./mediaPipeline";

const ARR = "WHISPARR" as const;

export class WhisparrSyncer {
  async run(globalConfig: InputConfigSchema, instance: InputConfigArrInstance, instanceName: string): Promise<InstanceDiffReport> {
    const ctx = await runMediaSyncToQualityProfiles({
      arrType: ARR,
      instanceName,
      globalConfig,
      instanceConfig: instance,
      client: getClient(ARR),
      syncs: createMediaFeatureSyncs(ARR),
    });
    return completeMediaSync(ctx);
  }
}
