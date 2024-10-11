import { KyHttpClient } from "./__generated__/ky-client";
import { Api as RadarrApi } from "./__generated__/radarr/Api";
import { Api as SonarrApi } from "./__generated__/sonarr/Api";
import { logger } from "./logger";
import { ArrType } from "./types";

let sonarrClient: SonarrApi<unknown> | undefined;
let radarrClient: RadarrApi<unknown> | undefined;

export const unsetApi = () => {
  sonarrClient = undefined;
  radarrClient = undefined;
};

export const getArrApi = (): SonarrApi<unknown> | RadarrApi<unknown> => {
  const client = sonarrClient || radarrClient;

  if (client) {
    return client;
  }

  throw new Error("Please configure API first.");
};

export const getSonarrApi = () => {
  if (sonarrClient) {
    return sonarrClient;
  }

  throw new Error("Please configure API first.");
};

const validateParams = (url: string, apiKey: string, arrType: ArrType) => {
  const arrLabel = arrType === "RADARR" ? "Radarr" : "Sonarr";

  if (!url) {
    const message = `URL not correctly configured for ${arrLabel} API!`;
    logger.error(message);
    throw new Error(message);
  }
  if (!apiKey) {
    const message = `API Key not correctly configured for ${arrLabel} API!`;
    logger.error(message);
    throw new Error(message);
  }
};

const handleErrorApi = (error: any, arrType: ArrType) => {
  let message;
  const arrLabel = arrType === "RADARR" ? "Radarr" : "Sonarr";
  const causeError = error?.cause?.message || error?.cause?.errors?.map((e: any) => e.message).join(";") || undefined;

  const errorMessage = (error.message && `Message: ${error.message}`) || "";
  const causeMessage = (causeError && `- Cause: ${causeError}`) || "";

  logger.error(`Error configuring ${arrLabel} API. ${errorMessage} ${causeMessage}`);

  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    message = `Unable to retrieve data from ${arrLabel} API. Server responded with status code ${error.response.status}: ${error.response.statusText}. Please check the API server status or your request parameters.`;
  } else {
    // Something happened in setting up the request that triggered an Error
    message = `An unexpected error occurred while setting up the ${arrLabel} request: ${errorMessage} ${causeMessage}. Please try again.`;
  }

  throw new Error(message);
};

export const configureSonarrApi = async (url: string, apiKey: string) => {
  unsetApi();
  validateParams(url, apiKey, "SONARR");

  const httpClient = new KyHttpClient({
    headers: {
      "X-Api-Key": apiKey,
    },
    prefixUrl: url,
  });
  const api = new SonarrApi(httpClient);

  sonarrClient = api;

  try {
    await sonarrClient.v3MetadataList();
  } catch (error: any) {
    handleErrorApi(error, "SONARR");
  }

  return sonarrClient;
};

export const getRadarrpi = () => {
  if (radarrClient) {
    return radarrClient;
  }

  throw new Error("Please configure API first.");
};

export const configureRadarrApi = async (url: string, apiKey: string) => {
  unsetApi();
  validateParams(url, apiKey, "RADARR");

  const httpClient = new KyHttpClient({
    headers: {
      "X-Api-Key": apiKey,
    },
    prefixUrl: url,
  });
  const api = new RadarrApi(httpClient);

  radarrClient = api;

  try {
    await radarrClient.v3MetadataList();
  } catch (error: any) {
    handleErrorApi(error, "RADARR");
  }

  return radarrClient;
};
