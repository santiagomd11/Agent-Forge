"""Message router -- maps natural language commands to agent runs.

Handles conversational flow: greeting → agent discovery → input collection
→ run trigger → progress streaming → result delivery.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from gateway.models import InboundMessage, CommandResult

logger = logging.getLogger(__name__)


class ConversationState(Enum):
    """Tracks where the user is in the command flow."""

    IDLE = "idle"
    AWAITING_AGENT = "awaiting_agent"
    AWAITING_INPUTS = "awaiting_inputs"
    CONFIRMING = "confirming"


@dataclass
class Session:
    """Per-user conversation state."""

    state: ConversationState = ConversationState.IDLE
    selected_agent: dict | None = None
    collected_inputs: dict = field(default_factory=dict)
    pending_input: str | None = None  # which input we're waiting for


class MessageRouter:
    """Parses user messages and routes them to agent runs.

    Uses a simple conversation flow instead of requiring exact commands.
    The router talks to the Vadgr API to discover agents and trigger runs.
    """

    def __init__(self, api_client):
        self._api = api_client
        self._sessions: dict[str, Session] = {}

    def _get_session(self, sender_id: str) -> Session:
        if sender_id not in self._sessions:
            self._sessions[sender_id] = Session()
        return self._sessions[sender_id]

    async def handle(self, message: InboundMessage) -> CommandResult:
        """Process an inbound message and return what to say back."""
        text = message.text.strip()
        session = self._get_session(message.sender_id)

        # Global commands work in any state
        lower = text.lower()

        if lower in ("help", "?", "commands"):
            return self._help()

        if lower in ("hi", "hey", "hello", "hola", "que hay", "buenas"):
            session.state = ConversationState.IDLE
            return await self._greet(message.sender_name)

        if lower in ("agents", "list agents", "what agents"):
            return await self._list_agents()

        if lower in ("status", "runs", "what's running"):
            return await self._status()

        if lower.startswith("cancel "):
            return await self._cancel(lower.split(" ", 1)[1])

        if lower.startswith("resume "):
            return await self._resume(lower.split(" ", 1)[1])

        if lower.startswith("logs "):
            return await self._logs(lower.split(" ", 1)[1])

        if lower.startswith("merge "):
            return CommandResult(response="Merge from chat isn't supported yet. Use the CLI or GitHub.")

        # State-dependent handling
        if session.state == ConversationState.AWAITING_AGENT:
            return await self._select_agent(session, text)

        if session.state == ConversationState.AWAITING_INPUTS:
            return await self._collect_input(session, text)

        if session.state == ConversationState.CONFIRMING:
            return await self._confirm(session, text)

        # Try to parse a run command from natural language
        return await self._parse_run_intent(session, text, message.sender_name)

    async def _greet(self, name: str) -> CommandResult:
        agents = await self._api.list_agents()
        agent_list = "\n".join(
            f"  {i+1}. {a['name']} ({len(a.get('steps', []))} steps)"
            for i, a in enumerate(agents)
        )
        return CommandResult(
            response=(
                f"Hey {name}! You have {len(agents)} agents ready:\n"
                f"{agent_list}\n\n"
                "What do you want to do?"
            )
        )

    def _help(self) -> CommandResult:
        return CommandResult(
            response=(
                "Available commands:\n"
                "  hey/hi -- see your agents\n"
                "  run <agent> -- start an agent run\n"
                "  status -- show active runs\n"
                "  resume <id> -- resume a failed run\n"
                "  cancel <id> -- cancel a running run\n"
                "  logs <id> -- show recent logs\n"
                "  help -- this message\n\n"
                "Or just describe what you want and I'll figure it out."
            )
        )

    async def _list_agents(self) -> CommandResult:
        agents = await self._api.list_agents()
        if not agents:
            return CommandResult(response="No agents registered. Create one first via the CLI.")
        lines = [f"  {a['name']} -- {a.get('description', '')[:60]}" for a in agents]
        return CommandResult(response="Your agents:\n" + "\n".join(lines))

    async def _status(self) -> CommandResult:
        runs = await self._api.list_runs()
        if not runs:
            return CommandResult(response="No runs. Everything is idle.")
        lines = []
        for r in runs[:10]:
            agent = r.get("agent_name", "-")
            status = r.get("status", "?")
            rid = r["id"][:8]
            lines.append(f"  {rid} | {agent} | {status}")
        return CommandResult(response="Recent runs:\n" + "\n".join(lines))

    async def _cancel(self, run_id: str) -> CommandResult:
        try:
            await self._api.cancel_run(run_id)
            return CommandResult(response=f"Cancelled run {run_id}.")
        except Exception as e:
            return CommandResult(response=f"Failed to cancel: {e}")

    async def _resume(self, run_id: str) -> CommandResult:
        try:
            result = await self._api.resume_run(run_id)
            msg = result.get("message", "Resuming...")
            return CommandResult(response=msg, run_id=run_id, is_async=True)
        except Exception as e:
            return CommandResult(response=f"Failed to resume: {e}")

    async def _logs(self, run_id: str) -> CommandResult:
        try:
            logs = await self._api.get_run_logs(run_id)
            if not logs:
                return CommandResult(response="No logs yet.")
            # Show last 5 entries
            lines = []
            for entry in logs[-5:]:
                msg = entry.get("message", entry.get("data", ""))
                if msg:
                    lines.append(f"  {msg[:100]}")
            return CommandResult(response="Recent logs:\n" + "\n".join(lines))
        except Exception as e:
            return CommandResult(response=f"Failed to get logs: {e}")

    async def _parse_run_intent(self, session: Session, text: str, sender_name: str) -> CommandResult:
        """Try to understand what the user wants to run."""
        lower = text.lower()

        # Direct: "run <agent name>"
        if lower.startswith("run "):
            agent_query = text[4:].strip()
            return await self._find_and_start_agent(session, agent_query)

        # Fuzzy: user mentions an agent name
        agents = await self._api.list_agents()
        for agent in agents:
            if agent["name"].lower() in lower:
                session.selected_agent = agent
                return await self._ask_for_inputs(session)

        # Can't figure it out -- ask
        session.state = ConversationState.AWAITING_AGENT
        agent_list = "\n".join(f"  {i+1}. {a['name']}" for i, a in enumerate(agents))
        return CommandResult(
            response=(
                f"I'm not sure what you mean. Which agent do you want to run?\n"
                f"{agent_list}\n\n"
                "Reply with the name or number."
            )
        )

    async def _find_and_start_agent(self, session: Session, query: str) -> CommandResult:
        agents = await self._api.list_agents()

        # Match by number
        if query.isdigit():
            idx = int(query) - 1
            if 0 <= idx < len(agents):
                session.selected_agent = agents[idx]
                return await self._ask_for_inputs(session)

        # Match by name (fuzzy)
        query_lower = query.lower()
        for agent in agents:
            if query_lower in agent["name"].lower():
                session.selected_agent = agent
                return await self._ask_for_inputs(session)

        return CommandResult(response=f"No agent matching '{query}'. Try 'agents' to see the list.")

    async def _select_agent(self, session: Session, text: str) -> CommandResult:
        """User is selecting an agent."""
        return await self._find_and_start_agent(session, text.strip())

    async def _ask_for_inputs(self, session: Session) -> CommandResult:
        """Ask for the next required input."""
        agent = session.selected_agent
        schema = agent.get("input_schema", [])

        # Find first required input not yet collected
        for inp in schema:
            name = inp["name"]
            if name not in session.collected_inputs:
                if inp.get("required", False):
                    session.state = ConversationState.AWAITING_INPUTS
                    session.pending_input = name
                    label = inp.get("label", name)
                    desc = inp.get("description", "")
                    return CommandResult(response=f"{label}?\n({desc})" if desc else f"{label}?")

        # All required inputs collected -- check for optional ones
        optional = [
            inp for inp in schema
            if not inp.get("required") and inp["name"] not in session.collected_inputs
        ]
        if optional:
            labels = ", ".join(inp.get("label", inp["name"]) for inp in optional)
            session.state = ConversationState.CONFIRMING
            return CommandResult(
                response=(
                    f"Optional inputs available: {labels}\n"
                    "Want to set any of these, or should I start the run?"
                )
            )

        # No optional inputs -- just run
        return await self._start_run(session)

    async def _collect_input(self, session: Session, text: str) -> CommandResult:
        """User is providing a value for a pending input."""
        if session.pending_input:
            session.collected_inputs[session.pending_input] = text.strip()
            session.pending_input = None
        return await self._ask_for_inputs(session)

    async def _confirm(self, session: Session, text: str) -> CommandResult:
        """User confirms or provides optional inputs."""
        lower = text.lower()
        if lower in ("yes", "start", "run", "go", "dale", "si", "ya"):
            return await self._start_run(session)

        if lower in ("no", "nah", "skip", "cancel", "na"):
            return await self._start_run(session)

        # Try to parse "key=value" or just answer the optional input
        agent = session.selected_agent
        schema = agent.get("input_schema", [])
        optional = [
            inp for inp in schema
            if not inp.get("required") and inp["name"] not in session.collected_inputs
        ]

        if "=" in text:
            key, _, value = text.partition("=")
            session.collected_inputs[key.strip()] = value.strip()
            return await self._ask_for_inputs(session)

        # Assume it's the value for the first uncollected optional
        if optional:
            session.collected_inputs[optional[0]["name"]] = text.strip()
            return await self._ask_for_inputs(session)

        return await self._start_run(session)

    async def _start_run(self, session: Session) -> CommandResult:
        """Trigger the agent run via the API."""
        agent = session.selected_agent
        inputs = session.collected_inputs.copy()

        # Reset session
        session.state = ConversationState.IDLE
        session.selected_agent = None
        session.collected_inputs = {}
        session.pending_input = None

        try:
            result = await self._api.run_agent(agent["id"], inputs)
            run_id = result.get("run_id", "?")
            return CommandResult(
                response=f"Starting {agent['name']}...\nRun ID: {run_id[:8]}\nI'll message you when it's done.",
                run_id=run_id,
                agent_name=agent["name"],
                is_async=True,
            )
        except Exception as e:
            return CommandResult(response=f"Failed to start run: {e}")
