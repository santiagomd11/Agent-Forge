import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WebSocket } from "ws";
import { GatewayWsServer } from "../src/ws-server.js";
import { MultiMachineAPI } from "../src/multi-machine-api.js";
import { createMessage, type MachineAgent } from "../src/protocol.js";

const TOKEN_1 = "token-machine-1";
const TOKEN_2 = "token-machine-2";

function agent(id: string, name: string): MachineAgent {
  return { id, name, description: `${name} agent`, steps: [{ name: "s1" }], input_schema: [] };
}

function connectAndAuth(port: number, token: string, name: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.on("open", () => {
      ws.send(JSON.stringify(createMessage("auth", { token, machineName: name, version: "1" })));
      setTimeout(() => resolve(ws), 50);
    });
    ws.on("error", reject);
  });
}

describe("MultiMachineAPI", () => {
  let server: GatewayWsServer;
  let api: MultiMachineAPI;
  let port: number;
  const clients: WebSocket[] = [];

  beforeEach(async () => {
    port = 19900 + Math.floor(Math.random() * 1000);
    const tokens = new Map([[TOKEN_1, "laptop"], [TOKEN_2, "desktop"]]);
    server = new GatewayWsServer({ port, validTokens: tokens });
    // Don't set onRunStarted here -- MultiMachineAPI sets it
    await server.start();
    api = new MultiMachineAPI(server.getRegistry(), server);
  });

  afterEach(async () => {
    for (const c of clients) {
      if (c.readyState === WebSocket.OPEN) c.close();
    }
    clients.length = 0;
    await server.stop();
  });

  async function setupMachine(token: string, name: string, agents: MachineAgent[]): Promise<WebSocket> {
    const ws = await connectAndAuth(port, token, name);
    clients.push(ws);
    ws.send(JSON.stringify(createMessage("register", { agents })));
    await new Promise((r) => setTimeout(r, 50));
    return ws;
  }

  describe("listAgents", () => {
    it("returns empty when no machines connected", async () => {
      const agents = await api.listAgents();
      expect(agents).toEqual([]);
    });

    it("aggregates agents from multiple machines", async () => {
      await setupMachine(TOKEN_1, "laptop", [agent("a1", "security")]);
      await setupMachine(TOKEN_2, "desktop", [agent("a2", "data")]);

      const agents = await api.listAgents();
      expect(agents).toHaveLength(2);
      expect(agents[0]).toMatchObject({ name: "security", machineName: "laptop" });
      expect(agents[1]).toMatchObject({ name: "data", machineName: "desktop" });
    });

    it("includes machine info in agent records", async () => {
      await setupMachine(TOKEN_1, "laptop", [agent("a1", "security")]);
      const agents = await api.listAgents();
      expect(agents[0]).toHaveProperty("machineId");
      expect(agents[0]).toHaveProperty("machineName", "laptop");
    });
  });

  describe("runAgent", () => {
    it("sends run command to correct machine and resolves on run_started", async () => {
      const ws = await setupMachine(TOKEN_1, "laptop", [agent("a1", "security")]);

      // Bridge side: listen for run command, reply with run_started
      ws.on("message", (data) => {
        const msg = JSON.parse(String(data));
        if (msg.type === "run") {
          ws.send(JSON.stringify(createMessage("run_started", {
            requestId: msg.payload.requestId,
            runId: "run-abc",
            agentName: "security",
          })));
        }
      });

      const result = await api.runAgent("a1", { task: "audit" });
      expect(result).toMatchObject({ run_id: "run-abc" });
    });

    it("throws when agent not found on any machine", async () => {
      await expect(api.runAgent("nonexistent", {})).rejects.toThrow("No connected machine");
    });

    it("throws when machine is unreachable", async () => {
      const ws = await setupMachine(TOKEN_1, "laptop", [agent("a1", "security")]);
      ws.close();
      await new Promise((r) => setTimeout(r, 100));

      await expect(api.runAgent("a1", {})).rejects.toThrow();
    });
  });

  describe("cancelRun", () => {
    it("sends cancel to tracked machine", async () => {
      const ws = await setupMachine(TOKEN_1, "laptop", [agent("a1", "security")]);
      const received = new Promise<any>((resolve) => {
        ws.on("message", (data) => {
          const msg = JSON.parse(String(data));
          if (msg.type === "cancel") resolve(msg);
        });
      });

      // Manually track a run
      const machines = server.getRegistry().getAllMachines();
      api.trackRun("run-xyz", machines[0]!.id);

      await api.cancelRun("run-xyz");
      const msg = await received;
      expect(msg.payload.runId).toBe("run-xyz");
    });

    it("throws for unknown run", async () => {
      await expect(api.cancelRun("unknown")).rejects.toThrow("Unknown run");
    });
  });

  describe("listRuns", () => {
    it("returns tracked runs", async () => {
      await setupMachine(TOKEN_1, "laptop", [agent("a1", "security")]);
      const machines = server.getRegistry().getAllMachines();
      api.trackRun("run-1", machines[0]!.id);
      api.trackRun("run-2", machines[0]!.id);

      const runs = await api.listRuns();
      expect(runs).toHaveLength(2);
    });

    it("returns empty when no runs", async () => {
      const runs = await api.listRuns();
      expect(runs).toEqual([]);
    });
  });

  describe("run tracking", () => {
    it("tracks and untracks runs", () => {
      api.trackRun("run-1", "machine-1");
      api.untrackRun("run-1");
      // No assertion needed -- just verify no errors
    });
  });
});
