import { describe, expect, test, vi } from "vitest";
import type { MergedDownloadClientResource } from "./__generated__/mergedTypes";
import type { InputConfigDownloadClient } from "./types/config.types";

vi.mock("./logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { calculateDownloadClientsDiff, applyDownloadClients } from "./download-client";

const mockCurrentClient = {
  id: 1,
  enable: true,
  protocol: "usenet",
  priority: 1,
  name: "SABnzbd",
  implementation: "Sabnzbd",
  configContract: "SabnzbdSettings",
  implementationName: "SABnzbd",
  infoLink: "https://wiki.servarr.com/radarr/supported#sabnzbd",
  tags: [],
  removeCompletedDownloads: true,
  removeFailedDownloads: true,
  fields: [
    { name: "host", value: "10.0.0.74" },
    { name: "port", value: 8082 },
    { name: "useSsl", value: false },
    { name: "urlBase", value: "" },
    { name: "apiKey", value: "********" },
    { name: "username", value: "" },
    { name: "password", value: "" },
    { name: "movieCategory", value: "movies" },
    { name: "recentMoviePriority", value: -100 },
    { name: "olderMoviePriority", value: -100 },
  ],
} as unknown as MergedDownloadClientResource;

describe("calculateDownloadClientsDiff", () => {
  test("should return undefined when no changes", () => {
    // Arrange
    const desired: InputConfigDownloadClient = {
      name: "SABnzbd",
      implementation: "Sabnzbd",
      enable: true,
      priority: 1,
      protocol: "usenet",
    };

    // Act
    const result = calculateDownloadClientsDiff([mockCurrentClient], [desired]);

    // Assert
    expect(result).toBeUndefined();
  });

  test("should detect priority change", () => {
    // Arrange
    const desired: InputConfigDownloadClient = {
      name: "SABnzbd",
      implementation: "Sabnzbd",
      priority: 50,
    };

    // Act
    const result = calculateDownloadClientsDiff([mockCurrentClient], [desired]);

    // Assert
    expect(result).toBeDefined();
    expect(result?.toUpdate).toHaveLength(1);
    const update = result?.toUpdate[0];
    expect(update?.id).toBe(1);
    expect(update?.data.priority).toBe(50);
  });

  test("should detect new client to create", () => {
    // Arrange
    const desired: InputConfigDownloadClient[] = [
      { name: "SABnzbd", implementation: "Sabnzbd" },
      { name: "Transmission", implementation: "Transmission" },
    ];

    // Act
    const result = calculateDownloadClientsDiff([mockCurrentClient], desired);

    // Assert
    expect(result).toBeDefined();
    expect(result?.toCreate).toHaveLength(1);
    const created = result?.toCreate[0];
    expect(created?.name).toBe("Transmission");
  });

  test("should return undefined for empty desired list (no delete)", () => {
    // Arrange
    const desired: InputConfigDownloadClient[] = [];

    // Act
    const result = calculateDownloadClientsDiff([mockCurrentClient], desired);

    // Assert
    expect(result).toBeUndefined();
  });

  test("should detect tags change from empty to populated", () => {
    // Arrange
    const desired: InputConfigDownloadClient = {
      name: "SABnzbd",
      implementation: "Sabnzbd",
      tags: [1, 2] as unknown as string[],
    };

    // Act
    const result = calculateDownloadClientsDiff([mockCurrentClient], [desired]);

    // Assert
    expect(result).toBeDefined();
    expect(result?.toUpdate).toHaveLength(1);
  });

  test("should detect tags change from populated to different", () => {
    // Arrange
    const clientWithTags = {
      ...mockCurrentClient,
      tags: [3],
    } as MergedDownloadClientResource;
    const desired: InputConfigDownloadClient = {
      name: "SABnzbd",
      implementation: "Sabnzbd",
      tags: [1, 2] as unknown as string[],
    };

    // Act
    const result = calculateDownloadClientsDiff([clientWithTags], [desired]);

    // Assert
    expect(result).toBeDefined();
    expect(result?.toUpdate).toHaveLength(1);
  });

  test("should return undefined when tags are same but different order", () => {
    // Arrange
    const clientWithTags = {
      ...mockCurrentClient,
      tags: [2, 1],
    } as MergedDownloadClientResource;
    const desired: InputConfigDownloadClient = {
      name: "SABnzbd",
      implementation: "Sabnzbd",
      tags: [1, 2] as unknown as string[],
    };

    // Act
    const result = calculateDownloadClientsDiff([clientWithTags], [desired]);

    // Assert
    expect(result).toBeUndefined();
  });

  test("should return undefined when tags undefined in desired (preserve)", () => {
    // Arrange
    const clientWithTags = {
      ...mockCurrentClient,
      tags: [5, 10],
    } as MergedDownloadClientResource;
    const desired: InputConfigDownloadClient = {
      name: "SABnzbd",
      implementation: "Sabnzbd",
    };

    // Act
    const result = calculateDownloadClientsDiff([clientWithTags], [desired]);

    // Assert
    expect(result).toBeUndefined();
  });

  test("should detect field value change", () => {
    // Arrange
    const desired: InputConfigDownloadClient = {
      name: "SABnzbd",
      implementation: "Sabnzbd",
      fields: [
        { name: "host", value: "10.0.0.74" },
        { name: "port", value: 9000 },
        { name: "useSsl", value: false },
        { name: "urlBase", value: "" },
        { name: "username", value: "" },
        { name: "password", value: "" },
        { name: "movieCategory", value: "movies" },
        { name: "recentMoviePriority", value: -100 },
        { name: "olderMoviePriority", value: -100 },
      ],
    };

    // Act
    const result = calculateDownloadClientsDiff([mockCurrentClient], [desired]);

    // Assert
    expect(result).toBeDefined();
    expect(result?.toUpdate).toHaveLength(1);
  });

  test("should detect enable change", () => {
    // Arrange
    const desired: InputConfigDownloadClient = {
      name: "SABnzbd",
      implementation: "Sabnzbd",
      enable: false,
    };

    // Act
    const result = calculateDownloadClientsDiff([mockCurrentClient], [desired]);

    // Assert
    expect(result).toBeDefined();
    expect(result?.toUpdate).toHaveLength(1);
  });
});

describe("applyDownloadClients", () => {
  test("should do nothing when diff is undefined", async () => {
    // Arrange
    const mockApi = {
      createDownloadClient: vi.fn(),
      updateDownloadClient: vi.fn(),
    };

    // Act
    await applyDownloadClients(mockApi as any, undefined, false);

    // Assert
    expect(mockApi.createDownloadClient).not.toHaveBeenCalled();
    expect(mockApi.updateDownloadClient).not.toHaveBeenCalled();
  });

  test("should not call API in dry run mode", async () => {
    // Arrange
    const mockApi = {
      createDownloadClient: vi.fn(),
      updateDownloadClient: vi.fn(),
    };
    const diff = {
      toCreate: [{ name: "Test", implementation: "Test" }],
      toUpdate: [{ id: 1, data: mockCurrentClient }],
    };

    // Act
    await applyDownloadClients(mockApi as any, diff, true);

    // Assert
    expect(mockApi.createDownloadClient).not.toHaveBeenCalled();
    expect(mockApi.updateDownloadClient).not.toHaveBeenCalled();
  });

  test("should call createDownloadClient for toCreate", async () => {
    // Arrange
    const mockApi = {
      createDownloadClient: vi.fn(),
      updateDownloadClient: vi.fn(),
    };
    const clientToCreate: InputConfigDownloadClient = { name: "Test", implementation: "Test" };
    const diff = {
      toCreate: [clientToCreate],
      toUpdate: [],
    };

    // Act
    await applyDownloadClients(mockApi as any, diff, false);

    // Assert
    expect(mockApi.createDownloadClient).toHaveBeenCalledWith(clientToCreate);
    expect(mockApi.updateDownloadClient).not.toHaveBeenCalled();
  });

  test("should call updateDownloadClient for toUpdate", async () => {
    // Arrange
    const mockApi = {
      createDownloadClient: vi.fn(),
      updateDownloadClient: vi.fn(),
    };
    const diff = {
      toCreate: [],
      toUpdate: [{ id: 1, data: mockCurrentClient }],
    };

    // Act
    await applyDownloadClients(mockApi as any, diff, false);

    // Assert
    expect(mockApi.createDownloadClient).not.toHaveBeenCalled();
    expect(mockApi.updateDownloadClient).toHaveBeenCalledWith("1", mockCurrentClient);
  });
});
