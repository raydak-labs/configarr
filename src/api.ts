import { Api } from "./__generated__/MySuperbApi";

let SonarrApi: Api<unknown>["api"];

export const getSonarrApi = () => {
  if (SonarrApi) {
    return SonarrApi;
  }

  throw new Error("Please configure API first.");
};

export const configureSonarrApi = async (url: string, apiKey: string) => {
  const api = new Api({
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

  SonarrApi = api.api;

  try {
    await SonarrApi.v3MetadataList();
  } catch (error) {
    let message;

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      message = `Could not load from Sonarr API: Status ${error.response.status} - ${error.response.statusText}`;
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.log(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log("Error", error.message);
    }

    throw new Error(message);
  }

  return SonarrApi;
};
