import type { DiffEntry } from "../diffReport/diffReport.types";

export interface Tag {
  id?: number;
  label?: string | null;
}

export interface TagSyncResult {
  added: number;
  removed: number;
  diffEntries: DiffEntry[];
}

export interface TagResolveOptions {
  /** Synthetic ids for missing labels, keyed by lowercased label. Dry runs only. */
  placeholders?: Map<string, number>;
}

export interface EnsureTagsResult {
  /** Resolved server ids, in the order the input was given. */
  ids: number[];
  /** Labels this call actually created on the server. */
  created: string[];
  /** Missing labels, deduped case-insensitively. Equals `created` unless this was a dry run. */
  missing: string[];
}

export interface DeleteUnmanagedTagsOptions {
  /** Lowercased labels to keep. */
  keep: Iterable<string>;
  /** Raw ids to keep, for config entries that are ids rather than labels (deprecated). */
  keepIds?: Iterable<number>;
  /** 409 handling: "skip" warns and continues (media), "throw" fails the instance (Prowlarr). */
  onInUse: "throw" | "skip";
}

/** Prune failed part-way; `partial` holds the deletions that already happened. */
export class TagDeletionError extends Error {
  constructor(
    message: string,
    readonly partial: TagSyncResult,
  ) {
    super(message);
    this.name = "TagDeletionError";
  }
}
