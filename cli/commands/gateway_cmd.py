"""Gateway commands -- start, stop, status for the messaging gateway."""

from __future__ import annotations

import os
import subprocess
import time
from pathlib import Path

import click

from cli.commands.service import _session_kwargs, _read_pid, _write_pid, _pid_alive
from cli.output import print_success, print_info, print_warning, print_table, status_text

FORGE_HOME = Path(os.environ.get("FORGE_HOME", Path.home() / ".forge"))
PID_DIR = FORGE_HOME / "pids"
FORGE_REPO = Path(__file__).resolve().parent.parent.parent


@click.group("gateway")
def gateway_group():
    """Manage the messaging gateway (WhatsApp, Telegram, etc.)."""


@gateway_group.command("start")
@click.option("--port", "-p", default=None, type=int, help="Webhook server port")
@click.option("--config", "-c", default=None, help="Path to gateway.yaml")
def start_gateway(port, config):
    """Start the messaging gateway server."""
    pid = _read_pid("gateway")
    if pid and _pid_alive(pid):
        print_warning("Gateway is already running.")
        raise SystemExit(1)

    PID_DIR.mkdir(parents=True, exist_ok=True)

    gateway_dir = FORGE_REPO / "gateway"
    if not (gateway_dir / "package.json").exists():
        print_warning("Gateway module not found. Expected gateway/package.json")
        raise SystemExit(1)

    env = {**os.environ}
    if port:
        env["AGENT_FORGE_PORT"] = str(port)
    if config:
        env["GATEWAY_CONFIG"] = config

    # Read API port from pid file (written by `vadgr start`)
    api_port_file = PID_DIR / "api.port"
    if api_port_file.exists():
        env.setdefault("AGENT_FORGE_PORT", api_port_file.read_text().strip())

    print_info("Starting gateway...")
    log_file = open(FORGE_HOME / "gateway.log", "w")

    # Check if built dist exists, prefer node over npx tsx for production
    if (gateway_dir / "dist" / "index.js").exists():
        cmd = ["node", "dist/index.js"]
    else:
        cmd = ["npx", "tsx", "src/index.ts"]

    proc = subprocess.Popen(
        cmd,
        cwd=str(gateway_dir),
        env=env,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        **_session_kwargs(),
    )
    _write_pid("gateway", proc.pid)

    time.sleep(3)
    if proc.poll() is not None:
        print_warning(f"Gateway failed to start. Check {FORGE_HOME / 'gateway.log'}")
        raise SystemExit(1)

    print_success("Gateway running (Discord adapter)")
    print_info("Bot will respond to @mentions and DMs")


@gateway_group.command("stop")
def stop_gateway():
    """Stop the messaging gateway."""
    pid = _read_pid("gateway")
    if pid:
        from cli.commands.service import _kill_tree
        _kill_tree(pid)
        print_info(f"Stopped gateway (PID {pid})")
        (PID_DIR / "gateway.pid").unlink(missing_ok=True)
    else:
        print_warning("Gateway is not running.")


@gateway_group.command("status")
def gateway_status():
    """Show gateway status."""
    pid = _read_pid("gateway")
    if pid and _pid_alive(pid):
        print_table(["Service", "PID", "Status"], [["gateway", str(pid), status_text("running")]])
    else:
        print_table(["Service", "PID", "Status"], [["gateway", "-", status_text("stopped")]])
