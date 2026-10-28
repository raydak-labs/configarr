import fs from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";
import { loadLocalRecyclarrTemplate } from "./local-importer";
import { loadRecyclarrTemplates } from "./recyclarr-importer";

vi.mock("./config", () => ({ getConfig: () => ({ localConfigTemplatesPath: "/fixtures" }) }));
vi.mock("./logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn() } }));
vi.mock("./util", () => ({
  cloneGitRepo: vi.fn(),
  recyclarrRepoPaths: { radarrCF: "/cf", radarrQD: "/qd", radarrQP: "/qp" },
}));

const yaml = `custom_formats:\n  - trash_ids: [cf]\n    quality_profiles:\n      - name: HD\n        score: 42\n`;

describe("local and Recyclarr template loading", () => {
  afterEach(() => vi.restoreAllMocks());

  test("normalizes legacy assignments loaded from a local template", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readdirSync").mockReturnValue(["fixture.yml"] as never);
    vi.spyOn(fs, "readFileSync").mockReturnValue(yaml);
    expect(loadLocalRecyclarrTemplate("RADARR").get("fixture")?.custom_formats?.[0]?.assign_scores_to).toEqual([{ name: "HD", score: 42 }]);
  });

  test("normalizes legacy assignments loaded from a Recyclarr template", () => {
    vi.spyOn(fs, "readdirSync").mockImplementation((dir) => (dir === "/cf" ? ["fixture.yml"] : []) as never);
    vi.spyOn(fs, "readFileSync").mockReturnValue(yaml);
    expect(loadRecyclarrTemplates("RADARR").get("fixture")?.custom_formats?.[0]?.assign_scores_to).toEqual([{ name: "HD", score: 42 }]);
  });
});
