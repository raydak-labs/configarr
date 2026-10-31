import { getEnvs } from "../env";
import { ConfigValidationError } from "../validation";
import { snakeToCamel } from "../util";
import { isSecretFieldName, SECRET_MASK } from "../diffReport/redactSecrets";
import { renderTags } from "../diffReport/renderTags";
import { buildTagPlaceholders, ensureTags, resolveTagNames } from "../tags/tags";
import type { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import type { InputConfigNotifications } from "../types/config.types";
import type { NotificationsClient, TagsClient } from "../clients/capabilities";
import type { ServerCache } from "../cache";

export type NotificationField = {
  name?: string | null;
  value?: unknown;
  type?: string | null;
  privacy?: string | null;
  [key: string]: unknown;
};

export type NotificationResourceItem = {
  id?: number;
  name?: string | null;
  implementation?: string | null;
  implementationName?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  tags?: number[] | null;
  includeHealthWarnings?: boolean;
  fields?: NotificationField[] | null;
  [key: string]: unknown;
};

export function normalizeNotificationFields(configFields: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(configFields)) {
    const camelKey = snakeToCamel(key);
    normalized[camelKey] = value;
    if (key !== camelKey) {
      normalized[key] = value;
    }
  }
  return normalized;
}

export function isSecretNotificationField(privacy: string | null | undefined, name: string): boolean {
  if (privacy === "password" || privacy === "apiKey" || privacy === "userName") {
    return true;
  }
  return isSecretFieldName(name);
}

export function findNotificationSchema(schema: NotificationResourceItem[], typeName: string): NotificationResourceItem | undefined {
  const target = typeName.toLowerCase();
  return schema.find((s) => s.implementation?.toLowerCase() === target || s.implementationName?.toLowerCase() === target);
}

export async function validateNotifications(client: NotificationsClient, config: InputConfigNotifications): Promise<void> {
  const [schema, existing] = await Promise.all([
    client.getNotificationSchema() as Promise<NotificationResourceItem[]>,
    client.getNotifications() as Promise<NotificationResourceItem[]>,
  ]);

  const existingNames = new Set<string>();
  for (const entry of existing) {
    const lower = (entry.name ?? "").toLowerCase();
    if (lower) {
      if (existingNames.has(lower)) {
        throw new ConfigValidationError(`Ambiguous notification '${entry.name}'`);
      }
      existingNames.add(lower);
    }
  }

  if (!config.data?.length) return;

  const seen = new Set<string>();
  for (const item of config.data) {
    const key = item.name.toLowerCase();
    if (seen.has(key)) {
      throw new ConfigValidationError(`Duplicate notification '${item.name}'`);
    }
    seen.add(key);
  }

  for (const item of config.data) {
    const schemaItem = findNotificationSchema(schema, item.type);
    if (!schemaItem) {
      throw new ConfigValidationError(`Unknown notification type '${item.type}'`);
    }

    const schemaFields = schemaItem.fields ?? [];
    const validFieldNames = new Set(schemaFields.map((f) => f.name).filter((n): n is string => Boolean(n)));
    if (item.fields) {
      const normalized = normalizeNotificationFields(item.fields);
      for (const fieldName of Object.keys(normalized)) {
        if (fieldName === snakeToCamel(fieldName) && !validFieldNames.has(fieldName)) {
          throw new ConfigValidationError(`Notification '${item.name}': unknown field '${fieldName}' for type '${item.type}'`);
        }
      }
    }

    if (item.events) {
      for (const [eventKey] of Object.entries(item.events)) {
        const camelEvent = snakeToCamel(eventKey);
        const supportsKey = "supports" + camelEvent.charAt(0).toUpperCase() + camelEvent.slice(1);
        if (!(camelEvent in schemaItem) || (schemaItem as any)[supportsKey] !== true) {
          throw new ConfigValidationError(`Notification '${item.name}': unsupported event '${eventKey}' for type '${item.type}'`);
        }
      }
    }

    const matches = existing.filter((e) => e.name?.toLowerCase() === item.name.toLowerCase());
    if (matches.length > 1) {
      throw new ConfigValidationError(`Ambiguous notification '${item.name}'`);
    }
    const serverNotification = matches[0];
    if (serverNotification) {
      const targetType = item.type.toLowerCase();
      const typeMatches =
        serverNotification.implementation?.toLowerCase() === targetType ||
        serverNotification.implementationName?.toLowerCase() === targetType;
      if (!typeMatches) {
        const serverType = serverNotification.implementation ?? serverNotification.implementationName ?? "";
        throw new ConfigValidationError(
          `Notification '${item.name}' exists as type '${serverType}' but config says '${item.type}'; rename it or remove the server entry`,
        );
      }
    }
  }
}

export async function syncNotifications(
  client: NotificationsClient & TagsClient,
  config: InputConfigNotifications,
  serverCache: ServerCache,
): Promise<DiffEntry[]> {
  const data = config.data ?? [];
  const deleteUnmanaged = config.delete_unmanaged;

  if (!data.length && !deleteUnmanaged?.enabled) {
    return [];
  }

  const [schema, existing] = await Promise.all([
    client.getNotificationSchema() as Promise<NotificationResourceItem[]>,
    client.getNotifications() as Promise<NotificationResourceItem[]>,
  ]);

  const allTags = data.flatMap((item) => item.tags ?? []);
  if (allTags.length > 0) {
    await ensureTags(client, serverCache, allTags);
  }
  // A dry run creates no tags, so missing labels get synthetic ids to show in the diff.
  const placeholders = getEnvs().DRY_RUN
    ? buildTagPlaceholders(
        allTags.filter((tag): tag is string => typeof tag === "string"),
        serverCache.tags,
      )
    : undefined;

  const diffEntries: DiffEntry[] = [];
  const updatePassword = config.update_password ?? false;

  for (const item of data) {
    const schemaItem = findNotificationSchema(schema, item.type);
    if (!schemaItem) {
      throw new ConfigValidationError(`Unknown notification type '${item.type}'`);
    }

    const matches = existing.filter((e) => e.name?.toLowerCase() === item.name.toLowerCase());
    if (matches.length > 1) {
      throw new ConfigValidationError(`Ambiguous notification '${item.name}'`);
    }
    const serverNotification = matches[0];
    if (serverNotification) {
      const targetType = item.type.toLowerCase();
      const typeMatches =
        serverNotification.implementation?.toLowerCase() === targetType ||
        serverNotification.implementationName?.toLowerCase() === targetType;
      if (!typeMatches) {
        const serverType = serverNotification.implementation ?? serverNotification.implementationName ?? "";
        throw new ConfigValidationError(
          `Notification '${item.name}' exists as type '${serverType}' but config says '${item.type}'; rename it or remove the server entry`,
        );
      }
    }

    if (!serverNotification) {
      // CREATE
      const payload: NotificationResourceItem = {
        ...schemaItem,
        name: item.name,
      };
      delete payload.id;

      if (item.include_health_warnings !== undefined) {
        payload.includeHealthWarnings = item.include_health_warnings;
      } else {
        payload.includeHealthWarnings = schemaItem.includeHealthWarnings ?? false;
      }

      for (const [key, val] of Object.entries(schemaItem)) {
        if (key.startsWith("on") && typeof val === "boolean") {
          payload[key] = false;
        }
      }
      if (item.events) {
        for (const [eventKey, eventVal] of Object.entries(item.events)) {
          payload[snakeToCamel(eventKey)] = eventVal;
        }
      }

      const normalizedConfigFields = normalizeNotificationFields(item.fields ?? {});
      payload.fields = (schemaItem.fields ?? []).map((schemaField) => {
        const fieldName = schemaField.name ?? "";
        const configVal = normalizedConfigFields[fieldName];
        return configVal !== undefined ? { ...schemaField, value: configVal } : schemaField;
      });

      if (item.tags !== undefined) {
        const { ids } = resolveTagNames(item.tags, serverCache.tags, { placeholders });
        payload.tags = [...ids].sort();
      }

      diffEntries.push({ resourceType: "Notification", name: item.name, action: "create" });
      if (!getEnvs().DRY_RUN) {
        await client.createNotification(payload as any);
      }
    } else {
      // UPDATE
      const changes: FieldChange[] = [];
      const next: NotificationResourceItem = { ...serverNotification };

      if (serverNotification.name !== item.name) {
        changes.push({ field: "name", from: serverNotification.name, to: item.name });
        next.name = item.name;
      }

      if (item.include_health_warnings !== undefined && item.include_health_warnings !== serverNotification.includeHealthWarnings) {
        changes.push({
          field: "includeHealthWarnings",
          from: serverNotification.includeHealthWarnings,
          to: item.include_health_warnings,
        });
        next.includeHealthWarnings = item.include_health_warnings;
      }

      if (item.events) {
        for (const [eventKey, eventVal] of Object.entries(item.events)) {
          const camelEvent = snakeToCamel(eventKey);
          const currentVal = (serverNotification as any)[camelEvent];
          if (currentVal !== eventVal) {
            changes.push({ field: camelEvent, from: currentVal, to: eventVal });
            (next as any)[camelEvent] = eventVal;
          }
        }
      }

      const normalizedConfigFields = normalizeNotificationFields(item.fields ?? {});
      const serverFields = serverNotification.fields ?? [];
      const updatedFields: NotificationField[] = serverFields.map((serverField) => {
        const fieldName = serverField.name ?? "";
        const configValue = normalizedConfigFields[fieldName];
        if (configValue === undefined) return serverField;

        const isSecret = isSecretNotificationField(serverField.privacy, fieldName);
        const isMasked = serverField.value === "********" || serverField.value === SECRET_MASK;

        let valuesMatch = JSON.stringify(configValue) === JSON.stringify(serverField.value);
        if (!valuesMatch && isSecret && isMasked && !updatePassword) {
          valuesMatch = true;
        }

        if (!valuesMatch) {
          if (isSecret) {
            changes.push({ field: `fields.${fieldName}`, from: SECRET_MASK, to: SECRET_MASK });
          } else {
            changes.push({ field: `fields.${fieldName}`, from: serverField.value, to: configValue });
          }
          return { ...serverField, value: configValue };
        }
        return serverField;
      });

      const serverFieldNames = new Set(serverFields.map((f) => f.name).filter(Boolean));
      for (const [key, value] of Object.entries(normalizedConfigFields)) {
        if (key === snakeToCamel(key) && !serverFieldNames.has(key)) {
          const sf = (schemaItem.fields ?? []).find((f) => f.name === key);
          if (sf) {
            const isSecret = isSecretNotificationField(sf.privacy, key);
            changes.push({
              field: `fields.${key}`,
              from: undefined,
              to: isSecret ? SECRET_MASK : value,
            });
            updatedFields.push({ ...sf, value });
          }
        }
      }
      next.fields = updatedFields;

      if (item.tags !== undefined) {
        const { ids: resolvedTagIds } = resolveTagNames(item.tags, serverCache.tags, { placeholders });
        const sortedConfigTagIds = [...resolvedTagIds].sort();
        const sortedServerTagIds = [...(serverNotification.tags ?? [])].sort();
        if (JSON.stringify(sortedConfigTagIds) !== JSON.stringify(sortedServerTagIds)) {
          // Map placeholder ids to labels as written in config for dry-run diff reporting.
          const placeholderLabels = placeholders
            ? new Map(
                [...placeholders].flatMap(([key, id]) => {
                  const label = item.tags?.find((t): t is string => typeof t === "string" && t.toLowerCase() === key);
                  return label !== undefined ? [[id, label]] : [];
                }),
              )
            : undefined;
          changes.push({ field: "tags", from: sortedServerTagIds, to: renderTags(sortedConfigTagIds, placeholderLabels) });
          next.tags = sortedConfigTagIds;
        }
      }

      if (changes.length > 0) {
        diffEntries.push({
          resourceType: "Notification",
          name: item.name,
          action: "update",
          fieldChanges: changes,
        });
        if (!getEnvs().DRY_RUN && serverNotification.id != null) {
          await client.updateNotification(String(serverNotification.id), next as any);
        }
      }
    }
  }

  // DELETE UNMANAGED
  if (deleteUnmanaged?.enabled) {
    const ignoreList = deleteUnmanaged.ignore ?? [];
    const ignoreSet = new Set(ignoreList.map((ign) => ign.toLowerCase()));
    const configNameSet = new Set(data.map((d) => d.name.toLowerCase()));

    const toDelete = existing.filter((serverItem) => {
      const name = (serverItem.name ?? "").toLowerCase();
      return !configNameSet.has(name) && !ignoreSet.has(name);
    });

    for (const serverItem of toDelete) {
      diffEntries.push({
        resourceType: "Notification",
        name: serverItem.name ?? "",
        action: "delete",
      });
      if (!getEnvs().DRY_RUN && serverItem.id != null) {
        await client.deleteNotification(String(serverItem.id));
      }
    }
  }

  return diffEntries;
}
