import { CustomFormatMediaType } from "../__generated__/chaptarr/data-contracts";
import type { CustomFormatRequest } from "./customFormat.types";

/** Chaptarr custom formats carry the media side they apply to; no other app has this field. */
export type ChaptarrCustomFormatRequest = CustomFormatRequest & { appliesTo?: CustomFormatMediaType };

/** The media side of a server or config custom format, or undefined when it declares none. */
export function customFormatMediaType(format: CustomFormatRequest): CustomFormatMediaType | undefined {
  if (!("appliesTo" in format)) return undefined;
  const { appliesTo } = format;
  return Object.values(CustomFormatMediaType).find((value) => value === appliesTo);
}
