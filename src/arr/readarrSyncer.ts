import { DownloadProtocol, type HostConfigResource } from "../__generated__/readarr/data-contracts";
import { getClient } from "../clients/client";
import type { ReadarrClient } from "../clients/readarr-client";
import { StandardDelayProfileSync } from "../delayProfiles/delayProfileBase";
import type { InstanceDiffReport } from "../diffReport/diffReport.types";
import { ReadarrDownloadClientSync } from "../downloadClients/downloadClientReadarr";
import { BackupHostConfigSync } from "../hostConfig/hostConfigSync";
import { MediaManagementSync } from "../mediaManagement/mediaManagement";
import { ReadarrMetadataProfileSync } from "../metadataProfiles/metadataProfileReadarr";
import { QualityDefinitionSync } from "../qualityDefinitions/qualityDefinition";
import { QualityProfileReadarrSync } from "../qualityProfiles/qualityProfileReadarr";
import { ReleaseProfileReadarrSync } from "../releaseProfiles/releaseProfileReadarr";
import { ReadarrRootFolderSync } from "../rootFolder/rootFolderReadarr";
import type { InputConfigArrInstance, InputConfigSchema } from "../types/config.types";
import { completeMediaSync, runMediaSyncToQualityProfiles } from "./mediaPipeline";

type BookMediaType = InputConfigArrInstance["media_type"];

export class ReadarrSyncer {
  protected readonly arrType: "READARR" | "CHAPTARR" = "READARR";
  protected readonly arrLabel: string = "Readarr";

  protected createMediaManagementSync(client: ReadarrClient, _mediaType: BookMediaType) {
    return new MediaManagementSync(client);
  }

  protected createQualityProfileSync(client: ReadarrClient, _mediaType: BookMediaType) {
    return new QualityProfileReadarrSync(client);
  }

  protected createRootFolderSync(client: ReadarrClient, _mediaType: BookMediaType) {
    return new ReadarrRootFolderSync(client, this.arrLabel);
  }

  protected createDownloadClientSync(client: ReadarrClient) {
    return new ReadarrDownloadClientSync(client, this.arrType);
  }

  protected createMetadataProfileSync(client: ReadarrClient) {
    return new ReadarrMetadataProfileSync(client, this.arrType);
  }

  async run(globalConfig: InputConfigSchema, instance: InputConfigArrInstance, instanceName: string): Promise<InstanceDiffReport> {
    const client = getClient(this.arrType);
    const ctx = await runMediaSyncToQualityProfiles({
      arrType: this.arrType,
      instanceName,
      globalConfig,
      instanceConfig: instance,
      client,
      syncs: {
        qd: new QualityDefinitionSync(client),
        mm: this.createMediaManagementSync(client, instance.media_type),
        qp: this.createQualityProfileSync(client, instance.media_type),
        delay: new StandardDelayProfileSync(client, DownloadProtocol),
        releaseProfiles: new ReleaseProfileReadarrSync(client),
        root: this.createRootFolderSync(client, instance.media_type),
        downloadClients: this.createDownloadClientSync(client),
        indexerConfig: client,
        hostConfig: new BackupHostConfigSync<HostConfigResource>(client, this.arrLabel),
      },
      mediaSyncs: (mediaType) => ({
        mm: this.createMediaManagementSync(client, mediaType),
        qp: this.createQualityProfileSync(client, mediaType),
        root: this.createRootFolderSync(client, mediaType),
      }),
    });
    const metadataSync = this.createMetadataProfileSync(client);
    ctx.collector.add((await metadataSync.syncMetadataProfiles(ctx.config, ctx.serverCache)).diffEntries);
    return completeMediaSync(ctx);
  }
}
