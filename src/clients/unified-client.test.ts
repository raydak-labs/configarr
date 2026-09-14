import { afterEach, describe, expect, it, vi } from "vitest";
import { LidarrClient } from "./lidarr-client";
import { ProwlarrClient } from "./prowlarr-client";
import { RadarrClient } from "./radarr-client";
import { ReadarrClient } from "./readarr-client";
import { SonarrClient } from "./sonarr-client";
import { WhisparrClient } from "./whisparr-client";
import { configureApi, getClient, getSpecificClient, unsetApi } from "./unified-client";

vi.mock("./sonarr-client", () => ({
  SonarrClient: class {
    async testConnection() {
      return true;
    }
  },
}));
vi.mock("./radarr-client", () => ({
  RadarrClient: class {
    async testConnection() {
      return true;
    }
  },
}));
vi.mock("./lidarr-client", () => ({
  LidarrClient: class {
    async testConnection() {
      return true;
    }
  },
}));
vi.mock("./readarr-client", () => ({
  ReadarrClient: class {
    async testConnection() {
      return true;
    }
  },
}));
vi.mock("./whisparr-client", () => ({
  WhisparrClient: class {
    async testConnection() {
      return true;
    }
  },
}));
vi.mock("./prowlarr-client", () => ({
  ProwlarrClient: class {
    async testConnection() {
      return true;
    }
  },
}));

describe("configureApi / getClient", () => {
  afterEach(() => {
    unsetApi();
  });

  it("returns the concrete client for a literal arr type", async () => {
    const client = await configureApi("SONARR", "http://localhost", "key");
    expect(client).toBeInstanceOf(SonarrClient);
    expect(getClient("SONARR")).toBe(client);
    expect(getClient()).toBe(client);
    expect(getSpecificClient("SONARR")).toBe(client);
  });

  it("returns each arr's concrete client", async () => {
    expect(await configureApi("RADARR", "http://localhost", "key")).toBeInstanceOf(RadarrClient);
    expect(await configureApi("LIDARR", "http://localhost", "key")).toBeInstanceOf(LidarrClient);
    expect(await configureApi("READARR", "http://localhost", "key")).toBeInstanceOf(ReadarrClient);
    expect(await configureApi("WHISPARR", "http://localhost", "key")).toBeInstanceOf(WhisparrClient);
    expect(await configureApi("PROWLARR", "http://localhost", "key")).toBeInstanceOf(ProwlarrClient);
  });

  it("throws when getClient is asked for a different arr type", async () => {
    await configureApi("SONARR", "http://localhost", "key");
    expect(() => getClient("RADARR")).toThrow(/Type mismatch: requested RADARR but client is configured for SONARR/);
  });

  it("throws when getClient is called before configureApi", () => {
    expect(() => getClient("SONARR")).toThrow("Please configure API first.");
  });
});
