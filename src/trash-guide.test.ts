import { describe, test } from "vitest";
import { loadQPFromTrash } from "./trash-guide";

describe("TrashGuide", async () => {
  test("loadQPFromTrash - normal", async ({}) => {
    const results = await loadQPFromTrash("RADARR");

    console.log(results.keys());
  });
});
