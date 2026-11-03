import { InputConfigNotificationsSchema, type InputConfigNotification, type InputConfigNotifications } from "../types/config.types";
import { ConfigValidationError } from "../validation";

function parseNotificationsBlock(block: InputConfigNotifications): InputConfigNotifications {
  const result = InputConfigNotificationsSchema.safeParse(block);
  if (result.success) return result.data;

  const issues = result.error.issues.map((issue) => `${issue.path.join(".") || "notifications"}: ${issue.message}`).join("; ");
  throw new ConfigValidationError(`Invalid notifications block: ${issues}`);
}

/**
 * Merge a notifications block onto an earlier one. Entries with the same name (case-insensitive) are replaced by the
 * later entry; update_password keeps the earlier value when the later block omits it; delete_unmanaged.ignore lists
 * are united while the later block decides enabled. Two entries with the same name inside one block are refused.
 */
export const mergeNotifications = (
  existing: InputConfigNotifications | undefined,
  incoming: InputConfigNotifications,
): InputConfigNotifications => {
  const parsedIncoming = parseNotificationsBlock(incoming);
  const parsedExisting = existing === undefined ? undefined : parseNotificationsBlock(existing);

  for (const block of [parsedExisting, parsedIncoming]) {
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
  for (const entry of [...(parsedExisting?.data ?? []), ...(parsedIncoming.data ?? [])]) {
    byName.set(entry.name.toLowerCase(), entry);
  }

  const existingDelete = parsedExisting?.delete_unmanaged;
  const incomingDelete = parsedIncoming.delete_unmanaged;

  return {
    data: [...byName.values()],
    update_password: parsedIncoming.update_password ?? parsedExisting?.update_password,
    delete_unmanaged: incomingDelete
      ? {
          enabled: incomingDelete.enabled,
          ignore: [...new Set([...(existingDelete?.ignore ?? []), ...(incomingDelete.ignore ?? [])])],
        }
      : existingDelete,
  };
};
