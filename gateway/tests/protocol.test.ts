import { describe, it, expect } from "vitest";
import {
  createMessage,
  parseMessage,
  isAuthMessage,
  isRegisterMessage,
  isHeartbeatMessage,
  isProgressMessage,
  isRunStartedMessage,
  isRunCompletedMessage,
  isRunFailedMessage,
  PROTOCOL_VERSION,
} from "../src/protocol.js";

describe("protocol", () => {
  describe("createMessage", () => {
    it("creates a message with type, payload, and ISO timestamp", () => {
      const msg = createMessage("auth", { token: "abc", machineName: "test", version: "1" });
      expect(msg.type).toBe("auth");
      expect(msg.payload.token).toBe("abc");
      expect(msg.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("creates messages with different types", () => {
      const hb = createMessage("heartbeat", { uptimeSeconds: 120, activeRuns: 0 });
      expect(hb.type).toBe("heartbeat");
      expect(hb.payload.uptimeSeconds).toBe(120);
    });
  });

  describe("parseMessage", () => {
    it("parses valid JSON with type field", () => {
      const raw = JSON.stringify({ type: "auth", payload: { token: "x" }, timestamp: "2026-01-01" });
      const msg = parseMessage(raw);
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe("auth");
    });

    it("returns null for invalid JSON", () => {
      expect(parseMessage("not json")).toBeNull();
    });

    it("returns null for JSON without type field", () => {
      expect(parseMessage(JSON.stringify({ payload: {} }))).toBeNull();
    });

    it("returns null for non-object JSON", () => {
      expect(parseMessage('"just a string"')).toBeNull();
    });

    it("returns null for null JSON", () => {
      expect(parseMessage("null")).toBeNull();
    });
  });

  describe("type guards", () => {
    it("isAuthMessage", () => {
      const msg = createMessage("auth", { token: "x", machineName: "m", version: "1" });
      expect(isAuthMessage(msg)).toBe(true);
      expect(isAuthMessage(createMessage("heartbeat", {}))).toBe(false);
    });

    it("isRegisterMessage", () => {
      const msg = createMessage("register", { agents: [] });
      expect(isRegisterMessage(msg)).toBe(true);
    });

    it("isHeartbeatMessage", () => {
      const msg = createMessage("heartbeat", { uptimeSeconds: 0, activeRuns: 0 });
      expect(isHeartbeatMessage(msg)).toBe(true);
    });

    it("isProgressMessage", () => {
      const msg = createMessage("progress", {
        runId: "r1", agentName: "a", stepIndex: 1, stepTotal: 3, stepName: "s", message: "m",
      });
      expect(isProgressMessage(msg)).toBe(true);
    });

    it("isRunStartedMessage", () => {
      const msg = createMessage("run_started", { requestId: "req1", runId: "r1", agentName: "a" });
      expect(isRunStartedMessage(msg)).toBe(true);
    });

    it("isRunCompletedMessage", () => {
      const msg = createMessage("run_completed", { runId: "r1", agentName: "a", outputs: {} });
      expect(isRunCompletedMessage(msg)).toBe(true);
    });

    it("isRunFailedMessage", () => {
      const msg = createMessage("run_failed", { runId: "r1", agentName: "a", error: "boom" });
      expect(isRunFailedMessage(msg)).toBe(true);
    });
  });

  describe("PROTOCOL_VERSION", () => {
    it("is a non-empty string", () => {
      expect(PROTOCOL_VERSION).toBe("1");
    });
  });
});
