import { logger } from "./logger";
import type { CustomFormatRequest } from "./customFormats/customFormat.types";
import type { QualityDefinitionPayload } from "./qualityDefinitions/qualityDefinition.types";
import type { QualityProfileLanguage, QualityProfilePayload } from "./qualityProfiles/qualityProfile.types";
import type { Tag } from "./tags/tag.types";
import type { MediaDownloadClientResource, ProwlarrDownloadClientResource } from "./downloadClients/downloadClient.types";

export class ServerCache {
  private cache: Record<string, unknown> = {};
  private _qualityDefinitions: QualityDefinitionPayload[];
  private _qualityProfiles: QualityProfilePayload[];
  private _customFormats: CustomFormatRequest[];
  private _tags: Tag[] = [];
  private _languages: QualityProfileLanguage[];
  private _downloadClientSchema: (MediaDownloadClientResource | ProwlarrDownloadClientResource)[] | null = null;

  constructor(
    qualityDefinitions: QualityDefinitionPayload[],
    qualityProfiles: QualityProfilePayload[],
    customFormats: CustomFormatRequest[],
    languages: QualityProfileLanguage[],
  ) {
    this._qualityDefinitions = qualityDefinitions;
    this._qualityProfiles = qualityProfiles;
    this._customFormats = customFormats;
    this._languages = languages;
  }

  public get<T>(key: string): T | null {
    return (this.cache[key] as T | undefined) ?? null;
  }

  public set<T>(key: string, value: T): void {
    this.cache[key] = value;
  }

  public get qualityDefinitions() {
    return this._qualityDefinitions;
  }

  public set qualityDefinitions(newQd: QualityDefinitionPayload[]) {
    if (newQd == null || newQd.length <= 0) {
      logger.debug(`No QualityDefinition received from server.`);
      throw new Error("No QualityDefinitions received from server.");
    }
    this._qualityDefinitions = newQd;
  }

  public get qualityProfiles() {
    return this._qualityProfiles;
  }

  public set qualityProfiles(newQp: QualityProfilePayload[]) {
    if (newQp == null || newQp.length <= 0) {
      logger.debug(`No QualityProfiles received from server.`);
    }
    this._qualityProfiles = newQp;
  }

  public get customFormats() {
    return this._customFormats;
  }

  public set customFormats(newCf: CustomFormatRequest[]) {
    if (newCf == null || newCf.length <= 0) {
      logger.debug(`No CustomFormats received from server.`);
    }
    this._customFormats = newCf;
  }

  public get languages() {
    return this._languages;
  }

  public set languages(newLanguages: QualityProfileLanguage[]) {
    if (newLanguages == null || newLanguages.length <= 0) {
      logger.debug(`No Languages received from server.`);
      throw new Error("No Languages received from server.");
    }
    this._languages = newLanguages;
  }

  public get tags() {
    return this._tags;
  }
  public set tags(newTags: Tag[]) {
    if (newTags == null || newTags.length <= 0) {
      logger.debug(`No Tags received from server.`);
    }
    this._tags = newTags;
  }

  public getDownloadClientSchema(): (MediaDownloadClientResource | ProwlarrDownloadClientResource)[] | null {
    return this._downloadClientSchema;
  }

  public setDownloadClientSchema(schema: (MediaDownloadClientResource | ProwlarrDownloadClientResource)[]): void {
    this._downloadClientSchema = schema;
  }
}
