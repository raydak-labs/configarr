import { describe, it } from "vitest";
import { expectNotificationWriteRedacted } from "./notificationWriteRedaction";
import { WhisparrClient } from "./whisparr-client";

describe("WhisparrClient notification writes", () => {
  it("create and update keep the failure body out of logs and errors", async () => {
    await expectNotificationWriteRedacted(new WhisparrClient("http://arr.test", "api-key"));
  });
});
