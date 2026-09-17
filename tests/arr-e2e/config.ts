/**
 * Config fragments that are identical for every *arr. Anything that differs per *arr
 * (quality profiles, quality definitions, delay profiles, root folders, metadata profiles)
 * is written out literally in that *arr's own test file.
 */
import type { ArrType, MediaArrType } from "../../src/types/common.types";

export const E2E_API_KEY = "e2etestapikey0123456789abcdef012";
export const E2E_ROOT_A = "/data/e2e";
export const E2E_ROOT_B = "/data/e2e-b";

const DEFAULT_BASE_URL: Record<ArrType, string> = {
  SONARR: "http://127.0.0.1:18989",
  RADARR: "http://127.0.0.1:17878",
  WHISPARR: "http://127.0.0.1:16969",
  READARR: "http://127.0.0.1:18787",
  LIDARR: "http://127.0.0.1:18686",
  PROWLARR: "http://127.0.0.1:19696",
};

/** `<ARR>_BASE_URL` / `<ARR>_API_KEY` env override, else the compose defaults. */
export function arrConnection(kind: ArrType): { baseUrl: string; apiKey: string } {
  return {
    baseUrl: process.env[`${kind}_BASE_URL`] ?? DEFAULT_BASE_URL[kind],
    apiKey: process.env[`${kind}_API_KEY`] ?? E2E_API_KEY,
  };
}

export function e2eCustomFormatDefinition(value = "e2e-release"): Record<string, unknown> {
  return {
    trash_id: "e2e-rt",
    name: "e2e-rt",
    includeCustomFormatWhenRenaming: false,
    specifications: [
      {
        name: "e2e-title",
        implementation: "ReleaseTitleSpecification",
        negate: false,
        required: true,
        fields: { value },
      },
    ],
  };
}

/** Assigns the local `e2e-rt` definition without scoring it into a profile. */
export function cfAssignBlock(): Record<string, unknown>[] {
  return [{ trash_ids: ["e2e-rt"] }];
}

export function e2eMediaSettings(firstDayOfWeek = 1): Record<string, unknown> {
  return {
    media_management: { recycleBin: "/tmp" },
    media_naming_api: { replaceIllegalCharacters: true },
    ui_config: { firstDayOfWeek },
  };
}

export function downloadClientConfigBlock(enableCompletedDownloadHandling: boolean): Record<string, unknown> {
  return { enable_completed_download_handling: enableCompletedDownloadHandling };
}

export function instanceConnection(kind: MediaArrType): { base_url: string; api_key: string } {
  const { baseUrl, apiKey } = arrConnection(kind);
  return { base_url: baseUrl, api_key: apiKey };
}

export function prowlarrConnection(): { base_url: string; api_key: string } {
  const { baseUrl, apiKey } = arrConnection("PROWLARR");
  return { base_url: baseUrl, api_key: apiKey };
}

/** `{ sonarr: { e2e: { <connection>, ...instance } } }` */
export function mediaInstance(kind: MediaArrType, instance: Record<string, unknown> = {}): Record<string, Record<string, unknown>> {
  return {
    [kind.toLowerCase()]: {
      e2e: {
        ...instanceConnection(kind),
        ...instance,
      },
    },
  };
}

/** One media instance plus optional root-level keys such as `customFormatDefinitions`. */
export function mediaConfig(
  kind: MediaArrType,
  instance: Record<string, unknown> = {},
  root: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    telemetry: false,
    ...root,
    ...mediaInstance(kind, instance),
  };
}
