import { describe, it } from "vitest";
import { LidarrClient } from "./lidarr-client";
import { expectNotificationWriteRedacted } from "./notificationWriteRedaction";

describe("LidarrClient notification writes", () => {
  it("create and update keep the failure body out of logs and errors", async () => {
    await expectNotificationWriteRedacted(new LidarrClient("http://arr.test", "api-key"));
  });
});
