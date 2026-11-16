import type { HostConfigResource } from "../__generated__/lidarr/data-contracts";
import { getClient } from "../clients/client";
import { DelayProfileLidarrSync } from "../delayProfiles/delayProfileLidarr";
import type { InstanceDiffReport } from "../diffReport/diffReport.types";
import { LidarrDownloadClientSync } from "../downloadClients/downloadClientLidarr";
import { BackupHostConfigSync } from "../hostConfig/hostConfigSync";
import { MediaManagementSync } from "../mediaManagement/mediaManagement";
import { LidarrMetadataProfileSync } from "../metadataProfiles/metadataProfileLidarr";
import { QualityDefinitionPreferredSync } from "../qualityDefinitions/qualityDefinition";
import { QualityProfileLidarrSync } from "../qualityProfiles/qualityProfileLidarr";
import { ReleaseProfileLidarrSync } from "../releaseProfiles/releaseProfileLidarr";
import { LidarrRootFolderSync } from "../rootFolder/rootFolderLidarr";
import type { InputConfigArrInstance, InputConfigSchema } from "../types/config.types";
import { completeMediaSync, runMediaSyncToQualityProfiles } from "./mediaPipeline";

const ARR = "LIDARR" as const;

export class LidarrSyncer {
  async run(globalConfig: InputConfigSchema, instance: InputConfigArrInstance, instanceName: string): Promise<InstanceDiffReport> {
    const client = getClient(ARR);
    const ctx = await runMediaSyncToQualityProfiles({
      arrType: ARR,
      instanceName,
      globalConfig,
      instanceConfig: instance,
      client,
      syncs: {
        qd: new QualityDefinitionPreferredSync(client),
        mm: new MediaManagementSync(client),
        qp: new QualityProfileLidarrSync(client),
        delay: new DelayProfileLidarrSync(client),
        releaseProfiles: new ReleaseProfileLidarrSync(client),
        root: new LidarrRootFolderSync(client),
        downloadClients: new LidarrDownloadClientSync(client),
        indexerConfig: client,
        hostConfig: new BackupHostConfigSync<HostConfigResource>(client, "Lidarr"),
      },
    });
    const metadataSync = new LidarrMetadataProfileSync(client);
    ctx.collector.add((await metadataSync.syncMetadataProfiles(ctx.config, ctx.serverCache)).diffEntries);
    return completeMediaSync(ctx);
  }
}
