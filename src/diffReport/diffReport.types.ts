export type DiffAction = "create" | "update" | "delete" | "unchanged";

export interface FieldChange {
  field: string; // dotted path, e.g. "upgrade.until_score", "customFormats.SDTV.score"
  from: unknown;
  to: unknown;
}

export interface DiffEntry {
  resourceType: string; // "QualityProfile", "QualityDefinition", "CustomFormat", "RootFolder", ...
  name: string;
  action: DiffAction;
  fieldChanges?: FieldChange[]; // only present for "update"
}

export interface InstanceDiffReport {
  arrType: string;
  instanceName: string;
  entries: DiffEntry[];
}
