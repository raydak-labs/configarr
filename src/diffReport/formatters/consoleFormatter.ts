import { logger } from "../../logger";
import { formatDiffValue } from "../formatDiffValue";
import { DiffEntry, DiffFormatter, InstanceDiffReport } from "../diffReport.types";

export class ConsoleDiffFormatter implements DiffFormatter {
  format(report: InstanceDiffReport): void {
    const lines: string[] = [`=== Diff Report: ${report.arrType} / ${report.instanceName} ===`, ""];

    if (report.entries.length === 0) {
      lines.push("  (up to date - no changes)");
    } else {
      for (const [resourceType, entries] of groupByResourceType(report.entries)) {
        lines.push(`${resourceType} (${summarizeCounts(entries)})`);
        for (const entry of entries) {
          lines.push(...renderEntry(entry));
        }
        lines.push("");
      }
    }

    lines.push("==========================================");
    logger.info(lines.join("\n"));
  }
}

function groupByResourceType(entries: DiffEntry[]): Map<string, DiffEntry[]> {
  const groups = new Map<string, DiffEntry[]>();
  for (const entry of entries) {
    const group = groups.get(entry.resourceType) ?? [];
    group.push(entry);
    groups.set(entry.resourceType, group);
  }
  return groups;
}

function summarizeCounts(entries: DiffEntry[]): string {
  const creates = entries.filter((e) => e.action === "create").length;
  const updates = entries.filter((e) => e.action === "update").length;
  const deletes = entries.filter((e) => e.action === "delete").length;

  if (creates === 0 && deletes === 0) {
    return `${updates} change${updates === 1 ? "" : "s"}`;
  }

  const parts: string[] = [];
  if (creates > 0) parts.push(`${creates} create`);
  if (updates > 0) parts.push(`${updates} update`);
  if (deletes > 0) parts.push(`${deletes} delete`);
  return parts.join(", ");
}

function renderEntry(entry: DiffEntry): string[] {
  if (entry.action === "create") {
    return [`  + ${entry.name} (new)`];
  }
  if (entry.action === "delete") {
    return [`  - ${entry.name} (removed)`];
  }

  const lines = [`  ~ ${entry.name}`];
  for (const change of entry.fieldChanges ?? []) {
    lines.push(`      ${change.field}: ${formatDiffValue(change.from)} -> ${formatDiffValue(change.to)}`);
  }
  return lines;
}
