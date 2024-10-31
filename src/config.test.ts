import { describe, expect, test } from "vitest";
import yaml from "yaml";
import { transformConfig } from "./config";
import { InputConfigSchema } from "./types/config.types";
import { cloneWithJSON } from "./util";

describe("transformConfig", async () => {
  const config: InputConfigSchema = yaml.parse(`
sonarr:
  instance1:
    base_url: http://sonarr:8989
    api_key: test

    quality_profiles:
      - name: Remux-2160p - Anime
        quality_sort: top
        score_set: anime-sonarr
        upgrade:
          allowed: true
          until_quality: SINGLE_STAGE
          until_score: 5000000
        qualities:
          - name: SINGLE_STAGE
            enabled: true
            qualities:
              - Bluray-2160p
              - SDTV
          - name: Unknown
            enabled: false
    custom_formats:
      - trash_ids:
          - custom-german-dl
          - custom-german-dl-2
        assign_scores_to:
          - name: Remux-2160p - Anime
radarr: {}
`);

  test("should transform without error", async () => {
    const transformed = transformConfig(config);
    expect(transformed).not.toBeNull();
  });

  test("should transform without error - quality_profiles instead of assign_scores_to", async () => {
    const cloned = cloneWithJSON(config);
    const instance = cloned.sonarr["instance1"];
    const { assign_scores_to, quality_profiles, ...rest } = instance.custom_formats[0];

    instance.custom_formats[0] = { ...rest, quality_profiles: assign_scores_to ?? quality_profiles };

    const transformed = transformConfig(config);
    expect(transformed).not.toBeNull();
  });
});
