import { DownloadProtocol } from "../__generated__/radarr/data-contracts";
import { getClient } from "../clients/client";
import { StandardDelayProfileSync } from "../delayProfiles/delayProfileBase";
import { InstanceDiffReport } from "../diffReport/diffReport.types";
import { BaseMediaManagementSync } from "../mediaManagement/mediaManagementBase";
import { QualityDefinitionPreferredSync } from "../qualityDefinitions/qualityDefinitionBase";
import { QualityProfileRadarrSync } from "../qualityProfiles/qualityProfileRadarr";
import { PathRootFolderSync } from "../rootFolder/rootFolderBase";
import { InputConfigArrInstance, InputConfigSchema } from "../types/config.types";
import { completeMediaSync, runMediaSyncToQualityProfiles } from "./mediaPipeline";
import { createTrashOps } from "./trashOps";

const ARR = "RADARR" as const;

export class RadarrSyncer {
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
        mm: new BaseMediaManagementSync(client),
        qp: new QualityProfileRadarrSync(client),
        delay: new StandardDelayProfileSync(client, DownloadProtocol),
        root: new PathRootFolderSync(client),
      },
      trash: createTrashOps(ARR),
    });
    return completeMediaSync(ctx);
  }
}
