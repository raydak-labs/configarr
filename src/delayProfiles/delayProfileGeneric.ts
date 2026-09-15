import { Tag } from "../tags/tag.types";
import { getClient } from "../clients/client";
import { logger } from "../logger";
import { InputConfigDelayProfile } from "../types/config.types";
import {
  calculateDelayProfilesDiffFor,
  compareGenericDelayProfileFields,
  delayProfileSharedFields,
  mapDelayProfileTags,
  splitServerDelayProfiles,
} from "./delayProfileBase";
import { DelayProfileGenericArrType, DelayProfileGenericResource } from "./delayProfile.types";

export class DelayProfileGenericSync {
  constructor(private arrType: DelayProfileGenericArrType) {}

  loadFromServer() {
    return getClient(this.arrType).getDelayProfiles();
  }

  createOnServer(profile: DelayProfileGenericResource) {
    return getClient(this.arrType).createDelayProfile(profile);
  }

  updateOnServer(id: string, profile: DelayProfileGenericResource) {
    return getClient(this.arrType).updateDelayProfile(id, profile);
  }

  deleteOnServer(id: string) {
    return getClient(this.arrType).deleteDelayProfile(id);
  }

  mapToServer(profile: InputConfigDelayProfile, serverTags: Tag[]): DelayProfileGenericResource {
    return {
      ...delayProfileSharedFields(profile, mapDelayProfileTags(profile, serverTags)),
      enableUsenet: profile.enableUsenet,
      enableTorrent: profile.enableTorrent,
      preferredProtocol: profile.preferredProtocol ?? "usenet",
      usenetDelay: profile.usenetDelay,
      torrentDelay: profile.torrentDelay,
    };
  }

  async calculateDiff(delayProfilesObj: { default?: InputConfigDelayProfile; additional?: InputConfigDelayProfile[] }, tags: Tag[]) {
    const serverData = await this.loadFromServer();
    return calculateDelayProfilesDiffFor(delayProfilesObj, tags, serverData, compareGenericDelayProfileFields);
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
