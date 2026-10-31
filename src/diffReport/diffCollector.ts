import { DiffEntry } from "./diffReport.types";
import { redactDiffEntry } from "./redactSecrets";

export class DiffCollector {
  private entries: DiffEntry[] = [];

  /**
   * Collects the single source of diff entries for every formatter, so secrets are
   * masked here instead of at each sink.
   */
  add(entries: DiffEntry[]): void {
    this.entries.push(...entries.map(redactDiffEntry));
  }

  /**
   * Retrieves all collected diff entries. Returns an array of entries with sensitive values masked.
   */
  getEntries(): DiffEntry[] {
    return this.entries;
  }
}
