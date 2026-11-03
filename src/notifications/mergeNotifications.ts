import type { InputConfigNotification, InputConfigNotifications } from "../types/config.types";
import { ConfigValidationError } from "../validation";

/**
 * Merge a notifications block onto an earlier one. Entries with the same name (case-insensitive) are replaced by the
 * later entry; update_password keeps the earlier value when the later block omits it; delete_unmanaged.ignore lists
 * are united while the later block decides enabled. Two entries with the same name inside one block are refused.
 */
export const mergeNotifications = (
  existing: InputConfigNotifications | undefined,
  incoming: InputConfigNotifications,
): InputConfigNotifications => {
  for (const block of [existing, incoming]) {
    const seen = new Set<string>();
    for (const entry of block?.data ?? []) {
      const key = entry.name.toLowerCase();
      if (seen.has(key)) {
        throw new ConfigValidationError(`Duplicate notification '${entry.name}'`);
      }
      seen.add(key);
    }
  }

  const byName = new Map<string, InputConfigNotification>();
  for (const entry of [...(existing?.data ?? []), ...(incoming.data ?? [])]) {
    byName.set(entry.name.toLowerCase(), entry);
  }

  const existingDelete = existing?.delete_unmanaged;
  const incomingDelete = incoming.delete_unmanaged;

  return {
    data: [...byName.values()],
    update_password: incoming.update_password ?? existing?.update_password,
    delete_unmanaged: incomingDelete
      ? {
          enabled: incomingDelete.enabled,
          ignore: [...new Set([...(existingDelete?.ignore ?? []), ...(incomingDelete.ignore ?? [])])],
        }
      : existingDelete,
  };
};
