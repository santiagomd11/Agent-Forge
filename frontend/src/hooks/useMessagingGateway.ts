/**
 * Module-scoped state for messaging gateway toggle operations.
 * Same pattern as useComputerUse.ts -- survives React remounts.
 */

import { api } from '../api/client';

export interface GatewayStatus {
  discord: {
    enabled: boolean;
    has_token: boolean;
    token_masked: string | null;
    bot_id: string | null;
  };
  gateway_running: boolean;
  gateway_pid: number | null;
}

let inflight: {
  promise: Promise<GatewayStatus>;
  activating: boolean;
} | null = null;

export function getGatewayInflight() {
  return inflight;
}

export async function updateDiscordGateway(
  enabled: boolean,
  token?: string | null,
): Promise<GatewayStatus> {
  const promise = api.put<GatewayStatus>('/settings/messaging-gateway/discord', {
    enabled,
    token: token ?? undefined,
  });

  inflight = { promise, activating: enabled };

  try {
    return await promise;
  } finally {
    inflight = null;
  }
}
