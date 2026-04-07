/** AgentAPI implementation that routes to machines via WebSocket. */

import { randomUUID } from "node:crypto";
import type { AgentAPI } from "./models.js";
import type { MachineRegistry, AggregatedAgent } from "./machine-registry.js";
import type { GatewayWsServer } from "./ws-server.js";
import { createMessage, type RunStartedPayload } from "./protocol.js";

const RUN_START_TIMEOUT_MS = 30_000;

export class MultiMachineAPI implements AgentAPI {
  private registry: MachineRegistry;
  private wsServer: GatewayWsServer;

  /** Maps runId -> machineId for routing getRun/cancel/resume/logs. */
  private runToMachine = new Map<string, string>();

  /** Pending run requests waiting for run_started from bridge. */
  private pendingRuns = new Map<string, {
    resolve: (value: Record<string, unknown>) => void;
    reject: (reason: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();

  constructor(registry: MachineRegistry, wsServer: GatewayWsServer) {
    this.registry = registry;
    this.wsServer = wsServer;

    // Listen for run_started to resolve pending requests
    this.wsServer.onRunStarted = (machineId, payload) => {
      this.handleRunStarted(machineId, payload);
    };
  }

  async listAgents(): Promise<Record<string, unknown>[]> {
    return this.registry.getAllAgents().map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description || "",
      steps: a.steps,
      input_schema: a.input_schema,
      machineName: a.machineName,
      machineId: a.machineId,
    }));
  }

  async runAgent(agentId: string, inputs: Record<string, string>): Promise<Record<string, unknown>> {
    const machine = this.registry.getMachineForAgent(agentId);
    if (!machine) {
      throw new Error(`No connected machine has agent '${agentId}'`);
    }

    const requestId = randomUUID();

    // Send run command to machine
    const sent = this.wsServer.sendToMachine(machine.id, createMessage("run", {
      requestId,
      agentId,
      inputs,
    }));

    if (!sent) {
      throw new Error(`Machine '${machine.name}' is not reachable`);
    }

    // Wait for run_started response from bridge
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRuns.delete(requestId);
        reject(new Error(`Run start timed out on '${machine.name}'`));
      }, RUN_START_TIMEOUT_MS);

      this.pendingRuns.set(requestId, { resolve, reject, timer });
    });
  }

  async listRuns(): Promise<Record<string, unknown>[]> {
    // Return tracked runs with machine info
    const runs: Record<string, unknown>[] = [];
    for (const [runId, machineId] of this.runToMachine) {
      const machine = this.registry.getMachine(machineId);
      runs.push({
        id: runId,
        machine_name: machine?.name || "unknown",
        status: "running",
      });
    }
    return runs;
  }

  async getRun(runId: string): Promise<Record<string, unknown>> {
    // For multi-machine, run status comes via WebSocket events (progress/completed/failed).
    // This is a best-effort lookup from local tracking.
    const machineId = this.runToMachine.get(runId);
    const machine = machineId ? this.registry.getMachine(machineId) : undefined;
    return {
      id: runId,
      status: machineId ? "running" : "unknown",
      machine_name: machine?.name || "unknown",
    };
  }

  async cancelRun(runId: string): Promise<Record<string, unknown>> {
    const machineId = this.runToMachine.get(runId);
    if (!machineId) throw new Error(`Unknown run '${runId}'`);

    const sent = this.wsServer.sendToMachine(machineId, createMessage("cancel", { runId }));
    if (!sent) throw new Error("Machine is not reachable");

    return { status: "cancelling", run_id: runId };
  }

  async resumeRun(runId: string): Promise<Record<string, unknown>> {
    // Resume is not directly supported in multi-machine mode yet.
    // The bridge would need to call the local API's resume endpoint.
    throw new Error("Resume is not yet supported in multi-machine mode");
  }

  async getRunLogs(runId: string): Promise<Record<string, unknown>[]> {
    // Logs come via progress events. Not directly queryable in multi-machine mode.
    return [];
  }

  /** Track a run-to-machine mapping (called when run starts). */
  trackRun(runId: string, machineId: string): void {
    this.runToMachine.set(runId, machineId);
  }

  /** Remove a run from tracking (called when run completes/fails). */
  untrackRun(runId: string): void {
    this.runToMachine.delete(runId);
  }

  private handleRunStarted(machineId: string, payload: RunStartedPayload): void {
    const pending = this.pendingRuns.get(payload.requestId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRuns.delete(payload.requestId);
      this.trackRun(payload.runId, machineId);
      pending.resolve({ run_id: payload.runId, machine_id: machineId });
    }
  }
}
