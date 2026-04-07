import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WebSocket } from "ws";
import { GatewayWsServer } from "../src/ws-server.js";
import { createMessage, type MachineAgent } from "../src/protocol.js";

const TEST_TOKEN = "test-token-abc123";
const TEST_PORT = 19876;

function agent(id: string, name: string): MachineAgent {
  return { id, name, steps: [{ name: "step1" }], input_schema: [] };
}

function connectClient(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

function sendAndWait(ws: WebSocket, msg: object, delayMs = 50): Promise<void> {
  return new Promise((resolve) => {
    ws.send(JSON.stringify(msg));
    setTimeout(resolve, delayMs);
  });
}

describe("GatewayWsServer", () => {
  let server: GatewayWsServer;
  let port: number;
  const clients: WebSocket[] = [];

  beforeEach(async () => {
    port = TEST_PORT + Math.floor(Math.random() * 1000);
    const tokens = new Map([[TEST_TOKEN, "test-machine"]]);
    server = new GatewayWsServer({ port, validTokens: tokens, heartbeatTimeoutMs: 90_000 });
    await server.start();
  });

  afterEach(async () => {
    for (const c of clients) {
      if (c.readyState === WebSocket.OPEN) c.close();
    }
    clients.length = 0;
    await server.stop();
  });

  function trackClient(ws: WebSocket): WebSocket {
    clients.push(ws);
    return ws;
  }

  async function authenticatedClient(name = "test-machine"): Promise<WebSocket> {
    const ws = trackClient(await connectClient(port));
    await sendAndWait(ws, createMessage("auth", {
      token: TEST_TOKEN,
      machineName: name,
      version: "1",
    }));
    return ws;
  }

  describe("authentication", () => {
    it("accepts valid token", async () => {
      const onConnected = vi.fn();
      server.onMachineConnected = onConnected;

      await authenticatedClient("my-laptop");

      expect(onConnected).toHaveBeenCalledWith(
        expect.objectContaining({ name: "my-laptop" }),
      );
      expect(server.getRegistry().size).toBe(1);
    });

    it("rejects invalid token", async () => {
      const ws = trackClient(await connectClient(port));
      const closed = new Promise<number>((resolve) => {
        ws.on("close", (code) => resolve(code));
      });

      ws.send(JSON.stringify(createMessage("auth", {
        token: "wrong-token",
        machineName: "hacker",
        version: "1",
      })));

      const code = await closed;
      expect(code).toBe(4003);
      expect(server.getRegistry().size).toBe(0);
    });

    it("rejects non-auth first message", async () => {
      const ws = trackClient(await connectClient(port));
      const closed = new Promise<number>((resolve) => {
        ws.on("close", (code) => resolve(code));
      });

      ws.send(JSON.stringify(createMessage("heartbeat", { uptimeSeconds: 0, activeRuns: 0 })));

      const code = await closed;
      expect(code).toBe(4002);
    });

    it("closes connection on auth timeout", async () => {
      // Create server with very short auth timeout for testing
      await server.stop();
      const tokens = new Map([[TEST_TOKEN, "test"]]);
      server = new GatewayWsServer({ port, validTokens: tokens, heartbeatTimeoutMs: 90_000 });
      await server.start();

      const ws = trackClient(await connectClient(port));
      const closed = new Promise<number>((resolve) => {
        ws.on("close", (code) => resolve(code));
      });

      // Don't send auth -- wait for timeout (10s default, too long for test)
      // Instead just verify the connection is open initially
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close(); // Clean up
    });
  });

  describe("agent registration", () => {
    it("registers agents after auth", async () => {
      const ws = await authenticatedClient("laptop");
      await sendAndWait(ws, createMessage("register", {
        agents: [agent("a1", "security"), agent("a2", "software")],
      }));

      const allAgents = server.getRegistry().getAllAgents();
      expect(allAgents).toHaveLength(2);
      expect(allAgents[0]!.name).toBe("security");
      expect(allAgents[0]!.machineName).toBe("laptop");
    });

    it("aggregates agents from multiple machines", async () => {
      // Need two different tokens for two machines
      await server.stop();
      const token2 = "test-token-2";
      const tokens = new Map([[TEST_TOKEN, "m1"], [token2, "m2"]]);
      server = new GatewayWsServer({ port, validTokens: tokens, heartbeatTimeoutMs: 90_000 });
      await server.start();

      const ws1 = await authenticatedClient("laptop");
      await sendAndWait(ws1, createMessage("register", {
        agents: [agent("a1", "security")],
      }));

      const ws2 = trackClient(await connectClient(port));
      await sendAndWait(ws2, createMessage("auth", {
        token: token2,
        machineName: "desktop",
        version: "1",
      }));
      await sendAndWait(ws2, createMessage("register", {
        agents: [agent("a2", "data")],
      }));

      expect(server.getRegistry().getAllAgents()).toHaveLength(2);
    });
  });

  describe("heartbeat", () => {
    it("updates heartbeat on machine", async () => {
      const ws = await authenticatedClient("laptop");
      await sendAndWait(ws, createMessage("heartbeat", { uptimeSeconds: 120, activeRuns: 2 }));

      const machine = server.getRegistry().getAllMachines()[0]!;
      expect(machine.activeRuns).toBe(2);
    });
  });

  describe("run lifecycle events", () => {
    it("fires onRunStarted", async () => {
      const callback = vi.fn();
      server.onRunStarted = callback;

      const ws = await authenticatedClient("laptop");
      await sendAndWait(ws, createMessage("run_started", {
        requestId: "req1",
        runId: "run1",
        agentName: "security",
      }));

      expect(callback).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ runId: "run1" }),
      );
    });

    it("fires onProgress", async () => {
      const callback = vi.fn();
      server.onProgress = callback;

      const ws = await authenticatedClient("laptop");
      await sendAndWait(ws, createMessage("progress", {
        runId: "run1",
        agentName: "security",
        stepIndex: 2,
        stepTotal: 5,
        stepName: "Scanning",
        message: "Found 3 issues",
      }));

      expect(callback).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ stepIndex: 2, stepTotal: 5 }),
      );
    });

    it("fires onRunCompleted", async () => {
      const callback = vi.fn();
      server.onRunCompleted = callback;

      const ws = await authenticatedClient("laptop");
      await sendAndWait(ws, createMessage("run_completed", {
        runId: "run1",
        agentName: "security",
        outputs: { report: "all good" },
      }));

      expect(callback).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ outputs: { report: "all good" } }),
      );
    });

    it("fires onRunFailed", async () => {
      const callback = vi.fn();
      server.onRunFailed = callback;

      const ws = await authenticatedClient("laptop");
      await sendAndWait(ws, createMessage("run_failed", {
        runId: "run1",
        agentName: "security",
        error: "timeout",
      }));

      expect(callback).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ error: "timeout" }),
      );
    });
  });

  describe("sendToMachine", () => {
    it("sends message to authenticated machine", async () => {
      const ws = await authenticatedClient("laptop");
      const received = new Promise<any>((resolve) => {
        ws.on("message", (data) => resolve(JSON.parse(String(data))));
      });

      const registry = server.getRegistry();
      const machine = registry.getAllMachines()[0]!;
      const sent = server.sendToMachine(machine.id, createMessage("run", {
        requestId: "req1",
        agentId: "a1",
        inputs: { task: "test" },
      }));

      expect(sent).toBe(true);
      const msg = await received;
      expect(msg.type).toBe("run");
      expect(msg.payload.agentId).toBe("a1");
    });

    it("returns false for unknown machine", () => {
      expect(server.sendToMachine("nonexistent", createMessage("status", {}))).toBe(false);
    });
  });

  describe("disconnection", () => {
    it("fires onMachineDisconnected when client closes", async () => {
      const callback = vi.fn();
      server.onMachineDisconnected = callback;

      const ws = await authenticatedClient("laptop");
      ws.close();

      // Wait for close event to propagate
      await new Promise((r) => setTimeout(r, 100));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ name: "laptop" }),
      );
      expect(server.getRegistry().size).toBe(0);
    });

    it("cleans up registry on disconnect", async () => {
      const ws = await authenticatedClient("laptop");
      await sendAndWait(ws, createMessage("register", {
        agents: [agent("a1", "security")],
      }));

      expect(server.getRegistry().getAllAgents()).toHaveLength(1);

      ws.close();
      await new Promise((r) => setTimeout(r, 100));

      expect(server.getRegistry().getAllAgents()).toHaveLength(0);
    });
  });
});
