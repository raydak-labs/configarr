import { Api as RadarrApi } from "./__generated__/generated-radarr-api";
import { Api as SonarrApi } from "./__generated__/generated-sonarr-api";
import { logger } from "./logger";

let sonarrClient: SonarrApi<unknown>["api"] | undefined;
let radarrClient: RadarrApi<unknown>["api"] | undefined;

export const unsetApi = () => {
  sonarrClient = undefined;
  radarrClient = undefined;
};

export const getArrApi = () => {
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

export const configureSonarrApi = async (url: string, apiKey: string) => {
  sonarrClient = undefined;
  radarrClient = undefined;

  const api = new SonarrApi({
    headers: {
      "X-Api-Key": apiKey,
    },
    url: url,
    baseURL: url,
    // baseUrl: url,
    // baseApiParams: {
    //   headers: {
    //     "X-Api-Key": apiKey,
    //   },
    // },
  });

  sonarrClient = api.api;

  try {
    await sonarrClient.v3MetadataList();
  } catch (error: any) {
    let message;

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      message = `Could not load from Sonarr API: Status ${error.response.status} - ${error.response.statusText}`;
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      logger.error(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error("Error", error.message);
    }

    throw new Error(message);
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
  sonarrClient = undefined;
  radarrClient = undefined;

  const api = new RadarrApi({
    headers: {
      "X-Api-Key": apiKey,
    },
    url: url,
    baseURL: url,
    // baseUrl: url,
    // baseApiParams: {
    //   headers: {
    //     "X-Api-Key": apiKey,
    //   },
    // },
  });

  radarrClient = api.api;

  try {
    await radarrClient.v3MetadataList();
  } catch (error: any) {
    let message;

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      message = `Could not load from Radarr API: Status ${error.response.status} - ${error.response.statusText}`;
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      logger.error(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error("Error", error.message);
    }

    throw new Error(message);
  }

  return radarrClient;
};
