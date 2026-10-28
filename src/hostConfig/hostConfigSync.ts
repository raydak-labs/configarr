import { getEnvs } from "../env";
import { SECRET_MASK } from "../diffReport/redactSecrets";
import type { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import type { InputConfigArrInstance } from "../types/config.types";
import { ConfigValidationError } from "../validation";

export type HostConfig = NonNullable<InputConfigArrInstance["host_config"]>;

type HostResource = {
  id?: number;
  authenticationMethod?: string;
  authenticationRequired?: string;
  allowedHosts?: string | null;
  oidcAuthority?: string | null;
  oidcClientId?: string | null;
  oidcUserIdentifier?: string | null;
  oidcScopes?: string | null;
  oidcClientSecret?: string | null;
  enableSsl?: boolean;
  sslCertPath?: string | null;
  sslKeyPath?: string | null;
  whisparrAutoMatchOnDate?: boolean;
  whisparrCorruptFileDetection?: boolean;
};
type HostClient<T extends HostResource> = {
  getHostConfig(): Promise<T>;
  updateHostConfig(id: string, data: T): Promise<void>;
};
const fields = [
  "authenticationMethod",
  "authenticationRequired",
  "allowedHosts",
  "oidcAuthority",
  "oidcClientId",
  "oidcUserIdentifier",
  "oidcScopes",
  "enableSsl",
  "sslCertPath",
  "sslKeyPath",
  "whisparrAutoMatchOnDate",
  "whisparrCorruptFileDetection",
] as const;

export async function syncHostConfig<T extends HostResource>(
  client: HostClient<T>,
  config: Partial<T>,
  rotateSecret = false,
): Promise<DiffEntry[]> {
  const current = await client.getHostConfig();
  const changes: FieldChange[] = [];
  let next = { ...current };
  for (const field of fields) {
    const value = config[field];
    if (value !== undefined && value !== current[field]) {
      changes.push({ field, from: current[field], to: value });
      next = { ...next, [field]: value };
    }
  }
  if (
    config.oidcClientSecret !== undefined &&
    (rotateSecret || (current.oidcClientSecret !== SECRET_MASK && current.oidcClientSecret !== config.oidcClientSecret))
  ) {
    changes.push({ field: "oidcClientSecret", from: SECRET_MASK, to: SECRET_MASK });
    next = { ...next, oidcClientSecret: config.oidcClientSecret };
  }
  if (!changes.length) return [];
  if (current.id == null) throw new Error("Host settings are missing an id");
  if (!getEnvs().DRY_RUN) await client.updateHostConfig(String(current.id), next);
  return [{ resourceType: "HostConfig", name: "General", action: "update", fieldChanges: changes }];
}

export abstract class HostConfigSync<T extends HostResource> {
  constructor(
    protected readonly client: HostClient<T>,
    private readonly minimumMajor: number,
  ) {}

  protected abstract map(config: HostConfig): { data: Partial<T>; rotateSecret?: boolean };

  validate(config: HostConfig, version: string | undefined | null): void {
    if (config.whisparrAutoMatchOnDate !== undefined || config.whisparrCorruptFileDetection !== undefined) {
      throw new ConfigValidationError("Whisparr host settings are not supported by Radarr or Sonarr");
    }
    const major = Number(version?.split(".")[0]);
    if (!(major >= this.minimumMajor)) throw new ConfigValidationError("host_config requires Radarr v7 or Sonarr v5");
    if (config.oidcClientSecret === SECRET_MASK) throw new ConfigValidationError("oidcClientSecret cannot be the masked placeholder");
    if (config.update_oidc_client_secret && config.oidcClientSecret === undefined) {
      throw new ConfigValidationError("update_oidc_client_secret requires oidcClientSecret");
    }
    this.map(config);
  }

  sync(config: HostConfig): Promise<DiffEntry[]> {
    const { data, rotateSecret } = this.map(config);
    return syncHostConfig(this.client, data, rotateSecret);
  }
}
