import { describe, expect, test } from "vitest";
import { ServerCache } from "./cache";
import {
  filterUnmanagedClients,
  isDownloadClientEqual,
} from "./download-clients";
import type { DownloadClientResource } from "./__generated__/radarr/data-contracts";
import type { InputConfigDownloadClient } from "./types/config.types";
import type { ArrClientLanguageResource } from "./clients/unified-client";

describe("download-clients – deletion logic", () => {
  const emptyLanguages: ArrClientLanguageResource[] = [];

  test("filterUnmanagedClients uses composite key of name + implementation", () => {
    const serverClients: DownloadClientResource[] = [
      {
        id: 1,
        enable: true,
        protocol: "torrent",
        name: "qb-download",
        implementation: "qBittorrent",
        priority: 1,
        tags: [],
        removeCompletedDownloads: true,
        removeFailedDownloads: true,
        configContract: "",
        fields: [],
      },
      {
        id: 2,
        enable: true,
        protocol: "torrent",
        name: "qb-download",
        implementation: "SomeOtherImplementation",
        priority: 1,
        tags: [],
        removeCompletedDownloads: true,
        removeFailedDownloads: true,
        configContract: "",
        fields: [],
      },
    ];

    const configClients: InputConfigDownloadClient[] = [
      {
        name: "qb-download",
        type: "qBittorrent",
      },
    ];

    const deleteConfig = { enabled: true, ignore: [] };

    const result = filterUnmanagedClients(serverClients, configClients, deleteConfig);

    // Only the server client whose (name, implementation) pair does NOT
    // appear in the configuration should be considered unmanaged.
    expect(result.map((c) => c.id)).toEqual([2]);
  });

  test("filterUnmanagedClients respects delete_unmanaged=false", () => {
    const serverClients: DownloadClientResource[] = [
      {
        id: 1,
        enable: true,
        protocol: "torrent",
        name: "qb-download",
        implementation: "qBittorrent",
        priority: 1,
        tags: [],
        removeCompletedDownloads: true,
        removeFailedDownloads: true,
        configContract: "",
        fields: [],
      },
    ];

    const configClients: InputConfigDownloadClient[] = [];

    const result = filterUnmanagedClients(serverClients, configClients, false);

    expect(result).toEqual([]);
  });
});

describe("download-clients – equality & omission semantics", () => {
  const emptyLanguages: ArrClientLanguageResource[] = [];

  const makeCache = (tags: MergedTagResource[] = []) =>
    new ServerCache([], [], [], emptyLanguages);

  test("isDownloadClientEqual treats omitted top-level fields as 'do not manage'", () => {
    const cache = makeCache();

    const server: DownloadClientResource = {
      id: 1,
      enable: false,
      protocol: "torrent",
      name: "client-1",
      implementation: "qBittorrent",
      priority: 5,
      tags: [],
      removeCompletedDownloads: false,
      removeFailedDownloads: false,
      configContract: "",
      fields: [],
    };

    const config: InputConfigDownloadClient = {
      name: "client-1",
      type: "qBittorrent",
      // All top-level booleans and priority omitted
      // This should be treated as "do not manage" for those properties
    };

    const equal = isDownloadClientEqual(config, server, cache, "RADARR");

    expect(equal).toBe(true);
  });

  test("isDownloadClientEqual detects explicit differences when fields are set", () => {
    const cache = makeCache();

    const server: DownloadClientResource = {
      id: 1,
      enable: true,
      protocol: "torrent",
      name: "client-1",
      implementation: "qBittorrent",
      priority: 1,
      tags: [],
      removeCompletedDownloads: true,
      removeFailedDownloads: true,
      configContract: "",
      fields: [],
    };

    const config: InputConfigDownloadClient = {
      name: "client-1",
      type: "qBittorrent",
      enable: false, // explicitly different from server
    };

    const equal = isDownloadClientEqual(config, server, cache, "RADARR");

    expect(equal).toBe(false);
  });
});
