import type { WhisparrClient } from "../clients/whisparr-client";
import { ConfigValidationError } from "../validation";
import type { HostConfig } from "./hostConfigSync";
import { mapBackupFields, syncHostConfig } from "./hostConfigSync";

const whisparrFields = ["whisparrAutoMatchOnDate", "whisparrCorruptFileDetection"] as const;
const backupFields = ["backup_folder", "backup_interval", "backup_retention"] as const;
const allowed = new Set<string>([...whisparrFields, ...backupFields]);

export class WhisparrHostConfigSync {
  constructor(private readonly client: WhisparrClient) {}

  validate(config: HostConfig, version: string | undefined | null): void {
    const major = Number(version?.split(".")[0]);
    const requiresV3 = whisparrFields.some((field) => config[field] !== undefined);
    if (requiresV3 && major !== 3) throw new ConfigValidationError("Whisparr host_config requires Whisparr v3");
    const unsupported = Object.keys(config).filter((key) => !allowed.has(key));
    if (unsupported.length) throw new ConfigValidationError(`Unsupported Whisparr host_config fields: ${unsupported.join(", ")}`);
  }

  async sync(config: HostConfig) {
    const current = await this.client.getHostConfig();
    for (const field of whisparrFields) {
      if (config[field] !== undefined && typeof current[field] !== "boolean") {
        throw new ConfigValidationError(`Whisparr does not expose host setting '${field}'`);
      }
    }
    return syncHostConfig(this.client, {
      ...mapBackupFields(config),
      whisparrAutoMatchOnDate: config.whisparrAutoMatchOnDate,
      whisparrCorruptFileDetection: config.whisparrCorruptFileDetection,
    });
  }
}
