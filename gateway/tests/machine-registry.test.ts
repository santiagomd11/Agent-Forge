import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { MachineRegistry } from "../src/machine-registry.js";
import type { MachineAgent } from "../src/protocol.js";

function agent(id: string, name: string): MachineAgent {
  return { id, name, description: `${name} agent`, steps: [{ name: "step1" }], input_schema: [] };
}

describe("MachineRegistry", () => {
  let registry: MachineRegistry;

  beforeEach(() => {
    registry = new MachineRegistry(90_000);
  });

  afterEach(() => {
    registry.stop();
  });

  describe("add/remove machines", () => {
    it("adds a machine", () => {
      const m = registry.addMachine("m1", "work-laptop");
      expect(m.name).toBe("work-laptop");
      expect(m.agents).toEqual([]);
      expect(registry.size).toBe(1);
    });

    it("removes a machine and returns it", () => {
      registry.addMachine("m1", "work-laptop");
      const removed = registry.removeMachine("m1");
      expect(removed?.name).toBe("work-laptop");
      expect(registry.size).toBe(0);
    });

    it("returns undefined when removing non-existent machine", () => {
      expect(registry.removeMachine("nope")).toBeUndefined();
    });

    it("gets a machine by id", () => {
      registry.addMachine("m1", "laptop");
      expect(registry.getMachine("m1")?.name).toBe("laptop");
      expect(registry.getMachine("m2")).toBeUndefined();
    });

    it("lists all machines", () => {
      registry.addMachine("m1", "laptop");
      registry.addMachine("m2", "desktop");
      expect(registry.getAllMachines()).toHaveLength(2);
    });
  });

  describe("agent management", () => {
    it("updates agents for a machine", () => {
      registry.addMachine("m1", "laptop");
      registry.updateAgents("m1", [agent("a1", "security")]);
      expect(registry.getMachine("m1")?.agents).toHaveLength(1);
    });

    it("ignores update for unknown machine", () => {
      registry.updateAgents("nope", [agent("a1", "test")]);
      expect(registry.size).toBe(0);
    });

    it("aggregates agents from all machines", () => {
      registry.addMachine("m1", "laptop");
      registry.addMachine("m2", "desktop");
      registry.updateAgents("m1", [agent("a1", "security"), agent("a2", "software")]);
      registry.updateAgents("m2", [agent("a3", "data")]);

      const all = registry.getAllAgents();
      expect(all).toHaveLength(3);
      expect(all[0]!.machineName).toBe("laptop");
      expect(all[2]!.machineName).toBe("desktop");
    });

    it("includes machine info in aggregated agents", () => {
      registry.addMachine("m1", "laptop");
      registry.updateAgents("m1", [agent("a1", "security")]);

      const agg = registry.getAllAgents();
      expect(agg[0]!.machineId).toBe("m1");
      expect(agg[0]!.machineName).toBe("laptop");
      expect(agg[0]!.name).toBe("security");
    });
  });

  describe("agent lookup", () => {
    beforeEach(() => {
      registry.addMachine("m1", "laptop");
      registry.addMachine("m2", "desktop");
      registry.updateAgents("m1", [agent("a1", "security-engineer"), agent("a2", "software-engineer")]);
      registry.updateAgents("m2", [agent("a3", "software-engineer"), agent("a4", "data-analyzer")]);
    });

    it("finds agent by name query", () => {
      const found = registry.findAgent("security");
      expect(found?.name).toBe("security-engineer");
      expect(found?.machineId).toBe("m1");
    });

    it("returns undefined for no match", () => {
      expect(registry.findAgent("nonexistent")).toBeUndefined();
    });

    it("finds machine for agent id", () => {
      const machine = registry.getMachineForAgent("a3");
      expect(machine?.name).toBe("desktop");
    });

    it("returns undefined for unknown agent id", () => {
      expect(registry.getMachineForAgent("unknown")).toBeUndefined();
    });

    it("finds all machines with a given agent name", () => {
      const machines = registry.getMachinesForAgentName("software-engineer");
      expect(machines).toHaveLength(2);
      expect(machines.map((m) => m.name).sort()).toEqual(["desktop", "laptop"]);
    });

    it("returns empty for agent name not on any machine", () => {
      expect(registry.getMachinesForAgentName("nope")).toHaveLength(0);
    });
  });

  describe("heartbeat", () => {
    it("updates heartbeat and active runs", () => {
      registry.addMachine("m1", "laptop");
      registry.updateHeartbeat("m1", 2);

      const after = registry.getMachine("m1")!;
      expect(after.activeRuns).toBe(2);
    });

    it("ignores heartbeat for unknown machine", () => {
      registry.updateHeartbeat("nope", 1);
      expect(registry.size).toBe(0);
    });

    it("removes machine after heartbeat timeout", () => {
      vi.useFakeTimers();
      const timeoutMs = 5_000;
      const reg = new MachineRegistry(timeoutMs);
      const callback = vi.fn();
      reg.onMachineTimeout = callback;
      reg.start();

      reg.addMachine("m1", "laptop");

      // Advance past timeout + check interval
      vi.advanceTimersByTime(35_000);

      expect(reg.size).toBe(0);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ name: "laptop" }));

      reg.stop();
      vi.useRealTimers();
    });

    it("keeps machine alive if heartbeat is fresh", () => {
      vi.useFakeTimers();
      const timeoutMs = 60_000;
      const reg = new MachineRegistry(timeoutMs);
      reg.start();

      reg.addMachine("m1", "laptop");

      // Advance 25s, send heartbeat (resets the clock)
      vi.advanceTimersByTime(25_000);
      reg.updateHeartbeat("m1", 0);

      // Advance another 35s (total 60s from start, but only 35s from last heartbeat)
      // Check interval fires at 30s mark
      vi.advanceTimersByTime(35_000);

      // 35s since last heartbeat < 60s timeout, machine should still be alive
      expect(reg.size).toBe(1);

      reg.stop();
      vi.useRealTimers();
    });
  });

  describe("empty registry", () => {
    it("returns empty agent list", () => {
      expect(registry.getAllAgents()).toEqual([]);
    });

    it("returns empty machine list", () => {
      expect(registry.getAllMachines()).toEqual([]);
    });

    it("size is 0", () => {
      expect(registry.size).toBe(0);
    });
  });
});
