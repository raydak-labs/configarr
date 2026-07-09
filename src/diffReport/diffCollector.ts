import { DiffEntry } from "./diffReport.types";

export class DiffCollector {
  private entries: DiffEntry[] = [];

  add(entries: DiffEntry[]): void {
    this.entries.push(...entries);
  }

  getEntries(): DiffEntry[] {
    return this.entries;
  }
}
