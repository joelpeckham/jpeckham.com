import { describe, expect, it } from "vitest";
import { DJ_COMMAND_TTL_MS, inspectQueuedCommand } from "./bus";

describe("inspectQueuedCommand", () => {
  it("returns a fresh command", () => {
    const raw = {
      type: "command",
      id: "cmd-1",
      name: "pause",
      payload: {},
      enqueuedAt: Date.now(),
    };
    expect(inspectQueuedCommand(raw).command?.id).toBe("cmd-1");
    expect(inspectQueuedCommand(raw).expired).toBeNull();
  });

  it("marks expired commands without treating them as runnable", () => {
    const raw = {
      type: "command",
      id: "cmd-2",
      name: "next",
      payload: {},
      enqueuedAt: Date.now() - DJ_COMMAND_TTL_MS - 1,
    };
    const result = inspectQueuedCommand(raw);
    expect(result.command).toBeNull();
    expect(result.expired?.id).toBe("cmd-2");
  });
});
