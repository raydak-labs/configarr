import { DownloadProtocol } from "../__generated__/readarr/data-contracts";
import { getClient } from "../clients/client";
import { StandardDelayProfileSync } from "../delayProfiles/delayProfileBase";
import { InstanceDiffReport } from "../diffReport/diffReport.types";
import { BaseMediaManagementSync } from "../mediaManagement/mediaManagementBase";
import { ReadarrMetadataProfileSync } from "../metadataProfiles/metadataProfileReadarr";
import { QualityDefinitionSync } from "../qualityDefinitions/qualityDefinitionBase";
import { QualityProfileReadarrSync } from "../qualityProfiles/qualityProfileReadarr";
import { ReadarrRootFolderSync } from "../rootFolder/rootFolderReadarr";
import { InputConfigArrInstance, InputConfigSchema } from "../types/config.types";
import { completeMediaSync, runMediaSyncToQualityProfiles } from "./mediaPipeline";

const ARR = "READARR" as const;

export class ReadarrSyncer {
  async run(globalConfig: InputConfigSchema, instance: InputConfigArrInstance, instanceName: string): Promise<InstanceDiffReport> {
    const client = getClient(ARR);
    const ctx = await runMediaSyncToQualityProfiles({
      arrType: ARR,
      instanceName,
      globalConfig,
      instanceConfig: instance,
      client,
      syncs: {
        qd: new QualityDefinitionSync(client),
        mm: new BaseMediaManagementSync(client),
        qp: new QualityProfileReadarrSync(client),
        delay: new StandardDelayProfileSync(client, DownloadProtocol),
        root: new ReadarrRootFolderSync(client),
      },
    });
    const metadataSync = new ReadarrMetadataProfileSync(client);
    ctx.collector.add((await metadataSync.syncMetadataProfiles(ctx.config, ctx.serverCache)).diffEntries);
    return completeMediaSync(ctx);
  }
}
