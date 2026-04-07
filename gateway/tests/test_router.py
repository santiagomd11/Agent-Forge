"""Tests for the message router."""

import pytest
from unittest.mock import AsyncMock

from gateway.models import InboundMessage
from gateway.router import MessageRouter, ConversationState


def _msg(text, sender_id="5731200000", sender_name="Santiago"):
    return InboundMessage(
        channel="whatsapp",
        chat_id=f"{sender_id}@s.whatsapp.net",
        sender_id=sender_id,
        sender_name=sender_name,
        text=text,
    )


def _mock_api(agents=None, runs=None):
    api = AsyncMock()
    api.list_agents.return_value = agents or [
        {
            "id": "agent-1",
            "name": "QA Engineer",
            "steps": [{"name": "Analyze"}, {"name": "Test"}],
            "input_schema": [
                {"name": "repo_path", "type": "text", "required": True, "label": "Repository Path", "description": "Path to repo"},
            ],
        },
        {
            "id": "agent-2",
            "name": "Software Engineer",
            "steps": [{"name": "Analyze"}, {"name": "Fix"}],
            "input_schema": [
                {"name": "task", "type": "text", "required": True, "label": "Task", "description": "What to fix"},
                {"name": "repo_path", "type": "text", "required": False, "label": "Repo", "description": "Path"},
            ],
        },
    ]
    api.list_runs.return_value = runs or []
    api.run_agent.return_value = {"run_id": "run-abc-123"}
    api.cancel_run.return_value = {"status": "cancelled"}
    api.resume_run.return_value = {"message": "Resuming from last completed step"}
    api.get_run_logs.return_value = [
        {"message": "Step 1 started"},
        {"message": "Step 1 done"},
    ]
    return api


class TestGreeting:
    @pytest.mark.asyncio
    async def test_hello_lists_agents(self):
        router = MessageRouter(_mock_api())
        result = await router.handle(_msg("hey"))
        assert "QA Engineer" in result.response
        assert "Software Engineer" in result.response
        assert "Santiago" in result.response

    @pytest.mark.asyncio
    async def test_hola_works(self):
        router = MessageRouter(_mock_api())
        result = await router.handle(_msg("hola"))
        assert "QA Engineer" in result.response


class TestHelp:
    @pytest.mark.asyncio
    async def test_help_command(self):
        router = MessageRouter(_mock_api())
        result = await router.handle(_msg("help"))
        assert "run" in result.response.lower()
        assert "status" in result.response.lower()
        assert "resume" in result.response.lower()


class TestStatus:
    @pytest.mark.asyncio
    async def test_status_no_runs(self):
        router = MessageRouter(_mock_api(runs=[]))
        result = await router.handle(_msg("status"))
        assert "idle" in result.response.lower() or "no runs" in result.response.lower()

    @pytest.mark.asyncio
    async def test_status_with_runs(self):
        runs = [{"id": "run-abc-123", "agent_name": "QA Engineer", "status": "running"}]
        router = MessageRouter(_mock_api(runs=runs))
        result = await router.handle(_msg("status"))
        assert "QA Engineer" in result.response
        assert "running" in result.response


class TestRunAgent:
    @pytest.mark.asyncio
    async def test_run_by_name_asks_for_input(self):
        router = MessageRouter(_mock_api())
        result = await router.handle(_msg("run QA Engineer"))
        # Should ask for repo_path (required input)
        assert "Repository Path" in result.response or "repo" in result.response.lower()

    @pytest.mark.asyncio
    async def test_provide_input_starts_run(self):
        api = _mock_api()
        router = MessageRouter(api)
        # Step 1: select agent
        await router.handle(_msg("run QA Engineer"))
        # Step 2: provide required input
        result = await router.handle(_msg("/home/santiago/repo"))
        assert "Starting" in result.response
        assert result.is_async
        assert result.run_id == "run-abc-123"
        api.run_agent.assert_called_once()

    @pytest.mark.asyncio
    async def test_run_by_number(self):
        router = MessageRouter(_mock_api())
        # First greet to see the list
        await router.handle(_msg("hey"))
        result = await router.handle(_msg("run 1"))
        assert "Repository Path" in result.response or "repo" in result.response.lower()

    @pytest.mark.asyncio
    async def test_fuzzy_agent_match(self):
        router = MessageRouter(_mock_api())
        result = await router.handle(_msg("run qa"))
        assert "Repository Path" in result.response or "repo" in result.response.lower()

    @pytest.mark.asyncio
    async def test_unknown_agent(self):
        router = MessageRouter(_mock_api())
        result = await router.handle(_msg("run NonexistentAgent"))
        assert "no agent" in result.response.lower() or "not sure" in result.response.lower()


class TestMultipleInputs:
    @pytest.mark.asyncio
    async def test_collects_required_then_optional(self):
        api = _mock_api()
        router = MessageRouter(api)
        # Select SWE (has required "task" + optional "repo_path")
        r1 = await router.handle(_msg("run Software Engineer"))
        assert "Task" in r1.response

        # Provide required input
        r2 = await router.handle(_msg("Fix the login bug"))
        # Should ask about optional inputs or start
        assert "optional" in r2.response.lower() or "Starting" in r2.response

    @pytest.mark.asyncio
    async def test_skip_optional_starts_run(self):
        api = _mock_api()
        router = MessageRouter(api)
        await router.handle(_msg("run Software Engineer"))
        await router.handle(_msg("Fix the login bug"))
        result = await router.handle(_msg("go"))
        assert "Starting" in result.response or result.is_async


class TestGlobalCommands:
    @pytest.mark.asyncio
    async def test_cancel(self):
        router = MessageRouter(_mock_api())
        result = await router.handle(_msg("cancel abc123"))
        assert "cancelled" in result.response.lower() or "cancel" in result.response.lower()

    @pytest.mark.asyncio
    async def test_resume(self):
        router = MessageRouter(_mock_api())
        result = await router.handle(_msg("resume abc123"))
        assert "resum" in result.response.lower()

    @pytest.mark.asyncio
    async def test_logs(self):
        router = MessageRouter(_mock_api())
        result = await router.handle(_msg("logs abc123"))
        assert "Step 1" in result.response


class TestSessionIsolation:
    @pytest.mark.asyncio
    async def test_different_users_independent(self):
        router = MessageRouter(_mock_api())
        # User A starts a run flow
        await router.handle(_msg("run QA Engineer", sender_id="111"))
        # User B should get idle state, not User A's flow
        result = await router.handle(_msg("status", sender_id="222"))
        assert "idle" in result.response.lower() or "no runs" in result.response.lower()
