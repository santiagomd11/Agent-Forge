"""Shared enums, pagination, and error models."""

from enum import Enum

from pydantic import BaseModel


class StrictBody(BaseModel):
    """Base class for request-body models.

    Rejects any field not declared on the subclass (``extra: forbid``).
    Use this for bodies that accept client input, so typos or stale fields
    like ``cache_enabled`` produce a clear 422 instead of being silently
    dropped. Response/storage models stay on plain ``BaseModel``.
    """

    model_config = {"extra": "forbid"}


class AgentType(str, Enum):
    AGENT = "agent"
    APPROVAL = "approval"
    INPUT = "input"
    OUTPUT = "output"


class RunStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentRunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: dict = {}


class ErrorEnvelope(BaseModel):
    error: ErrorResponse
