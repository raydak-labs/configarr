import type { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { SECRET_MASK } from "../diffReport/redactSecrets";
import { getEnvs } from "../env";
import type { InputConfigArrInstance } from "../types/config.types";
import { ConfigValidationError } from "../validation";

export type HostConfig = NonNullable<InputConfigArrInstance["host_config"]>;

export type HostResource = {
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
  backupFolder?: string | null;
  backupInterval?: number;
  backupRetention?: number;
};
export type HostClient<T extends HostResource> = {
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
  "backupFolder",
  "backupInterval",
  "backupRetention",
] as const;

const backupFields = {
  backup_folder: "backupFolder",
  backup_interval: "backupInterval",
  backup_retention: "backupRetention",
} as const;

type BackupConfigField = keyof typeof backupFields;

function isBackupConfigField(key: string): key is BackupConfigField {
  return key in backupFields;
}

/** Backup settings exist on every *arr and are independent of the Radarr v7 / Sonarr v5 authentication API. */
export function hasAuthenticationSettings(config: HostConfig): boolean {
  return Object.keys(config).some((key) => !isBackupConfigField(key));
}

export function mapBackupFields(config: HostConfig): Pick<HostResource, "backupFolder" | "backupInterval" | "backupRetention"> {
  const mapped: Pick<HostResource, "backupFolder" | "backupInterval" | "backupRetention"> = {};
  if (config.backup_folder !== undefined) mapped.backupFolder = config.backup_folder;
  if (config.backup_interval !== undefined) mapped.backupInterval = config.backup_interval;
  if (config.backup_retention !== undefined) mapped.backupRetention = config.backup_retention;
  return mapped;
}

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
    // `null` marks an app whose host API has no authentication settings (Lidarr, Readarr, Prowlarr).
    private readonly authenticationMinimumMajor: number | null,
    private readonly appLabel: string,
  ) {}

  protected abstract map(config: HostConfig): { data: Partial<T>; rotateSecret?: boolean };

  validate(config: HostConfig, version: string | undefined | null): void {
    if (config.whisparrAutoMatchOnDate !== undefined || config.whisparrCorruptFileDetection !== undefined) {
      throw new ConfigValidationError("Whisparr host settings are not supported by Radarr or Sonarr");
    }
    if (this.authenticationMinimumMajor === null) {
      const unsupported = Object.keys(config).filter((key) => !isBackupConfigField(key));
      if (unsupported.length) {
        throw new ConfigValidationError(`${this.appLabel} host_config supports only backup_folder, backup_interval and backup_retention`);
      }
    } else if (hasAuthenticationSettings(config)) {
      const major = Number(version?.split(".")[0]);
      if (!(major >= this.authenticationMinimumMajor)) throw new ConfigValidationError("host_config requires Radarr v7 or Sonarr v5");
    }
    if (config.oidcClientSecret === SECRET_MASK) throw new ConfigValidationError("oidcClientSecret cannot be the masked placeholder");
    if (config.update_oidc_client_secret && config.oidcClientSecret === undefined) {
      throw new ConfigValidationError("update_oidc_client_secret requires oidcClientSecret");
    }
    this.map(config);
  }

  sync(config: HostConfig): Promise<DiffEntry[]> {
    const { data, rotateSecret } = this.map(config);
    return syncHostConfig(this.client, { ...mapBackupFields(config), ...data }, rotateSecret);
  }
}

/**
 * Host settings sync for apps whose host API has no authentication settings. Only the
 * backup policy is managed; every version of these apps exposes it.
 */
export class BackupHostConfigSync<T extends HostResource> extends HostConfigSync<T> {
  constructor(client: HostClient<T>, appLabel: string) {
    super(client, null, appLabel);
  }

  protected map() {
    return { data: {} as Partial<T> };
  }
}
