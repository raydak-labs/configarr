import { describe, expect, expectTypeOf, it } from "vitest";
import { DownloadProtocol } from "../__generated__/sonarr/data-contracts";
import type { QualityDefinitionResource as SonarrQualityDefinitionResource } from "../__generated__/sonarr/data-contracts";
import type { SonarrClient } from "../clients/sonarr-client";
import { StandardDelayProfileSync } from "../delayProfiles/delayProfileBase";
import { SonarrDownloadClientSync } from "../downloadClients/downloadClientSonarr";
import { MediaManagementSync } from "../mediaManagement/mediaManagement";
import { QualityDefinitionPreferredSync } from "../qualityDefinitions/qualityDefinition";
import { QualityProfileLidarrSync } from "../qualityProfiles/qualityProfileLidarr";
import { QualityProfileRadarrSync } from "../qualityProfiles/qualityProfileRadarr";
import { QualityProfileSonarrSync } from "../qualityProfiles/qualityProfileSonarr";
import { ReleaseProfileSonarrSync } from "../releaseProfiles/releaseProfileSonarr";
import { PathRootFolderSync } from "../rootFolder/rootFolderBase";
import type { MediaFeatureSyncs } from "./mediaPipeline";

describe("MediaFeatureSyncs", () => {
  it("only accepts the feature syncs built for its own *arr", () => {
    expectTypeOf<QualityProfileSonarrSync>().toMatchTypeOf<MediaFeatureSyncs<"SONARR">["qp"]>();
    expectTypeOf<QualityProfileLidarrSync>().toMatchTypeOf<MediaFeatureSyncs<"LIDARR">["qp"]>();
    // Sonarr and Radarr quality-profile resources differ (`Quality.source`), so a wrong-arr sync is rejected.
    expectTypeOf<QualityProfileRadarrSync>().not.toMatchTypeOf<MediaFeatureSyncs<"SONARR">["qp"]>();

    // The remaining slots have no negative case on purpose: their generated resources are structurally
    // identical across arrs, so a negative assertion here would be false. See MediaArrResources in mediaPipeline.
    expectTypeOf<SonarrDownloadClientSync>().toMatchTypeOf<MediaFeatureSyncs<"SONARR">["downloadClients"]>();
    expectTypeOf<ReleaseProfileSonarrSync>().toMatchTypeOf<MediaFeatureSyncs<"SONARR">["releaseProfiles"]>();
    expectTypeOf<QualityDefinitionPreferredSync<SonarrQualityDefinitionResource>>().toMatchTypeOf<MediaFeatureSyncs<"SONARR">["qd"]>();
  });

  it("keeps the per-arr feature classes the Sonarr syncer builds", () => {
    const client = {} as SonarrClient;

    const syncs: MediaFeatureSyncs<"SONARR"> = {
      qd: new QualityDefinitionPreferredSync(client),
      mm: new MediaManagementSync(client),
      qp: new QualityProfileSonarrSync(client),
      delay: new StandardDelayProfileSync(client, DownloadProtocol),
      releaseProfiles: new ReleaseProfileSonarrSync(client),
      root: new PathRootFolderSync(client),
      downloadClients: new SonarrDownloadClientSync(client),
    };

    expect(Object.values(syncs).map((sync) => sync.constructor.name)).toEqual([
      "QualityDefinitionPreferredSync",
      "MediaManagementSync",
      "QualityProfileSonarrSync",
      "StandardDelayProfileSync",
      "ReleaseProfileSonarrSync",
      "PathRootFolderSync",
      "SonarrDownloadClientSync",
    ]);
  });
});
