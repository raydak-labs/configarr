import { getClient } from "../clients/client";
import { InstanceDiffReport } from "../diffReport/diffReport.types";
import { createMetadataProfileSync } from "../metadataProfiles/metadataProfileSyncer";
import { InputConfigArrInstance, InputConfigSchema } from "../types/config.types";
import { completeMediaSync, createMediaFeatureSyncs, runMediaSyncToQualityProfiles } from "./mediaPipeline";

const ARR = "READARR" as const;

export class ReadarrSyncer {
  async run(globalConfig: InputConfigSchema, instance: InputConfigArrInstance, instanceName: string): Promise<InstanceDiffReport> {
    const ctx = await runMediaSyncToQualityProfiles({
      arrType: ARR,
      instanceName,
      globalConfig,
      instanceConfig: instance,
      client: getClient(ARR),
      syncs: createMediaFeatureSyncs(ARR),
    });
    const metadataSync = createMetadataProfileSync(ARR);
    ctx.collector.add((await metadataSync.syncMetadataProfiles(ctx.config, ctx.serverCache)).diffEntries);
    return completeMediaSync(ctx);
  }
}
