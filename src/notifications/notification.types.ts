import type { InputConfigNotifications, InputConfigNotification } from "../types/config.types";
import type { NotificationsClient } from "../clients/capabilities";

export type { InputConfigNotifications, InputConfigNotification };

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
