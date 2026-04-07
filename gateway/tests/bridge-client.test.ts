import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WebSocket, WebSocketServer } from "ws";
import { BridgeClient, type BridgeConfig } from "../src/bridge-client.js";
import { createMessage } from "../src/protocol.js";

const BRIDGE_PORT = 19950 + Math.floor(Math.random() * 100);

describe("BridgeClient", () => {
  let mockGateway: WebSocketServer;
  let bridge: BridgeClient;
  let port: number;
  let gatewayConnections: WebSocket[];

  beforeEach(async () => {
    port = BRIDGE_PORT + Math.floor(Math.random() * 100);
    gatewayConnections = [];

    // Mock gateway server
    mockGateway = new WebSocketServer({ port });
    await new Promise<void>((resolve) => mockGateway.on("listening", resolve));

    mockGateway.on("connection", (ws) => {
      gatewayConnections.push(ws);
    });
  });

  afterEach(async () => {
    bridge?.disconnect();
    for (const ws of gatewayConnections) {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    }
    await new Promise<void>((resolve) => mockGateway.close(() => resolve()));
  });

  function makeBridge(overrides: Partial<BridgeConfig> = {}): BridgeClient {
    return new BridgeClient({
      gatewayUrl: `ws://localhost:${port}`,
      machineToken: "test-token",
      machineName: "test-machine",
      localApiUrl: "http://localhost:8000",
      ...overrides,
    });
  }

  function waitForMessage(ws: WebSocket): Promise<any> {
    return new Promise((resolve) => {
      ws.on("message", (data) => resolve(JSON.parse(String(data))));
    });
  }

  describe("authentication", () => {
    it("sends auth message on connect", async () => {
      bridge = makeBridge();

      // Mock the listAgents call that happens after auth
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }));

      bridge.connect();

      const gwWs = await new Promise<WebSocket>((resolve) => {
        mockGateway.on("connection", resolve);
      });

      const msg = await waitForMessage(gwWs);
      expect(msg.type).toBe("auth");
      expect(msg.payload.token).toBe("test-token");
      expect(msg.payload.machineName).toBe("test-machine");

      vi.unstubAllGlobals();
    });

    it("sends register after auth with agent list from local API", async () => {
      const mockAgents = [
        { id: "a1", name: "security", description: "Sec agent", steps: [{ name: "s1" }], input_schema: [] },
      ];

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAgents),
      }));

      bridge = makeBridge();
      bridge.connect();

      const gwWs = await new Promise<WebSocket>((resolve) => {
        mockGateway.on("connection", resolve);
      });

      // Wait for both auth and register messages
      const messages: any[] = [];
      await new Promise<void>((resolve) => {
        gwWs.on("message", (data) => {
          messages.push(JSON.parse(String(data)));
          if (messages.length >= 2) resolve();
        });
        // Timeout safety
        setTimeout(resolve, 2000);
      });

      expect(messages[0]?.type).toBe("auth");
      expect(messages[1]?.type).toBe("register");
      expect(messages[1]?.payload.agents).toHaveLength(1);
      expect(messages[1]?.payload.agents[0].name).toBe("security");

      vi.unstubAllGlobals();
    });
  });

  describe("state changes", () => {
    it("fires onStateChange callbacks", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }));

      const states: string[] = [];
      bridge = makeBridge();
      bridge.onStateChange = (s) => states.push(s);

      bridge.connect();
      await new Promise((r) => setTimeout(r, 300));

      expect(states).toContain("connecting");
      expect(states).toContain("connected");

      bridge.disconnect();
      await new Promise((r) => setTimeout(r, 100));

      expect(states).toContain("disconnected");

      vi.unstubAllGlobals();
    });
  });

  describe("disconnect", () => {
    it("stops reconnecting after explicit disconnect", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }));

      bridge = makeBridge();
      bridge.connect();
      await new Promise((r) => setTimeout(r, 200));

      bridge.disconnect();
      await new Promise((r) => setTimeout(r, 200));

      // Should not reconnect
      expect(gatewayConnections.length).toBeLessThanOrEqual(1);

      vi.unstubAllGlobals();
    });
  });
});
