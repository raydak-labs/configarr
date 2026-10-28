import { SonarrHostConfigSync } from "../hostConfig/hostConfigSonarr";
import { DownloadProtocol } from "../__generated__/sonarr/data-contracts";
import { getClient } from "../clients/client";
import { StandardDelayProfileSync } from "../delayProfiles/delayProfileBase";
import { InstanceDiffReport } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { SonarrDownloadClientSync } from "../downloadClients/downloadClientSonarr";
import { SonarrImportListSync } from "../importLists/importListSonarr";
import { SonarrMediaManagementSync } from "../mediaManagement/mediaManagementSonarr";
import { QualityDefinitionSonarrSync } from "../qualityDefinitions/qualityDefinitionSonarr";
import { QualityProfileSonarrSync } from "../qualityProfiles/qualityProfileSonarr";
import { ReleaseProfileSonarrSync } from "../releaseProfiles/releaseProfileSonarr";
import { PathRootFolderSync } from "../rootFolder/rootFolderBase";
import { InputConfigArrInstance, InputConfigSchema } from "../types/config.types";
import { completeMediaSync, runMediaSyncToQualityProfiles } from "./mediaPipeline";
import { createTrashOps } from "./trashOps";

const ARR = "SONARR" as const;

export class SonarrSyncer {
  async run(globalConfig: InputConfigSchema, instance: InputConfigArrInstance, instanceName: string): Promise<InstanceDiffReport> {
    const client = getClient(ARR);
    const qualityProfiles = new QualityProfileSonarrSync(client);
    const ctx = await runMediaSyncToQualityProfiles({
      arrType: ARR,
      instanceName,
      globalConfig,
      instanceConfig: instance,
      client,
      supportsProfileQualitySizes: await client.supportsProfileQualitySizes(),
      syncs: {
        hostConfig: new SonarrHostConfigSync(client),
        qd: new QualityDefinitionSonarrSync(client),
        mm: new SonarrMediaManagementSync(client),
        qp: qualityProfiles,
        delay: new StandardDelayProfileSync(client, DownloadProtocol),
        releaseProfiles: new ReleaseProfileSonarrSync(client),
        root: new PathRootFolderSync(client),
        downloadClients: new SonarrDownloadClientSync(client),
        importLists: new SonarrImportListSync(client),

        metadata: client,
      },
      trash: createTrashOps(ARR),
    });
    ctx.collector.add(
      await qualityProfiles.syncQualitySizes(
        ctx.config.quality_profiles,
        ctx.serverCache.qualityDefinitions,
        !getEnvs().DRY_RUN,
        ctx.qualityDefinitionDefaults,
      ),
    );
    return completeMediaSync(ctx);
  }
}
