/** In-memory registry of connected machines and their agents. */

import type { MachineAgent } from "./protocol.js";

export interface ConnectedMachine {
  id: string;
  name: string;
  agents: MachineAgent[];
  connectedAt: Date;
  lastHeartbeat: Date;
  activeRuns: number;
}

/** Agent with machine origin info for display and routing. */
export interface AggregatedAgent {
  id: string;
  name: string;
  description?: string;
  steps: { name: string }[];
  input_schema: MachineAgent["input_schema"];
  machineId: string;
  machineName: string;
}

const HEARTBEAT_CHECK_INTERVAL = 30_000;

export class MachineRegistry {
  private machines = new Map<string, ConnectedMachine>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutMs: number;

  /** Fires when a machine is removed due to missed heartbeats. */
  onMachineTimeout?: (machine: ConnectedMachine) => void;

  constructor(heartbeatTimeoutMs = 90_000) {
    this.heartbeatTimeoutMs = heartbeatTimeoutMs;
  }

  /** Start the heartbeat monitor interval. */
  start(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => this.checkHeartbeats(), HEARTBEAT_CHECK_INTERVAL);
  }

  /** Stop the heartbeat monitor. */
  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  addMachine(id: string, name: string): ConnectedMachine {
    const now = new Date();
    const machine: ConnectedMachine = {
      id,
      name,
      agents: [],
      connectedAt: now,
      lastHeartbeat: now,
      activeRuns: 0,
    };
    this.machines.set(id, machine);
    return machine;
  }

  removeMachine(id: string): ConnectedMachine | undefined {
    const machine = this.machines.get(id);
    if (machine) this.machines.delete(id);
    return machine;
  }

  getMachine(id: string): ConnectedMachine | undefined {
    return this.machines.get(id);
  }

  getAllMachines(): ConnectedMachine[] {
    return [...this.machines.values()];
  }

  get size(): number {
    return this.machines.size;
  }

  updateAgents(machineId: string, agents: MachineAgent[]): void {
    const machine = this.machines.get(machineId);
    if (machine) machine.agents = agents;
  }

  updateHeartbeat(machineId: string, activeRuns: number): void {
    const machine = this.machines.get(machineId);
    if (machine) {
      machine.lastHeartbeat = new Date();
      machine.activeRuns = activeRuns;
    }
  }

  /** Merge agents from all connected machines, tagging each with origin. */
  getAllAgents(): AggregatedAgent[] {
    const result: AggregatedAgent[] = [];
    for (const machine of this.machines.values()) {
      for (const agent of machine.agents) {
        result.push({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          steps: agent.steps,
          input_schema: agent.input_schema,
          machineId: machine.id,
          machineName: machine.name,
        });
      }
    }
    return result;
  }

  /** Find an agent by name query across all machines. Returns first match. */
  findAgent(query: string): AggregatedAgent | undefined {
    const lower = query.toLowerCase();
    return this.getAllAgents().find((a) => a.name.toLowerCase().includes(lower));
  }

  /** Find which machine owns a given agent ID. */
  getMachineForAgent(agentId: string): ConnectedMachine | undefined {
    for (const machine of this.machines.values()) {
      if (machine.agents.some((a) => a.id === agentId)) return machine;
    }
    return undefined;
  }

  /** Find all machines that have an agent with the given name. */
  getMachinesForAgentName(name: string): ConnectedMachine[] {
    const lower = name.toLowerCase();
    return this.getAllMachines().filter((m) =>
      m.agents.some((a) => a.name.toLowerCase() === lower),
    );
  }

  private checkHeartbeats(): void {
    const now = Date.now();
    for (const [id, machine] of this.machines) {
      if (now - machine.lastHeartbeat.getTime() > this.heartbeatTimeoutMs) {
        this.machines.delete(id);
        this.onMachineTimeout?.(machine);
      }
    }
  }
}
