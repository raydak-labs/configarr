import { Api } from "./__generated__/MySuperbApi";

let SonarrApi: Api<unknown>["api"];

export const getSonarrApi = () => {
  if (SonarrApi) {
    return SonarrApi;
  }

  const api = new Api({
    //   headers: {
    //     "X-Api-Key": process.env.SONARR_API_KEY!,
    //   },
    // url: process.env.SONARR_URL!,
    // baseURL: process.env.SONARR_URL!,
    baseUrl: process.env.SONARR_URL!,
    baseApiParams: {
      headers: {
        "X-Api-Key": process.env.SONARR_API_KEY!,
      },
    },
  });

  SonarrApi = api.api;

  return SonarrApi;
};
