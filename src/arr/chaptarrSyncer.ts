import { DownloadProtocol, type HostConfigResource } from "../__generated__/chaptarr/data-contracts";
import { getClient } from "../clients/client";
import { StandardDelayProfileSync } from "../delayProfiles/delayProfileBase";
import type { InstanceDiffReport } from "../diffReport/diffReport.types";
import { ChaptarrDownloadClientSync } from "../downloadClients/downloadClientChaptarr";
import { BackupHostConfigSync } from "../hostConfig/hostConfigSync";
import { ChaptarrMediaManagementSync } from "../mediaManagement/mediaManagementChaptarr";
import { ChaptarrMetadataProfileSync } from "../metadataProfiles/metadataProfileChaptarr";
import { QualityDefinitionSync } from "../qualityDefinitions/qualityDefinition";
import { QualityProfileChaptarrSync } from "../qualityProfiles/qualityProfileChaptarr";
import { ReleaseProfileChaptarrSync } from "../releaseProfiles/releaseProfileChaptarr";
import { ChaptarrRootFolderSync } from "../rootFolder/rootFolderChaptarr";
import type { InputConfigArrInstance, InputConfigSchema } from "../types/config.types";
import { completeMediaSync, runMediaSyncToQualityProfiles } from "./mediaPipeline";

const ARR = "CHAPTARR" as const;

export class ChaptarrSyncer {
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
        mm: new ChaptarrMediaManagementSync(client, instance.media_type),
        qp: new QualityProfileChaptarrSync(client, instance.media_type),
        delay: new StandardDelayProfileSync(client, DownloadProtocol),
        releaseProfiles: new ReleaseProfileChaptarrSync(client),
        root: new ChaptarrRootFolderSync(client, instance.media_type),
        downloadClients: new ChaptarrDownloadClientSync(client),
        indexerConfig: client,
        hostConfig: new BackupHostConfigSync<HostConfigResource>(client, "Chaptarr"),
      },
      // Templates can supply media_type, so the media-dependent syncs are rebuilt from the merged value.
      mediaSyncs: (mediaType) => ({
        mm: new ChaptarrMediaManagementSync(client, mediaType),
        qp: new QualityProfileChaptarrSync(client, mediaType),
        root: new ChaptarrRootFolderSync(client, mediaType),
      }),
    });
    const metadataSync = new ChaptarrMetadataProfileSync(client);
    ctx.collector.add((await metadataSync.syncMetadataProfiles(ctx.config, ctx.serverCache)).diffEntries);
    return completeMediaSync(ctx);
  }
}
