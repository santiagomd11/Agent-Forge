/** Security layer: allowlist, sanitization, audit. */

import * as fs from "fs";
import * as path from "path";
import type { InboundMessage } from "./models.js";

const DANGEROUS_CHARS = /[;&|`$(){}<>\\]/g;
const MAX_MESSAGE_LENGTH = 2000;

export const SILENT_REJECT = Symbol("SILENT_REJECT");

export interface SecurityConfig {
  allowedSenders: string[];
  auditLogPath?: string;
}

export function defaultSecurityConfig(): SecurityConfig {
  return {
    allowedSenders: [],
  };
}

type CheckResult = null | typeof SILENT_REJECT | string;

export class SecurityGuard {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * Validate a message.
   * Returns null (OK), SILENT_REJECT (unknown sender), or error string.
   */
  check(message: InboundMessage): CheckResult {
    this.audit(message);

    // 1. Sender allowlist
    if (this.config.allowedSenders.length > 0) {
      if (!this.config.allowedSenders.includes(message.senderId)) {
        return SILENT_REJECT;
      }
    }

    // 2. Message length
    if (message.text.length > MAX_MESSAGE_LENGTH) {
      return `Message too long (max ${MAX_MESSAGE_LENGTH} chars).`;
    }

    return null;
  }

  sanitizeInput(value: string): string {
    return value.replace(DANGEROUS_CHARS, "").trim();
  }

  private audit(message: InboundMessage): void {
    if (!this.config.auditLogPath) return;
    const entry = {
      timestamp: message.timestamp.toISOString(),
      channel: message.channel,
      senderId: message.senderId,
      senderName: message.senderName,
      text: message.text.slice(0, 200),
    };
    const dir = path.dirname(this.config.auditLogPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.config.auditLogPath, JSON.stringify(entry) + "\n");
  }
}
