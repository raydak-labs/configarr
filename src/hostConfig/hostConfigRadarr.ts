import type { HostConfigResource } from "../__generated__/radarr/data-contracts";
import { AuthenticationRequiredType, AuthenticationType } from "../__generated__/radarr/data-contracts";
import type { RadarrClient } from "../clients/radarr-client";
import { toEnumOrThrow } from "../util";
import type { HostConfig } from "./hostConfigSync";
import { HostConfigSync } from "./hostConfigSync";

function mapRadarrHostConfig(config: HostConfig) {
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
  const data: Partial<HostConfigResource> = {
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

export class RadarrHostConfigSync extends HostConfigSync<HostConfigResource> {
  constructor(client: RadarrClient) {
    super(client, 7, "Radarr");
  }

  protected map(config: HostConfig) {
    return mapRadarrHostConfig(config);
  }
}
