import "dotenv/config";

import fs from "fs";
import { CustomFormatResource } from "./src/__generated__/MySuperbApi";
import { configureSonarrApi, getSonarrApi } from "./src/api";
import { getConfig } from "./src/config";
import { calculateCFsToManage, loadLocalCfs, loadServerCustomFormats, manageCf, mergeCfSources } from "./src/customFormats";
import {
  calculateQualityDefinitionDiff,
  loadQualityDefinitionFromSonarr,
  loadQualityDefinitionSonarrFromTrash,
} from "./src/qualityDefinition";
import { calculateQualityProfilesDiff, loadQualityProfilesSonarr, mapQualityProfiles } from "./src/qualityProfiles";
import { cloneRecyclarrTemplateRepo, loadRecyclarrTemplates } from "./src/recyclarrImporter";
import { cloneTrashRepo, loadSonarrTrashCFs } from "./src/trashGuide";
import { RecyclarrMergedTemplates, TrashQualityDefintion, YamlConfigInstance, YamlConfigQualityProfile } from "./src/types";
import { IS_DRY_RUN } from "./src/util";

const pipeline = async (value: YamlConfigInstance) => {
  const api = getSonarrApi();
  const recyclarrTemplateMap = loadRecyclarrTemplates();

  const recylarrMergedTemplates: RecyclarrMergedTemplates = {
    custom_formats: [],
    quality_profiles: [],
  };

  if (value.include) {
    console.log(`Recyclarr Includes: ${value.include}`);
    value.include.forEach((e) => {
      const template = recyclarrTemplateMap.get(e.template);

      if (!template) {
        console.log(`Unknown recyclarr template requested: ${e.template}`);
        return;
      }

      if (template.custom_formats) {
        recylarrMergedTemplates.custom_formats?.push(...template.custom_formats);
      }

      if (template.quality_definition) {
        recylarrMergedTemplates.quality_definition = template.quality_definition;
      }

      if (template.quality_profiles) {
        for (const qp of template.quality_profiles) {
          recylarrMergedTemplates.quality_profiles.push(qp);
        }
      }

      // TODO Ignore recursive include for now
    });
  }

  if (value.custom_formats) {
    recylarrMergedTemplates.custom_formats.push(...value.custom_formats);
  }

  if (value.quality_profiles) {
    recylarrMergedTemplates.quality_profiles.push(...value.quality_profiles);
  }

  console.log(recylarrMergedTemplates);

  const result = await loadLocalCfs();
  const trashCFs = await loadSonarrTrashCFs();
  const mergedCFs = mergeCfSources([trashCFs, result]);

  const idsToManage = calculateCFsToManage(recylarrMergedTemplates);

  console.log(`Stuff to manage: ${Array.from(idsToManage)}`);

  const serverCFs = await loadServerCustomFormats();
  console.log(`CFs on server: ${serverCFs.length}`);

  const serverCFMapping = serverCFs.reduce((p, c) => {
    p.set(c.name!, c);
    return p;
  }, new Map<string, CustomFormatResource>());

  await manageCf(mergedCFs, serverCFMapping, idsToManage);
  console.log(`CustomFormats should be in sync`);

  const qualityDefinition = recylarrMergedTemplates.quality_definition?.type;

  if (qualityDefinition) {
    const qdSonarr = await loadQualityDefinitionFromSonarr();
    let qdTrash: TrashQualityDefintion;

    switch (qualityDefinition) {
      case "anime":
        qdTrash = await loadQualityDefinitionSonarrFromTrash("anime");
        break;
      case "series":
        qdTrash = await loadQualityDefinitionSonarrFromTrash("series");
        break;
      default:
        throw new Error(`Unsupported quality defintion ${qualityDefinition}`);
    }

    const { changeMap, create, restData } = calculateQualityDefinitionDiff(qdSonarr, qdTrash);

    if (changeMap.size > 0) {
      if (IS_DRY_RUN) {
        console.log("DryRun: Would update QualityDefinitions.");
      } else {
        console.log(`Diffs in quality definitions found`, changeMap.values());
        await api.v3QualitydefinitionUpdateUpdate(restData);
        console.log(`Updated QualityDefinitions`);
      }
    } else {
      console.log(`QualityDefinitions do not need update!`);
    }

    if (create.length > 0) {
      console.log(`Currently not implemented this case for quality definitions.`);
    }
  }

  // merge CFs of templates and custom CFs into one mapping of QualityProfile -> CFs + Score
  // TODO traversing the merged templates probably to often once should be enough. Loop once and extract a couple of different maps, arrays as needed. Future optimization.
  const cfToQualityProfiles = mapQualityProfiles(mergedCFs, recylarrMergedTemplates.custom_formats, recylarrMergedTemplates);

  // merge profiles from recyclarr templates into one
  const qualityProfilesMerged = recylarrMergedTemplates.quality_profiles.reduce((p, c) => {
    let existingQp = p.get(c.name);

    if (!existingQp) {
      p.set(c.name, { ...c });
    } else {
      existingQp = {
        ...existingQp,
        ...c,
        // Overwriting qualities array for now
        upgrade: { ...existingQp.upgrade, ...c.upgrade },
        reset_unmatched_scores: {
          ...existingQp.reset_unmatched_scores,
          ...c.reset_unmatched_scores,
          enabled: (c.reset_unmatched_scores?.enabled ?? existingQp.reset_unmatched_scores?.enabled) || false,
        },
      };
      p.set(c.name, existingQp);
    }

    return p;
  }, new Map<string, YamlConfigQualityProfile>());

  // calculate diff from server <-> what we want to be there

  const qpServer = await loadQualityProfilesSonarr();

  const { changedQPs, create, noChanges } = await calculateQualityProfilesDiff(
    mergedCFs,
    qualityProfilesMerged,
    cfToQualityProfiles,
    qpServer,
  );

  changedQPs.forEach((e, i) => {
    fs.writeFileSync(`test${i}.json`, JSON.stringify(e, null, 2), "utf-8");
  });
  console.log(`QPs: Create: ${create.length}, Update: ${changedQPs.length}, Unchanged: ${noChanges.length}`);

  if (!IS_DRY_RUN) {
    for (const element of create) {
      const newProfile = await api.v3QualityprofileCreate(element);
      console.log(`Created QualityProfile: ${newProfile.data.name}`);
    }

    for (const element of changedQPs) {
      const newProfile = await api.v3QualityprofileUpdate("" + element.id, element);
      console.log(`Updated QualityProfile: ${newProfile.data.name}`);
    }
  }
  /*
  - load trash
  - load custom resources
  - merge stuff together to see what actually needs to be done
  - create/update CFs
  - future: somehow track managed CFs?
  - create/update quality profiles
  - future: quality definitions
  */
};

const run = async () => {
  const applicationConfig = getConfig();

  await cloneRecyclarrTemplateRepo();
  await cloneTrashRepo();

  // TODO currently this has to be run sequentially because of the centrally configured api

  for (const instanceName in applicationConfig.sonarr) {
    const instance = applicationConfig.sonarr[instanceName];
    console.log(`Processing Sonarr Instance: ${instanceName}`);
    await configureSonarrApi(instance.base_url, instance.api_key);
    await pipeline(instance);
  }

  for (const instanceName in applicationConfig.radarr) {
    console.log(`Processing Radarr instance: ${instanceName}`);
    console.log(`Currently not implemented`);
    continue;

    const instance = applicationConfig.sonarr[instanceName];
    console.log(`Processing Sonarr Instance: ${instanceName}`);
    await pipeline(instance);
  }
};

run();
//go();
//go2();
//testGo();
//testCompare();
