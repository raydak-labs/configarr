import { DownloadProtocol } from "../__generated__/whisparr/data-contracts";
import { getClient } from "../clients/client";
import { StandardDelayProfileSync } from "../delayProfiles/delayProfileBase";
import { InstanceDiffReport } from "../diffReport/diffReport.types";
import { WhisparrDownloadClientSync } from "../downloadClients/downloadClientWhisparr";
import { MediaManagementSync } from "../mediaManagement/mediaManagement";
import { QualityDefinitionPreferredSync } from "../qualityDefinitions/qualityDefinition";
import { QualityProfileWhisparrSync } from "../qualityProfiles/qualityProfileWhisparr";
import { PathRootFolderSync } from "../rootFolder/rootFolderBase";
import { InputConfigArrInstance, InputConfigSchema } from "../types/config.types";
import { completeMediaSync, runMediaSyncToQualityProfiles } from "./mediaPipeline";

const ARR = "WHISPARR" as const;

export class WhisparrSyncer {
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
        qp: new QualityProfileWhisparrSync(client),
        delay: new StandardDelayProfileSync(client, DownloadProtocol),
        root: new PathRootFolderSync(client),
        downloadClients: new WhisparrDownloadClientSync(client),
      },
    });
    return completeMediaSync(ctx);
  }
}
