/** Bridge client -- runs on each Vadgr machine, connects to gateway. */

import { WebSocket } from "ws";
import { VadgrAPIClient } from "./api-client.js";
import {
  createMessage,
  PROTOCOL_VERSION,
  type RunCommandPayload,
  type CancelCommandPayload,
  type WsMessage,
} from "./protocol.js";

export interface BridgeConfig {
  gatewayUrl: string;
  machineToken: string;
  machineName: string;
  localApiUrl: string;
}

const HEARTBEAT_INTERVAL_MS = 30_000;
const LOG_POLL_INTERVAL_MS = 5_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const INITIAL_RECONNECT_DELAY_MS = 1_000;

export class BridgeClient {
  private config: BridgeConfig;
  private localApi: VadgrAPIClient;
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
  private startTime = Date.now();
  private activeRuns = new Set<string>();
  private shouldReconnect = true;

  /** Fires on connection state changes. */
  onStateChange?: (state: "connecting" | "connected" | "disconnected") => void;

  constructor(config: BridgeConfig) {
    this.config = config;
    this.localApi = new VadgrAPIClient(config.localApiUrl);
  }

  connect(): void {
    this.shouldReconnect = true;
    this.onStateChange?.("connecting");

    this.ws = new WebSocket(this.config.gatewayUrl);

    this.ws.on("open", () => {
      this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
      this.authenticate();
    });

    this.ws.on("message", (data) => {
      this.handleMessage(String(data));
    });

    this.ws.on("close", () => {
      this.cleanup();
      this.onStateChange?.("disconnected");
      if (this.shouldReconnect) this.scheduleReconnect();
    });

    this.ws.on("error", (err) => {
      console.error(`[Bridge] WebSocket error: ${err.message}`);
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, "bridge disconnecting");
      this.ws = null;
    }
  }

  private authenticate(): void {
    this.send(createMessage("auth", {
      token: this.config.machineToken,
      machineName: this.config.machineName,
      version: PROTOCOL_VERSION,
    }));
    this.registerAgents().catch((err) => {
      console.error(`[Bridge] Failed to register agents: ${err.message}`);
    });
  }

  private async registerAgents(): Promise<void> {
    const agents = await this.localApi.listAgents();
    const mapped = agents.map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description || "",
      steps: a.steps || [],
      input_schema: a.input_schema || [],
    }));

    this.send(createMessage("register", { agents: mapped }));
    this.startHeartbeat();
    this.onStateChange?.("connected");
    console.log(`[Bridge] Registered ${mapped.length} agents as '${this.config.machineName}'`);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send(createMessage("heartbeat", {
        uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
        activeRuns: this.activeRuns.size,
      }));
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleMessage(raw: string): void {
    let msg: WsMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "run") {
      this.handleRunCommand(msg.payload as RunCommandPayload);
    } else if (msg.type === "cancel") {
      this.handleCancelCommand(msg.payload as CancelCommandPayload);
    }
  }

  private async handleRunCommand(payload: RunCommandPayload): Promise<void> {
    const { requestId, agentId, inputs } = payload;

    try {
      const result: any = await this.localApi.runAgent(agentId, inputs);
      const runId = result.run_id || result.id;

      this.activeRuns.add(runId);
      this.send(createMessage("run_started", {
        requestId,
        runId,
        agentName: result.agent_name || agentId,
      }));

      // Stream progress by polling local API
      this.streamProgress(runId, result.agent_name || agentId);
    } catch (err: any) {
      this.send(createMessage("run_failed", {
        runId: requestId,
        agentName: agentId,
        error: err.message,
      }));
    }
  }

  private async handleCancelCommand(payload: CancelCommandPayload): Promise<void> {
    try {
      await this.localApi.cancelRun(payload.runId);
      this.activeRuns.delete(payload.runId);
    } catch (err: any) {
      console.error(`[Bridge] Cancel failed: ${err.message}`);
    }
  }

  private async streamProgress(runId: string, agentName: string): Promise<void> {
    let lastLogCount = 0;
    let lastStepIndex = 0;

    const poll = async (): Promise<void> => {
      try {
        const run: any = await this.localApi.getRun(runId);

        if (run.status === "completed") {
          this.send(createMessage("run_completed", {
            runId,
            agentName,
            outputs: run.outputs || {},
          }));
          this.activeRuns.delete(runId);
          return;
        }

        if (run.status === "failed") {
          const error = typeof run.outputs === "object"
            ? run.outputs?.error || "Unknown error"
            : String(run.outputs || "Unknown error");
          this.send(createMessage("run_failed", {
            runId,
            agentName,
            error,
          }));
          this.activeRuns.delete(runId);
          return;
        }

        // Check for new logs to detect step progress
        const logs = await this.localApi.getRunLogs(runId);
        if (logs.length > lastLogCount) {
          // Look for step completion events
          for (let i = lastLogCount; i < logs.length; i++) {
            const log = logs[i] as any;
            if (log.step_num && log.step_num > lastStepIndex) {
              lastStepIndex = log.step_num;
              this.send(createMessage("progress", {
                runId,
                agentName,
                stepIndex: log.step_num,
                stepTotal: log.step_total || 0,
                stepName: log.step_name || `Step ${log.step_num}`,
                message: log.message || log.summary || "",
              }));
            }
          }
          lastLogCount = logs.length;
        }

        // Continue polling
        setTimeout(() => poll(), LOG_POLL_INTERVAL_MS);
      } catch {
        // API temporarily unreachable, keep polling
        setTimeout(() => poll(), LOG_POLL_INTERVAL_MS);
      }
    };

    // Start polling after a short delay (let the run initialize)
    setTimeout(() => poll(), LOG_POLL_INTERVAL_MS);
  }

  private send(msg: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private cleanup(): void {
    this.stopHeartbeat();
    this.activeRuns.clear();
  }

  private scheduleReconnect(): void {
    console.log(`[Bridge] Reconnecting in ${this.reconnectDelay / 1000}s...`);
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
        this.connect();
      }
    }, this.reconnectDelay);
  }
}
