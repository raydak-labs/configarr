import type { DiffEntry } from "./diffReport.types";
import { redactDiffEntry } from "./redactSecrets";

export class DiffCollector {
  private entries: DiffEntry[] = [];

  /** Redact once before entries reach any formatter. */
  add(entries: DiffEntry[]): void {
    this.entries.push(...entries.map(redactDiffEntry));
  }

  getEntries(): DiffEntry[] {
    return this.entries;
  }
}
