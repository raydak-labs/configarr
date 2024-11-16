import { KyHttpClient } from "./__generated__/ky-client";
import { Api as RadarrApi } from "./__generated__/radarr/Api";
import { Api as SonarrApi } from "./__generated__/sonarr/Api";
import { Api as WhisparrApi } from "./__generated__/whisparr/Api";
import { logger } from "./logger";
import { ArrType } from "./types/common.types";

let sonarrClient: SonarrApi<unknown> | undefined;
let radarrClient: RadarrApi<unknown> | undefined;
let whisparrClient: WhisparrApi<unknown> | undefined;

export const unsetApi = () => {
  sonarrClient = undefined;
  radarrClient = undefined;
  whisparrClient = undefined;
};

export const getArrApi = (): SonarrApi<unknown> | RadarrApi<unknown> | WhisparrApi<unknown> => {
  const client = sonarrClient || radarrClient || whisparrClient;

  if (client) {
    return client;
  }

  throw new Error("Please configure API first.");
};

const validateParams = (url: string, apiKey: string, arrType: ArrType) => {
  const arrLabel = arrType.toLowerCase();

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
  const arrLabel = arrType.toLowerCase();
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

export const configureApi = async (type: ArrType, url: string, apiKey: string) => {
  unsetApi();
  validateParams(url, apiKey, type);

  const httpClient = new KyHttpClient({
    headers: {
      "X-Api-Key": apiKey,
    },
    prefixUrl: url,
  });

  let api;

  switch (type) {
    case "SONARR":
      api = new SonarrApi(httpClient);
      sonarrClient = api;
      break;
    case "RADARR":
      api = new RadarrApi(httpClient);
      radarrClient = api;
      break;
    case "WHISPARR":
      api = new WhisparrApi(httpClient);
      whisparrClient = api;
      break;
    default:
      throw new Error(`Invalid API type: ${type}`);
  }

  try {
    await api.v3MetadataList();
  } catch (error: any) {
    handleErrorApi(error, type);
  }

  return api;
};
