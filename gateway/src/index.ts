/** Gateway entry point. */

import * as fs from "fs";
import * as path from "path";
import { Gateway, type GatewayConfig } from "./server.js";
import type { WsServerConfig } from "./ws-server.js";

const DEFAULT_API_PORT = 8000;
const DEFAULT_WS_PORT = 9443;
const PID_DIR = path.join(process.env.HOME || "~", ".forge", "pids");
const GATEWAY_CONFIG_PATH = path.join(process.env.HOME || "~", ".forge", "gateway.json");

/** Resolve API URL: ~/.forge/pids/api.port → AGENT_FORGE_PORT env → default 8000 */
function resolveApiUrl(): string {
  const host = process.env.AGENT_FORGE_HOST || "127.0.0.1";

  // 1. Check running service port file (written by `vadgr start`)
  const portFile = path.join(PID_DIR, "api.port");
  try {
    const port = parseInt(fs.readFileSync(portFile, "utf-8").trim(), 10);
    if (port > 0) return `http://${host}:${port}`;
  } catch {
    // Port file doesn't exist -- service may not be started via CLI
  }

  // 2. Environment variable (same as api/config.py)
  const envPort = process.env.AGENT_FORGE_PORT;
  if (envPort) return `http://${host}:${envPort}`;

  // 3. Default
  return `http://${host}:${DEFAULT_API_PORT}`;
}

/** Load machine tokens from ~/.forge/gateway.json to enable multi-machine mode. */
function loadWsConfig(): WsServerConfig | undefined {
  try {
    if (!fs.existsSync(GATEWAY_CONFIG_PATH)) return undefined;
    const raw = JSON.parse(fs.readFileSync(GATEWAY_CONFIG_PATH, "utf-8"));
    const machines = raw.machines;
    if (!machines?.tokens?.length) return undefined;

    const port = machines.ws_port || parseInt(process.env.GATEWAY_WS_PORT || "", 10) || DEFAULT_WS_PORT;
    const validTokens = new Map<string, string>();
    for (const entry of machines.tokens) {
      if (entry.token) validTokens.set(entry.token, entry.name || "unknown");
    }

    if (validTokens.size === 0) return undefined;
    return { port, validTokens };
  } catch {
    return undefined;
  }
}

const config: GatewayConfig = {
  apiUrl: resolveApiUrl(),
  discord: process.env.DISCORD_BOT_TOKEN
    ? { botToken: process.env.DISCORD_BOT_TOKEN }
    : undefined,
  ws: loadWsConfig(),
};

const gateway = new Gateway(config);

process.on("SIGINT", async () => {
  await gateway.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await gateway.stop();
  process.exit(0);
});

gateway.start().catch((err) => {
  console.error("[Gateway] Failed to start:", err);
  process.exit(1);
});
