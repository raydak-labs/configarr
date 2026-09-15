import { Tag } from "../tags/tag.types";
import { getClient } from "../clients/client";
import { logger } from "../logger";
import { InputConfigDelayProfile } from "../types/config.types";
import {
  calculateDelayProfilesDiffFor,
  compareLidarrDelayProfileFields,
  delayProfileSharedFields,
  mapDelayProfileTags,
  splitServerDelayProfiles,
} from "./delayProfileBase";
import { DelayProfileLidarrResource } from "./delayProfile.types";

export class DelayProfileLidarrSync {
  loadFromServer() {
    return getClient("LIDARR").getDelayProfiles();
  }

  createOnServer(profile: DelayProfileLidarrResource) {
    return getClient("LIDARR").createDelayProfile(profile);
  }

  updateOnServer(id: string, profile: DelayProfileLidarrResource) {
    return getClient("LIDARR").updateDelayProfile(id, profile);
  }

  deleteOnServer(id: string) {
    return getClient("LIDARR").deleteDelayProfile(id);
  }

  mapToServer(profile: InputConfigDelayProfile, serverTags: Tag[]): DelayProfileLidarrResource {
    return {
      ...delayProfileSharedFields(profile, mapDelayProfileTags(profile, serverTags)),
      items: (profile.items ?? []).map((item) => ({
        name: item.name,
        protocol: item.protocol,
        allowed: item.allowed,
        delay: item.delay,
      })),
    };
  }

  async calculateDiff(delayProfilesObj: { default?: InputConfigDelayProfile; additional?: InputConfigDelayProfile[] }, tags: Tag[]) {
    const serverData = await this.loadFromServer();
    return calculateDelayProfilesDiffFor(delayProfilesObj, tags, serverData, compareLidarrDelayProfileFields);
  }

  async deleteAdditional() {
    const serverData = await this.loadFromServer();
    const { additional: serverAdditional = [] } = splitServerDelayProfiles(serverData);

    for (const p of serverAdditional) {
      await this.deleteOnServer(p.id + "");
      logger.info(`Deleted Delay Profile: '${p.id}'`);
    }
  }

  async updateDefaultFromConfig(profile: InputConfigDelayProfile, tags: Tag[]) {
    await this.updateOnServer("1", this.mapToServer(profile, tags));
  }

  async createFromConfig(profile: InputConfigDelayProfile, tags: Tag[]) {
    return this.createOnServer(this.mapToServer(profile, tags));
  }

  async recreateAdditionalFromConfig(profiles: InputConfigDelayProfile[], tags: Tag[]) {
    await this.deleteAdditional();
    for (const profile of profiles) {
      await this.createOnServer(this.mapToServer(profile, tags));
    }
  }
}
