import type { QualityDefinitionResource } from "../__generated__/sonarr/data-contracts";
import type { SonarrClient } from "../clients/sonarr-client";
import type { QualityDefinitionsClient } from "../clients/capabilities";
import type { TrashQualityDefinitionQuality } from "../types/trashguide.types";
import { QualityDefinitionPreferredSync } from "./qualityDefinition";

type SonarrQualityDefinitionClient = QualityDefinitionsClient<QualityDefinitionResource> &
  Pick<SonarrClient, "supportsProfileQualitySizes">;

const profileSizeFields = new Set(["minSize", "preferredSize", "maxSize"]);

export class QualityDefinitionSonarrSync extends QualityDefinitionPreferredSync<QualityDefinitionResource> {
  constructor(private readonly sonarrClient: SonarrQualityDefinitionClient) {
    super(sonarrClient);
  }

  async persist(serverDefinitions: QualityDefinitionResource[], configuredDefinitions: TrashQualityDefinitionQuality[], write: boolean) {
    if (!(await this.sonarrClient.supportsProfileQualitySizes())) {
      return super.persist(serverDefinitions, configuredDefinitions, write);
    }

    const { changeMap, restData } = this.calculateDiff(serverDefinitions, configuredDefinitions);
    for (const [name, changes] of changeMap) {
      const remainingChanges = changes.filter((change) => !profileSizeFields.has(change.field));
      if (remainingChanges.length === 0) {
        changeMap.delete(name);
      } else {
        changeMap.set(name, remainingChanges);
      }
    }

    if (changeMap.size > 0 && write) {
      return { changeMap, restData: await this.updateOnServer(restData) };
    }
    return { changeMap, restData };
  }
}
