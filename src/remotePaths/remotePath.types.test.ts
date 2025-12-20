import { describe, it, expect } from "vitest";
import { RemotePathConfigSchema } from "./remotePath.types";

describe("RemotePathTypes", () => {
  it("should validate correct remote path config", () => {
    const config = {
      host: "transmission",
      remote_path: "/downloads",
      local_path: "/data/downloads",
    };
    expect(() => RemotePathConfigSchema.parse(config)).not.toThrow();
  });

  it("should reject missing host", () => {
    const config = {
      remote_path: "/downloads",
      local_path: "/data/downloads",
    };
    expect(() => RemotePathConfigSchema.parse(config)).toThrow();
  });

  it("should reject empty host", () => {
    const config = {
      host: "",
      remote_path: "/downloads",
      local_path: "/data/downloads",
    };
    expect(() => RemotePathConfigSchema.parse(config)).toThrow();
  });

  it("should reject missing remote_path", () => {
    const config = {
      host: "transmission",
      local_path: "/data/downloads",
    };
    expect(() => RemotePathConfigSchema.parse(config)).toThrow();
  });

  it("should reject missing local_path", () => {
    const config = {
      host: "transmission",
      remote_path: "/downloads",
    };
    expect(() => RemotePathConfigSchema.parse(config)).toThrow();
  });
});
