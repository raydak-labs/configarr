import type { DiffEntry } from "../diffReport/diffReport.types";

/** A server tag: its id and label. Labels are matched case-insensitively. */
export interface Tag {
  id?: number;
  label?: string | null;
}

/** Counts plus the diff entries a tag stage produced for the instance report. */
export interface TagSyncResult {
  added: number;
  removed: number;
  diffEntries: DiffEntry[];
}

/** Options for the shared tag helpers. */
export interface TagResolveOptions {
  /**
   * Synthetic ids for labels that do not exist on the server yet, keyed by LOWERCASED label.
   * Used by dry runs so tag fields diff against something stable instead of dropping to an
   * empty list. Callers that render not-yet-created tags by label (Prowlarr providers) omit it.
   */
  placeholders?: Map<string, number>;
}

/** What `ensureTags` resolved, created, and still found missing. */
export interface EnsureTagsResult {
  /** Resolved server ids, in the order the input was given. */
  ids: number[];
  /** Labels this call actually created on the server. */
  created: string[];
  /**
   * Labels that were missing when the call started, deduplicated case-insensitively, in
   * first-seen order. On a real run these are exactly `created`; on a dry run nothing is
   * created, so this is what the caller reports as "would create".
   */
  missing: string[];
}

/** Keep-set, in-use policy and id-retention inputs for a tag prune. */
export interface DeleteUnmanagedTagsOptions {
  /** Lowercased labels to keep. */
  keep: Iterable<string>;
  /** Raw server tag ids to keep. Config tag entries may be ids (deprecated) instead of labels. */
  keepIds?: Iterable<number>;
  /**
   * What to do when the server refuses to delete a tag because it is still in use (409).
   * "throw" fails the instance (Prowlarr: every tag-bearing resource is managed, so a
   * conflict is a real error). "skip" logs a warning and leaves the tag (media *arrs also
   * have import lists, notifications and indexers that configarr does not manage).
   * Every other failure throws either way.
   */
  onInUse: "throw" | "skip";
}

/**
 * Raised when a tag delete fails part-way through a prune. Carries the deletions that already
 * succeeded, so a caller that continues on error can still report them.
 */
export class TagDeletionError extends Error {
  constructor(
    message: string,
    readonly partial: TagSyncResult,
  ) {
    super(message);
    this.name = "TagDeletionError";
  }
}
