/** WebSocket protocol types shared by gateway server and bridge client. */

// -- Agent and input descriptors (sent during registration) --

export interface MachineAgent {
  id: string;
  name: string;
  description?: string;
  steps: { name: string }[];
  input_schema: InputField[];
}

export interface InputField {
  name: string;
  type: string;
  required: boolean;
  label?: string;
  description?: string;
}

// -- Message envelope --

export interface WsMessage<T extends string = string, P = unknown> {
  type: T;
  payload: P;
  timestamp: string;
}

// -- Machine -> Gateway messages --

export interface AuthPayload {
  token: string;
  machineName: string;
  version: string;
}

export interface RegisterPayload {
  agents: MachineAgent[];
}

export interface HeartbeatPayload {
  uptimeSeconds: number;
  activeRuns: number;
}

export interface RunStartedPayload {
  requestId: string;
  runId: string;
  agentName: string;
}

export interface ProgressPayload {
  runId: string;
  agentName: string;
  stepIndex: number;
  stepTotal: number;
  stepName: string;
  message: string;
}

export interface RunCompletedPayload {
  runId: string;
  agentName: string;
  outputs: Record<string, unknown>;
}

export interface RunFailedPayload {
  runId: string;
  agentName: string;
  error: string;
}

// Union of all machine-to-gateway message types
export type MachineToGateway =
  | WsMessage<"auth", AuthPayload>
  | WsMessage<"register", RegisterPayload>
  | WsMessage<"heartbeat", HeartbeatPayload>
  | WsMessage<"run_started", RunStartedPayload>
  | WsMessage<"progress", ProgressPayload>
  | WsMessage<"run_completed", RunCompletedPayload>
  | WsMessage<"run_failed", RunFailedPayload>;

// -- Gateway -> Machine messages --

export interface RunCommandPayload {
  requestId: string;
  agentId: string;
  inputs: Record<string, string>;
}

export interface CancelCommandPayload {
  runId: string;
}

export type GatewayToMachine =
  | WsMessage<"run", RunCommandPayload>
  | WsMessage<"cancel", CancelCommandPayload>
  | WsMessage<"status", Record<string, never>>;

// -- Helpers --

export const PROTOCOL_VERSION = "1";

export function createMessage<T extends string, P>(type: T, payload: P): WsMessage<T, P> {
  return { type, payload, timestamp: new Date().toISOString() };
}

export function parseMessage(raw: string): WsMessage | null {
  try {
    const data = JSON.parse(raw);
    if (typeof data === "object" && data !== null && typeof data.type === "string") {
      return data as WsMessage;
    }
  } catch {
    // Invalid JSON
  }
  return null;
}

export function isAuthMessage(msg: WsMessage): msg is WsMessage<"auth", AuthPayload> {
  return msg.type === "auth";
}

export function isRegisterMessage(msg: WsMessage): msg is WsMessage<"register", RegisterPayload> {
  return msg.type === "register";
}

export function isHeartbeatMessage(msg: WsMessage): msg is WsMessage<"heartbeat", HeartbeatPayload> {
  return msg.type === "heartbeat";
}

export function isProgressMessage(msg: WsMessage): msg is WsMessage<"progress", ProgressPayload> {
  return msg.type === "progress";
}

export function isRunStartedMessage(msg: WsMessage): msg is WsMessage<"run_started", RunStartedPayload> {
  return msg.type === "run_started";
}

export function isRunCompletedMessage(msg: WsMessage): msg is WsMessage<"run_completed", RunCompletedPayload> {
  return msg.type === "run_completed";
}

export function isRunFailedMessage(msg: WsMessage): msg is WsMessage<"run_failed", RunFailedPayload> {
  return msg.type === "run_failed";
}
