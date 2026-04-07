/** WebSocket server for multi-machine gateway. Machines connect inbound. */

import { WebSocketServer, WebSocket } from "ws";
import { MachineRegistry, type ConnectedMachine } from "./machine-registry.js";
import {
  parseMessage,
  isAuthMessage,
  isRegisterMessage,
  isHeartbeatMessage,
  isRunStartedMessage,
  isProgressMessage,
  isRunCompletedMessage,
  isRunFailedMessage,
  type WsMessage,
  type GatewayToMachine,
  type RunStartedPayload,
  type ProgressPayload,
  type RunCompletedPayload,
  type RunFailedPayload,
  PROTOCOL_VERSION,
} from "./protocol.js";

export interface WsServerConfig {
  port: number;
  validTokens: Map<string, string>;  // token -> machine name hint
  heartbeatTimeoutMs?: number;
}

const AUTH_TIMEOUT_MS = 10_000;  // 10s to authenticate after connecting

export class GatewayWsServer {
  private wss: WebSocketServer | null = null;
  private registry: MachineRegistry;
  private config: WsServerConfig;
  private wsToMachineId = new Map<WebSocket, string>();
  private machineIdToWs = new Map<string, WebSocket>();
  private machineIdCounter = 0;

  // Event callbacks
  onRunStarted?: (machineId: string, payload: RunStartedPayload) => void;
  onProgress?: (machineId: string, payload: ProgressPayload) => void;
  onRunCompleted?: (machineId: string, payload: RunCompletedPayload) => void;
  onRunFailed?: (machineId: string, payload: RunFailedPayload) => void;
  onMachineConnected?: (machine: ConnectedMachine) => void;
  onMachineDisconnected?: (machine: ConnectedMachine) => void;

  constructor(config: WsServerConfig) {
    this.config = config;
    this.registry = new MachineRegistry(config.heartbeatTimeoutMs);
    this.registry.onMachineTimeout = (machine) => {
      this.cleanupMachine(machine.id);
      this.onMachineDisconnected?.(machine);
    };
  }

  getRegistry(): MachineRegistry {
    return this.registry;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.config.port });
      this.wss.on("listening", () => {
        console.log(`[WS Server] Listening on port ${this.config.port}`);
        this.registry.start();
        resolve();
      });
      this.wss.on("error", reject);
      this.wss.on("connection", (ws) => this.handleConnection(ws));
    });
  }

  async stop(): Promise<void> {
    this.registry.stop();
    for (const ws of this.wsToMachineId.keys()) {
      ws.close(1000, "server shutting down");
    }
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  sendToMachine(machineId: string, message: GatewayToMachine): boolean {
    const ws = this.machineIdToWs.get(machineId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(message));
    return true;
  }

  private handleConnection(ws: WebSocket): void {
    let authenticated = false;
    let machineId: string | null = null;

    // Auth timeout -- close if not authenticated within AUTH_TIMEOUT_MS
    const authTimer = setTimeout(() => {
      if (!authenticated) {
        ws.close(4001, "authentication timeout");
      }
    }, AUTH_TIMEOUT_MS);

    ws.on("message", (data) => {
      const msg = parseMessage(String(data));
      if (!msg) return;

      if (!authenticated) {
        if (!isAuthMessage(msg)) {
          ws.close(4002, "first message must be auth");
          clearTimeout(authTimer);
          return;
        }

        const { token, machineName } = msg.payload;
        if (!this.config.validTokens.has(token)) {
          ws.close(4003, "invalid token");
          clearTimeout(authTimer);
          return;
        }

        authenticated = true;
        clearTimeout(authTimer);
        machineId = `machine-${++this.machineIdCounter}`;

        const machine = this.registry.addMachine(machineId, machineName);
        this.wsToMachineId.set(ws, machineId);
        this.machineIdToWs.set(machineId, ws);
        this.onMachineConnected?.(machine);

        console.log(`[WS Server] ${machineName} authenticated (${machineId})`);
        return;
      }

      // Authenticated messages
      this.handleMessage(machineId!, msg);
    });

    ws.on("close", () => {
      clearTimeout(authTimer);
      if (machineId) {
        const machine = this.registry.removeMachine(machineId);
        this.cleanupMachine(machineId);
        if (machine) this.onMachineDisconnected?.(machine);
      }
    });

    ws.on("error", (err) => {
      console.error(`[WS Server] Connection error:`, err.message);
    });
  }

  private handleMessage(machineId: string, msg: WsMessage): void {
    if (isRegisterMessage(msg)) {
      this.registry.updateAgents(machineId, msg.payload.agents);
      const machine = this.registry.getMachine(machineId);
      console.log(`[WS Server] ${machine?.name} registered ${msg.payload.agents.length} agents`);
      return;
    }

    if (isHeartbeatMessage(msg)) {
      this.registry.updateHeartbeat(machineId, msg.payload.activeRuns);
      return;
    }

    if (isRunStartedMessage(msg)) {
      this.onRunStarted?.(machineId, msg.payload);
      return;
    }

    if (isProgressMessage(msg)) {
      this.onProgress?.(machineId, msg.payload);
      return;
    }

    if (isRunCompletedMessage(msg)) {
      this.onRunCompleted?.(machineId, msg.payload);
      return;
    }

    if (isRunFailedMessage(msg)) {
      this.onRunFailed?.(machineId, msg.payload);
      return;
    }
  }

  private cleanupMachine(machineId: string): void {
    const ws = this.machineIdToWs.get(machineId);
    if (ws) {
      this.wsToMachineId.delete(ws);
      this.machineIdToWs.delete(machineId);
      if (ws.readyState === WebSocket.OPEN) ws.close(1000);
    }
  }
}
