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

    env = {**os.environ}
    if port:
        env["GATEWAY_WEBHOOK_PORT"] = str(port)
    if config:
        env["GATEWAY_CONFIG"] = config

    print_info("Starting gateway...")
    log_file = open(FORGE_HOME / "gateway.log", "w")
    proc = subprocess.Popen(
        ["python", "-m", "gateway"],
        cwd=str(FORGE_REPO),
        env=env,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        **_session_kwargs(),
    )
    _write_pid("gateway", proc.pid)

    time.sleep(2)
    if proc.poll() is not None:
        print_warning(f"Gateway failed to start. Check {FORGE_HOME / 'gateway.log'}")
        raise SystemExit(1)

    actual_port = port or 8585
    print_success(f"Gateway running on port {actual_port}")
    print_info(f"Webhook URL: http://0.0.0.0:{actual_port}/webhook/whatsapp")


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
