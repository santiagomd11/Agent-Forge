"""HTTP client for talking to the Vadgr API.

Thin wrapper around httpx that the router and notifier use
to list agents, trigger runs, check status, etc.
"""

from __future__ import annotations

import httpx

_TIMEOUT = 30


class VadgrAPIClient:
    """Async client for the Vadgr REST API."""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self._base_url = base_url.rstrip("/")

    async def list_agents(self) -> list[dict]:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(f"{self._base_url}/api/agents")
            resp.raise_for_status()
            return resp.json()

    async def get_agent(self, agent_id: str) -> dict:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(f"{self._base_url}/api/agents/{agent_id}")
            resp.raise_for_status()
            return resp.json()

    async def run_agent(self, agent_id: str, inputs: dict) -> dict:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(
                f"{self._base_url}/api/agents/{agent_id}/run",
                json={"inputs": inputs},
            )
            resp.raise_for_status()
            return resp.json()

    async def list_runs(self, status: str | None = None) -> list[dict]:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            params = {"status": status} if status else {}
            resp = await client.get(f"{self._base_url}/api/runs", params=params)
            resp.raise_for_status()
            return resp.json()

    async def get_run(self, run_id: str) -> dict:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(f"{self._base_url}/api/runs/{run_id}")
            resp.raise_for_status()
            return resp.json()

    async def cancel_run(self, run_id: str) -> dict:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(f"{self._base_url}/api/runs/{run_id}/cancel")
            resp.raise_for_status()
            return resp.json()

    async def resume_run(self, run_id: str) -> dict:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(f"{self._base_url}/api/runs/{run_id}/resume")
            resp.raise_for_status()
            return resp.json()

    async def get_run_logs(self, run_id: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(f"{self._base_url}/api/runs/{run_id}/logs")
            resp.raise_for_status()
            return resp.json()
