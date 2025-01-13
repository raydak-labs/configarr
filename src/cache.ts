import { MergedCustomFormatResource, MergedQualityDefinitionResource, MergedQualityProfileResource } from "./__generated__/mergedTypes";
import { ArrClientLanguageResource } from "./clients/unified-client";

export class ServerCache {
  private cache: Record<string, any> = {};
  private _qd: MergedQualityDefinitionResource[];
  private _qp: MergedQualityProfileResource[];
  private _cf: MergedCustomFormatResource[];
  private _languages: ArrClientLanguageResource[];

  constructor(
    qd: MergedQualityDefinitionResource[],
    qp: MergedQualityProfileResource[],
    cf: MergedCustomFormatResource[],
    languages: ArrClientLanguageResource[],
  ) {
    this._qd = qd;
    this._qp = qp;
    this._cf = cf;
    this._languages = languages;
  }

  public get<T>(key: string): T | null {
    return this.cache[key] ?? null;
  }

  public set<T>(key: string, value: T): void {
    this.cache[key] = value;
  }

  public get qd() {
    return this._qd;
  }

  public set qd(newQd: MergedQualityDefinitionResource[]) {
    if (newQd == null || newQd.length <= 0) {
      throw new Error("The QD is invalid");
    }
    this._qd = newQd;
  }

  public get qp() {
    return this._qp;
  }

  public set qp(newQp: MergedQualityProfileResource[]) {
    if (newQp == null || newQp.length <= 0) {
      throw new Error("The QP is invalid");
    }
    this._qp = newQp;
  }

  public get cf() {
    return this._cf;
  }

  public set cf(newCf: MergedCustomFormatResource[]) {
    if (newCf == null || newCf.length <= 0) {
      throw new Error("The CF is invalid");
    }
    this._cf = newCf;
  }

  public get languages() {
    return this._languages;
  }

  public set languages(newLanguages: ArrClientLanguageResource[]) {
    if (newLanguages == null || newLanguages.length <= 0) {
      throw new Error("The CF is invalid");
    }
    this._languages = newLanguages;
  }
}
