import type { WhisparrClient } from "../clients/whisparr-client";
import type { HostConfig } from "./hostConfigSync";
import { syncHostConfig } from "./hostConfigSync";
import { ConfigValidationError } from "../validation";

export class WhisparrHostConfigSync {
  constructor(private readonly client: WhisparrClient) {}

  validate(config: HostConfig, version: string | undefined | null): void {
    if (Number(version?.split(".")[0]) !== 3) throw new ConfigValidationError("Whisparr host_config requires Whisparr v3");
    const allowed = new Set(["whisparrAutoMatchOnDate", "whisparrCorruptFileDetection"]);
    const unsupported = Object.keys(config).filter((key) => !allowed.has(key));
    if (unsupported.length) throw new ConfigValidationError(`Unsupported Whisparr host_config fields: ${unsupported.join(", ")}`);
  }

  async sync(config: HostConfig) {
    const current = await this.client.getHostConfig();
    for (const field of ["whisparrAutoMatchOnDate", "whisparrCorruptFileDetection"] as const) {
      if (config[field] !== undefined && typeof current[field] !== "boolean") {
        throw new ConfigValidationError(`Whisparr does not expose host setting '${field}'`);
      }
    }
    return syncHostConfig(this.client, {
      whisparrAutoMatchOnDate: config.whisparrAutoMatchOnDate,
      whisparrCorruptFileDetection: config.whisparrCorruptFileDetection,
    });
  }
}
