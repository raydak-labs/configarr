import { describe, it } from "vitest";
import { expectNotificationWriteRedacted } from "./notificationWriteRedaction";
import { ReadarrClient } from "./readarr-client";

describe("ReadarrClient notification writes", () => {
  it("create and update keep the failure body out of logs and errors", async () => {
    await expectNotificationWriteRedacted(new ReadarrClient("http://arr.test", "api-key"));
  });
});
