import fs from "node:fs";
import { InstanceDiffReport } from "../diffReport.types";

export interface DiffReportDocument {
  generatedAt: string;
  dryRun: boolean;
  instances: InstanceDiffReport[];
}

export function writeJsonDiffReport(filePath: string, instances: InstanceDiffReport[], dryRun: boolean): void {
  const document: DiffReportDocument = {
    generatedAt: new Date().toISOString(),
    dryRun,
    instances,
  };

  fs.writeFileSync(filePath, JSON.stringify(document, null, 2), "utf-8");
}
