import { api } from "..";

import path from "path";
import { CustomFormatResource } from "./__generated__/MySuperbApi";

export const loadServerCustomFormats = async (): Promise<
  CustomFormatResource[]
> => {
  return (await import(path.resolve("./tests/samples/cfs.json")))
    .default as unknown as Promise<CustomFormatResource[]>;

  const cfOnServer = await api.v3CustomformatList();
  return cfOnServer.data;
};
