"""Unified message models for the gateway module.

These models are channel-agnostic -- every adapter normalizes
platform-specific payloads into these types.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class MessageType(Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    DOCUMENT = "document"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class InboundMessage:
    """A message received from any channel, normalized to a common format."""

    channel: str  # "whatsapp", "telegram", "discord"
    chat_id: str  # platform-specific chat/conversation ID
    sender_id: str  # phone number, user ID, etc.
    sender_name: str  # display name
    text: str  # message body
    message_type: MessageType = MessageType.TEXT
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    raw: dict = field(default_factory=dict)  # original payload for debugging


@dataclass
class OutboundMessage:
    """A message to send back to the user via any channel."""

    chat_id: str
    text: str
    parse_mode: str | None = None  # "markdown", "html", or None for plain


@dataclass
class CommandResult:
    """Result of processing a user command."""

    response: str  # text to send back
    run_id: str | None = None  # if a run was started
    agent_name: str | None = None  # which agent was triggered
    is_async: bool = False  # if True, more messages will follow (run progress)
