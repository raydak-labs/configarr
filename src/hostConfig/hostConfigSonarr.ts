import { AuthenticationType, AuthenticationRequiredType } from "../__generated__/sonarr-v5/data-contracts";
import type { GeneralSettingsResource } from "../__generated__/sonarr-v5/data-contracts";
import type { SonarrClient } from "../clients/sonarr-client";
import { toEnumOrThrow } from "../util";
import { HostConfigSync } from "./hostConfigSync";
import type { HostConfig } from "./hostConfigSync";

function mapSonarrHostConfig(config: HostConfig) {
  const { update_oidc_client_secret, authenticationMethod, authenticationRequired, ...fields } = config;
  const data: Partial<GeneralSettingsResource> = {
    ...fields,
    ...(authenticationMethod === undefined
      ? {}
      : { authenticationMethod: toEnumOrThrow(AuthenticationType, authenticationMethod, "authenticationMethod") }),
    ...(authenticationRequired === undefined
      ? {}
      : { authenticationRequired: toEnumOrThrow(AuthenticationRequiredType, authenticationRequired, "authenticationRequired") }),
  };
  return { data, rotateSecret: update_oidc_client_secret };
}

export class SonarrHostConfigSync extends HostConfigSync<GeneralSettingsResource> {
  constructor(client: SonarrClient) {
    super(client, 5);
  }

  protected map(config: HostConfig) {
    return mapSonarrHostConfig(config);
  }
}
