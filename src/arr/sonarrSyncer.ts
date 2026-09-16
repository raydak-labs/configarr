import { DownloadProtocol } from "../__generated__/sonarr/data-contracts";
import { getClient } from "../clients/client";
import { StandardDelayProfileSync } from "../delayProfiles/delayProfileBase";
import { InstanceDiffReport } from "../diffReport/diffReport.types";
import { SonarrDownloadClientSync } from "../downloadClients/downloadClientSonarr";
import { MediaManagementSync } from "../mediaManagement/mediaManagement";
import { QualityDefinitionPreferredSync } from "../qualityDefinitions/qualityDefinition";
import { QualityProfileSonarrSync } from "../qualityProfiles/qualityProfileSonarr";
import { PathRootFolderSync } from "../rootFolder/rootFolderBase";
import { InputConfigArrInstance, InputConfigSchema } from "../types/config.types";
import { completeMediaSync, runMediaSyncToQualityProfiles } from "./mediaPipeline";
import { createTrashOps } from "./trashOps";

const ARR = "SONARR" as const;

export class SonarrSyncer {
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
        qp: new QualityProfileSonarrSync(client),
        delay: new StandardDelayProfileSync(client, DownloadProtocol),
        root: new PathRootFolderSync(client),
        downloadClients: new SonarrDownloadClientSync(client),
      },
      trash: createTrashOps(ARR),
    });
    return completeMediaSync(ctx);
  }
}
