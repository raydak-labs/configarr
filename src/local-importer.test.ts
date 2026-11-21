import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfig } from "./config";
import { loadLocalRecyclarrTemplate } from "./local-importer";

vi.mock("./config", () => ({ getConfig: vi.fn() }));
vi.mock("./logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

describe("loadLocalRecyclarrTemplate", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("keeps media_type from a local Chaptarr template", () => {
    dir = mkdtempSync(join(tmpdir(), "configarr-local-templates-"));
    writeFileSync(join(dir, "books.yml"), "media_type: audiobook\n");
    vi.mocked(getConfig).mockReturnValue({ localConfigTemplatesPath: dir } as never);

    const templates = loadLocalRecyclarrTemplate("CHAPTARR");

    expect(templates.get("books")).toMatchObject({ media_type: "audiobook" });
  });
});
