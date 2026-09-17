// those must be run first!
import "dotenv/config";
import { getBuildInfo, getEnvs, initEnvs } from "./env";
initEnvs();

import { LidarrSyncer } from "./arr/lidarrSyncer";
import { ProwlarrSyncer } from "./arr/prowlarrSyncer";
import { RadarrSyncer } from "./arr/radarrSyncer";
import { ReadarrSyncer } from "./arr/readarrSyncer";
import { SonarrSyncer } from "./arr/sonarrSyncer";
import { WhisparrSyncer } from "./arr/whisparrSyncer";
import { configureApi, unsetApi } from "./clients/client";
import { getConfig } from "./config";
import { ConsoleDiffFormatter } from "./diffReport/formatters/consoleFormatter";
import { writeJsonDiffReport } from "./diffReport/formatters/jsonFormatter";
import { InstanceDiffReport } from "./diffReport/diffReport.types";
import { logger, logHeading, logInstanceHeading } from "./logger";
import { cloneRecyclarrTemplateRepo } from "./recyclarr-importer";
import { getTelemetryInstance, Telemetry } from "./telemetry";
import { cloneTrashRepo } from "./trash-guide";
import { ArrType } from "./types/common.types";
import { InputConfigArrInstance } from "./types/config.types";
import { ConfigValidationError } from "./validation";

/**
 * Shared instance loop: skip disabled instances, run `runInstance` against each one,
 * and tally success / failure / skipped while honouring STOP_ON_ERROR.
 */
const runInstances = async <TInstance extends { base_url: string; api_key: string; enabled?: boolean }>(
  arrType: ArrType,
  entries: Record<string, TInstance> | undefined,
  runInstance: (instance: TInstance, instanceName: string) => Promise<InstanceDiffReport>,
) => {
  const status = {
    success: 0,
    failure: 0,
    skipped: 0,
  };
  const reports: InstanceDiffReport[] = [];

  if (!entries || typeof entries !== "object" || Object.keys(entries).length === 0) {
    logHeading(`No ${arrType} instances defined.`);
    return { status, reports };
  }

  logHeading(`Processing ${arrType} ...`);

  for (const [instanceName, instance] of Object.entries(entries)) {
    logInstanceHeading(`Processing ${arrType} Instance: ${instanceName} ...`);

    if (instance.enabled === false) {
      logger.info(`Instance ${arrType} - ${instanceName} is disabled!`);
      status.skipped++;
      continue;
    }

    try {
      await configureApi(arrType, instance.base_url, instance.api_key);
      const report = await runInstance(instance, instanceName);
      new ConsoleDiffFormatter().format(report);
      reports.push(report);
      status.success++;
    } catch (err: any) {
      logger.error(
        `Failure during configuring: ${arrType} - ${instanceName} (Detailed logs with env var: LOG_STACKTRACE=true). Error: ${err?.message}`,
      );
      status.failure++;
      if (getEnvs().LOG_STACKTRACE) {
        logger.error(err);
      }
      if (getEnvs().STOP_ON_ERROR || (err instanceof ConfigValidationError && getEnvs().CONFIGARR_ENFORCE_CONFIG_VALIDATION)) {
        throw err;
      }
    } finally {
      unsetApi();
    }

    logger.info("");
  }

  return { status, reports };
};

const run = async () => {
  logger.info(`Support the project: https://ko-fi.com/blackdark93 - Star on Github! https://github.com/raydak-labs/configarr`);
  logger.info(`Configarr Version: ${getEnvs().CONFIGARR_VERSION}`);

  const buildInfo = getBuildInfo();
  const shaDisplay = buildInfo.githubSha ? buildInfo.githubSha.slice(0, 7) : "unknown";
  logger.debug(`Build Info: ${buildInfo.buildTime || "unknown"} | ${shaDisplay} | (run id) ${buildInfo.githubRunId || "unknown"}`);

  if (getEnvs().DRY_RUN) {
    logger.info("DryRun: Running in dry-run mode!");
  }

  const globalConfig = getConfig();

  await cloneRecyclarrTemplateRepo();
  await cloneTrashRepo();

  const totalStatus: string[] = [];

  const disabledArrs: string[] = [];

  const allReports: InstanceDiffReport[] = [];

  const runEnabled = async <TInstance extends { base_url: string; api_key: string; enabled?: boolean }>(
    arrType: ArrType,
    enabled: boolean | undefined,
    entries: Record<string, TInstance> | undefined,
    runInstance: (instance: TInstance, instanceName: string) => Promise<InstanceDiffReport>,
  ) => {
    if (enabled == null || enabled) {
      const result = await runInstances(arrType, entries, runInstance);
      totalStatus.push(`${arrType}: (${result.status.success}/${result.status.failure}/${result.status.skipped})`);
      allReports.push(...result.reports);
    } else {
      logger.debug(`${arrType} disabled in config`);
      disabledArrs.push(arrType);
    }
  };

  // Initialize telemetry
  if (Telemetry.isEnabled({ enabled: globalConfig.telemetry })) {
    const allInstances: Record<string, InputConfigArrInstance[]> = {};
    const telemetryArrs: { type: ArrType; config: Record<string, InputConfigArrInstance> | undefined }[] = [
      { type: "SONARR", config: globalConfig.sonarr },
      { type: "RADARR", config: globalConfig.radarr },
      { type: "WHISPARR", config: globalConfig.whisparr },
      { type: "READARR", config: globalConfig.readarr },
      { type: "LIDARR", config: globalConfig.lidarr },
    ];
    for (const { type, config } of telemetryArrs) {
      allInstances[type] = config ? Object.values(config) : [];
    }

    getTelemetryInstance().trackFeatureUsage(globalConfig, allInstances);
  }

  await runEnabled("SONARR", globalConfig.sonarrEnabled, globalConfig.sonarr, (instance, name) =>
    new SonarrSyncer().run(globalConfig, instance, name),
  );
  await runEnabled("RADARR", globalConfig.radarrEnabled, globalConfig.radarr, (instance, name) =>
    new RadarrSyncer().run(globalConfig, instance, name),
  );
  await runEnabled("WHISPARR", globalConfig.whisparrEnabled, globalConfig.whisparr, (instance, name) =>
    new WhisparrSyncer().run(globalConfig, instance, name),
  );
  await runEnabled("READARR", globalConfig.readarrEnabled, globalConfig.readarr, (instance, name) =>
    new ReadarrSyncer().run(globalConfig, instance, name),
  );
  await runEnabled("LIDARR", globalConfig.lidarrEnabled, globalConfig.lidarr, (instance, name) =>
    new LidarrSyncer().run(globalConfig, instance, name),
  );
  await runEnabled("PROWLARR", globalConfig.prowlarrEnabled, globalConfig.prowlarr, (instance, name) =>
    new ProwlarrSyncer().run(instance, name),
  );

  logger.info(``);
  if (disabledArrs.length > 0) {
    logger.info(`Disabled Arrs: ${disabledArrs.join(", ")}`);
  }
  logger.info(`Execution Summary (success/failure/skipped) instances: ${totalStatus.join(" - ")}`);

  const diffOutputFile = getEnvs().CONFIGARR_DIFF_OUTPUT_FILE;
  if (diffOutputFile) {
    try {
      writeJsonDiffReport(diffOutputFile, allReports, getEnvs().DRY_RUN);
      logger.info(`Diff report written to ${diffOutputFile}`);
    } catch (err: any) {
      logger.error(`Failed to write diff report to ${diffOutputFile}: ${err.message}`);
    }
  }

  if (Telemetry.isEnabled()) {
    await getTelemetryInstance().finalizeTracking();
  }
};

run();
