/** Discord embed builders for rich message formatting. */

import { EmbedBuilder } from "discord.js";

const COLORS = {
  success: 0x22c55e,
  running: 0xeab308,
  error: 0xef4444,
  info: 0x5865f2,   // Discord blurple
  neutral: 0x2b2d31, // Discord dark
} as const;

const BOT_NAME = "Vadgr";

export function greetingEmbed(
  userName: string,
  agents: { name: string; machineName?: string; steps?: { name: string }[]; description?: string }[],
  machines: { name: string; agentCount: number }[],
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setAuthor({ name: BOT_NAME })
    .setTitle(`Hey ${userName}!`);

  const lines: string[] = [];

  if (machines.length > 0) {
    lines.push("**Machines**");
    for (const m of machines) {
      lines.push(`> \u{1F7E2} **${m.name}** \u2014 ${m.agentCount} agent${m.agentCount === 1 ? "" : "s"}`);
    }
    lines.push("");
  }

  if (agents.length > 0) {
    lines.push("**Agents**");
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i]!;
      const steps = a.steps?.length ? `${a.steps.length} steps` : "";
      const machine = a.machineName ? `\u2022 ${a.machineName}` : "";
      const desc = a.description ? ` \u2014 ${a.description.slice(0, 60)}` : "";
      const meta = [steps, machine].filter(Boolean).join(" \u2022 ");
      lines.push(`> **${i + 1}.** \`${a.name}\`${desc}`);
      if (meta) lines.push(`>     ${meta}`);
    }
  } else {
    lines.push("No agents registered yet. Create one with `vadgr agents create`.");
  }

  embed.setDescription(lines.join("\n"));
  embed.setFooter({ text: "/run \u00B7 /agents \u00B7 /status \u00B7 /machines" });
  return embed;
}

export function agentListEmbed(
  agents: { name: string; description?: string; machineName?: string; steps?: { name: string }[] }[],
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setAuthor({ name: BOT_NAME })
    .setTitle("Agents");

  if (agents.length === 0) {
    embed.setDescription("No agents registered.");
    return embed;
  }

  const lines: string[] = [];
  for (const a of agents.slice(0, 20)) {
    const desc = a.description?.slice(0, 80) || "*No description*";
    const steps = a.steps?.length ? `${a.steps.length} steps` : "";
    const machine = a.machineName ? a.machineName : "";
    const meta = [steps, machine].filter(Boolean).join(" \u2022 ");
    lines.push(`**${a.name}**`);
    lines.push(`> ${desc}`);
    if (meta) lines.push(`> ${meta}`);
  }

  if (agents.length > 20) {
    lines.push(`\n*...and ${agents.length - 20} more*`);
  }

  embed.setDescription(lines.join("\n"));
  return embed;
}

export function runStartedEmbed(agentName: string, runId: string, machineName?: string): EmbedBuilder {
  const lines: string[] = [];
  if (machineName) lines.push(`on **${machineName}**`);
  lines.push(`Run \`${runId.slice(0, 8)}\``);
  lines.push("");
  lines.push(progressBar(0, 1) + " Starting...");

  return new EmbedBuilder()
    .setColor(COLORS.running)
    .setAuthor({ name: BOT_NAME })
    .setTitle(`\u{1F680} ${agentName}`)
    .setDescription(lines.join("\n"))
    .setTimestamp();
}

export function progressEmbed(
  agentName: string,
  runId: string,
  stepIndex: number,
  stepTotal: number,
  stepName: string,
  machineName?: string,
): EmbedBuilder {
  const lines: string[] = [];
  if (machineName) lines.push(`on **${machineName}**`);
  lines.push(`Run \`${runId.slice(0, 8)}\``);
  lines.push("");
  lines.push(`${progressBar(stepIndex, stepTotal)} **${stepIndex}/${stepTotal}** ${stepName}`);

  return new EmbedBuilder()
    .setColor(COLORS.running)
    .setAuthor({ name: BOT_NAME })
    .setTitle(`\u{1F504} ${agentName}`)
    .setDescription(lines.join("\n"))
    .setTimestamp();
}

export function runCompletedEmbed(
  agentName: string,
  runId: string,
  outputs: Record<string, unknown>,
  machineName?: string,
): EmbedBuilder {
  const lines: string[] = [];
  if (machineName) lines.push(`on **${machineName}**`);
  lines.push(`Run \`${runId.slice(0, 8)}\``);
  lines.push("");
  lines.push(progressBar(1, 1) + " **Complete**");

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setAuthor({ name: BOT_NAME })
    .setTitle(`\u{2705} ${agentName} finished!`)
    .setDescription(lines.join("\n"))
    .setTimestamp();

  for (const [key, val] of Object.entries(outputs)) {
    if (typeof val === "string" && val.length < 500) {
      embed.addFields({ name: key, value: val || "(empty)", inline: false });
    }
  }

  return embed;
}

export function runFailedEmbed(
  agentName: string,
  runId: string,
  error: string,
  machineName?: string,
): EmbedBuilder {
  const lines: string[] = [];
  if (machineName) lines.push(`on **${machineName}**`);
  lines.push(`Run \`${runId.slice(0, 8)}\``);
  lines.push("");
  lines.push(`**Error:** ${error.slice(0, 400)}`);
  lines.push("");
  lines.push(`resume with \`/cancel run_id:${runId.slice(0, 8)}\``);

  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setAuthor({ name: BOT_NAME })
    .setTitle(`\u{274C} ${agentName} failed`)
    .setDescription(lines.join("\n"))
    .setTimestamp();
}

export function statusEmbed(runs: Record<string, unknown>[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setAuthor({ name: BOT_NAME })
    .setTitle("Recent Runs");

  if (runs.length === 0) {
    embed.setDescription("No runs. Everything is idle.");
    return embed;
  }

  const lines = runs.slice(0, 15).map((r: any) => {
    const id = (r.id || "").slice(0, 8);
    const icon = r.status === "completed" ? "\u{2705}" : r.status === "failed" ? "\u{274C}" : "\u{1F7E1}";
    const machine = r.machine_name ? ` \u2022 ${r.machine_name}` : "";
    return `${icon} \`${id}\` **${r.agent_name || "-"}** \u2014 ${r.status || "?"}${machine}`;
  });

  embed.setDescription(lines.join("\n"));
  return embed;
}

export function machinesEmbed(
  machines: { name: string; agentCount: number; connectedAt: Date; activeRuns: number }[],
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setAuthor({ name: BOT_NAME })
    .setTitle("Connected Machines");

  if (machines.length === 0) {
    embed.setDescription("No machines connected.\nRun `vadgr gateway connect` on your machines to register them.");
    return embed;
  }

  const lines: string[] = [];
  for (const m of machines) {
    const uptime = Math.floor((Date.now() - m.connectedAt.getTime()) / 60_000);
    lines.push(`\u{1F7E2} **${m.name}**`);
    lines.push(`> ${m.agentCount} agents \u2022 ${m.activeRuns} active runs \u2022 up ${uptime}m`);
  }

  embed.setDescription(lines.join("\n"));
  return embed;
}

export function helpEmbed(): EmbedBuilder {
  const lines = [
    "**Slash Commands**",
    "> `/run <agent>` \u2014 Run an agent",
    "> `/agents` \u2014 List all agents",
    "> `/status` \u2014 Show recent runs",
    "> `/cancel <id>` \u2014 Cancel a run",
    "> `/logs <id>` \u2014 Show run logs",
    "> `/machines` \u2014 Show connected machines",
    "",
    "**Text Commands**",
    "> `hey` \u2014 Greeting + agent list",
    "> `run <agent>` \u2014 Start an agent",
    "> `status` \u2014 Show runs",
    "> `help` \u2014 This message",
    "",
    "Or just describe what you want and I'll figure it out.",
  ];

  return new EmbedBuilder()
    .setColor(COLORS.neutral)
    .setAuthor({ name: BOT_NAME })
    .setTitle("Commands")
    .setDescription(lines.join("\n"));
}

export function errorEmbed(title: string, message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setTitle(title)
    .setDescription(message);
}

/** Unicode progress bar with percentage. Uses triangular chars for a bar look. */
export function progressBar(current: number, total: number, length = 12): string {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const filled = total > 0 ? Math.round((current / total) * length) : 0;
  const bar = "\u25B0".repeat(filled) + "\u25B1".repeat(length - filled);
  return `${bar} ${pct}%`;
}
