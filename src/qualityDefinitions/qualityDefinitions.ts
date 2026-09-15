import { roundToDecimal } from "../util";

export type { QualityDefinitionPayload } from "./qualityDefinition.types";

export { qualityDefinitionsToDiffEntries } from "./qualityDefinitionBase";

export {
  calculateQualityDefinitionDiff,
  createQualityDefinitionSync,
  loadQualityDefinitionFromServer,
  updateQualityDefinitionsOnServer,
} from "./qualityDefinitionSyncer";

export function interpolateSize(min: number, max: number, pref: number, ratio: number): number {
  if (ratio < 0 || ratio > 1) {
    throw new Error(`Unexpected ratio range. Should be between 0 <= ratio <= 1`);
  }
  if (ratio <= 0.5) {
    return roundToDecimal(min + (pref - min) * (ratio / 0.5), 1);
  } else {
    return roundToDecimal(pref + (max - pref) * ((ratio - 0.5) / 0.5), 1);
  }
}
