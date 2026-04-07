/** Bridge entry point -- connects this machine to a remote gateway. */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { BridgeClient, type BridgeConfig } from "./bridge-client.js";

const CONFIG_PATH = path.join(os.homedir(), ".forge", "bridge.json");

function loadConfig(): BridgeConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`[Bridge] Config not found at ${CONFIG_PATH}`);
    console.error(`[Bridge] Run: vadgr gateway connect <gateway-url> --token <token> --name <machine-name>`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  if (!raw.gateway_url || !raw.machine_token || !raw.machine_name) {
    console.error(`[Bridge] Invalid config. Required: gateway_url, machine_token, machine_name`);
    process.exit(1);
  }

  return {
    gatewayUrl: raw.gateway_url,
    machineToken: raw.machine_token,
    machineName: raw.machine_name,
    localApiUrl: raw.local_api_url || "http://localhost:8000",
  };
}

function resolveLocalApiUrl(): string {
  // Check if API port file exists (written by vadgr start)
  const portFile = path.join(os.homedir(), ".forge", "pids", "api.port");
  try {
    if (fs.existsSync(portFile)) {
      const port = fs.readFileSync(portFile, "utf-8").trim();
      if (/^\d+$/.test(port)) return `http://127.0.0.1:${port}`;
    }
  } catch { /* ignore */ }

  const port = process.env["AGENT_FORGE_PORT"] || "8000";
  const host = process.env["AGENT_FORGE_HOST"] || "127.0.0.1";
  return `http://${host}:${port}`;
}

const config = loadConfig();
config.localApiUrl = resolveLocalApiUrl();

const bridge = new BridgeClient(config);

bridge.onStateChange = (state) => {
  console.log(`[Bridge] ${config.machineName}: ${state}`);
};

// Graceful shutdown
process.on("SIGINT", () => {
  bridge.disconnect();
  process.exit(0);
});
process.on("SIGTERM", () => {
  bridge.disconnect();
  process.exit(0);
});

bridge.connect();
