import { logger } from "./logger";
import { InputConfigDownloadClient } from "./types/config.types";
import type { MergedDownloadClientResource } from "./__generated__/mergedTypes";
import type { IArrClient } from "./clients/unified-client";

type DownloadClientField = { name: string; value?: unknown };

const SENSITIVE_FIELDS = new Set(["apiKey", "password", "api_key"]);

function stripSensitiveFields(fields: DownloadClientField[]): DownloadClientField[] {
  return fields.filter((f) => !SENSITIVE_FIELDS.has(f.name));
}

function findServerClient(
  current: MergedDownloadClientResource[],
  desired: InputConfigDownloadClient,
): MergedDownloadClientResource | undefined {
  return current.find((c) => c.name === desired.name && c.implementation === desired.implementation);
}

function areFieldsEqual(serverFields: DownloadClientField[], desiredFields: DownloadClientField[]): boolean {
  const serverMap = new Map(serverFields.map((f) => [f.name, f.value]));
  const desiredMap = new Map(desiredFields.map((f) => [f.name, f.value]));

  if (serverMap.size !== desiredMap.size) return false;

  for (const [name, serverValue] of serverMap) {
    if (!desiredMap.has(name)) return false;
    if (JSON.stringify(serverValue) !== JSON.stringify(desiredMap.get(name))) return false;
  }

  return true;
}

function areTagsEqual(serverTags: number[], desiredTags: number[]): boolean {
  if (serverTags.length !== desiredTags.length) return false;
  return [...serverTags].sort().join(",") === [...desiredTags].sort().join(",");
}

function hasClientChanged(current: MergedDownloadClientResource, desired: InputConfigDownloadClient): boolean {
  if (desired.enable !== undefined && current.enable !== desired.enable) return true;
  if (desired.priority !== undefined && current.priority !== desired.priority) return true;
  if (desired.protocol !== undefined && current.protocol !== desired.protocol) return true;
  if (desired.removeCompletedDownloads !== undefined && current.removeCompletedDownloads !== desired.removeCompletedDownloads) return true;
  if (desired.removeFailedDownloads !== undefined && current.removeFailedDownloads !== desired.removeFailedDownloads) return true;
  if (desired.configContract !== undefined && current.configContract !== desired.configContract) return true;
  if (desired.implementationName !== undefined && current.implementationName !== desired.implementationName) return true;
  if (desired.infoLink !== undefined && current.infoLink !== desired.infoLink) return true;

  if (desired.tags !== undefined) {
    const currentTags = (current.tags ?? []) as number[];
    const desiredTags = (desired.tags ?? []) as unknown as number[];
    if (!areTagsEqual(currentTags, desiredTags)) return true;
  }

  if (desired.fields !== undefined) {
    const currentFields = stripSensitiveFields((current.fields ?? []) as DownloadClientField[]);
    const desiredFields = stripSensitiveFields(desired.fields);
    if (!areFieldsEqual(currentFields, desiredFields)) return true;
  }

  return false;
}

export type DownloadClientsDiff = {
  toCreate: InputConfigDownloadClient[];
  toUpdate: { id: number; data: MergedDownloadClientResource }[];
};

export function calculateDownloadClientsDiff(
  current: MergedDownloadClientResource[],
  desired: InputConfigDownloadClient[],
): DownloadClientsDiff | undefined {
  const toCreate: InputConfigDownloadClient[] = [];
  const toUpdate: { id: number; data: MergedDownloadClientResource }[] = [];

  for (const desiredClient of desired) {
    const serverClient = findServerClient(current, desiredClient);

    if (!serverClient) {
      toCreate.push(desiredClient);
      continue;
    }

    if (hasClientChanged(serverClient, desiredClient)) {
      toUpdate.push({
        id: serverClient.id!,
        data: { ...serverClient, ...desiredClient } as MergedDownloadClientResource,
      });
    } else {
      logger.info(`DownloadClient unchanged: ${desiredClient.name} (${desiredClient.implementation})`);
    }
  }

  if (toCreate.length === 0 && toUpdate.length === 0) {
    return undefined;
  }

  return { toCreate, toUpdate };
}

export async function applyDownloadClients(
  api: IArrClient<any, any, any, any>,
  diff: DownloadClientsDiff | undefined,
  dryRun: boolean,
): Promise<void> {
  if (!diff) {
    return;
  }

  for (const client of diff.toCreate) {
    if (dryRun) {
      logger.info(`DryRun: Would create DownloadClient: ${client.name} (${client.implementation})`);
    } else {
      logger.info(`Creating DownloadClient: ${client.name} (${client.implementation})`);
      try {
        await api.createDownloadClient(client);
      } catch (error: any) {
        logger.error(`Failed creating DownloadClient (${client.name})`);
        throw error;
      }
    }
  }

  for (const { id, data } of diff.toUpdate) {
    if (dryRun) {
      logger.info(`DryRun: Would update DownloadClient: ${data.name} (id=${id})`);
    } else {
      logger.info(`Updating DownloadClient: ${data.name} (id=${id})`);
      try {
        await api.updateDownloadClient(String(id), data);
      } catch (error: any) {
        logger.error(`Failed updating DownloadClient (${data.name})`);
        throw error;
      }
    }
  }
}
