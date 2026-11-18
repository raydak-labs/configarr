import { AuthenticationRequiredType, AuthenticationType } from "../__generated__/sonarr-v5/data-contracts";
import type { SonarrClient } from "../clients/sonarr-client";
import type { SonarrHostConfigResource } from "../clients/sonarr-resource-mapper";
import { toEnumOrThrow } from "../util";
import type { HostConfig } from "./hostConfigSync";
import { HostConfigSync } from "./hostConfigSync";

function mapSonarrHostConfig(config: HostConfig) {
  // Backup settings are mapped by the base class; the remaining keys are host API fields.
  const {
    update_oidc_client_secret,
    backup_folder,
    backup_interval,
    backup_retention,
    authenticationMethod,
    authenticationRequired,
    ...fields
  } = config;
  const data: Partial<SonarrHostConfigResource> = {
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

export class SonarrHostConfigSync extends HostConfigSync<SonarrHostConfigResource> {
  constructor(client: SonarrClient) {
    super(client, 5, "Sonarr");
  }

  protected map(config: HostConfig) {
    return mapSonarrHostConfig(config);
  }
}
