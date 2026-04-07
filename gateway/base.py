"""Abstract base for channel adapters.

Each messaging platform (WhatsApp, Telegram, Discord, etc.) implements
this interface. The gateway only talks to adapters through this ABC,
keeping all platform-specific logic isolated.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Callable, Awaitable

from gateway.models import InboundMessage, OutboundMessage


# Type for the callback that the gateway registers to handle messages
MessageHandler = Callable[[InboundMessage], Awaitable[None]]


class ChannelAdapter(ABC):
    """Abstract base class for all messaging channel integrations."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Channel identifier (e.g. 'whatsapp', 'telegram')."""

    @abstractmethod
    async def connect(self) -> None:
        """Establish connection to the messaging platform."""

    @abstractmethod
    async def disconnect(self) -> None:
        """Gracefully close the connection."""

    @abstractmethod
    async def send_message(self, message: OutboundMessage) -> None:
        """Send a message to a chat."""

    @abstractmethod
    async def register_handler(self, handler: MessageHandler) -> None:
        """Register a callback for incoming messages.

        The adapter calls this handler for every inbound message,
        after normalizing it into an InboundMessage.
        """

    @abstractmethod
    def parse_webhook(self, payload: dict) -> InboundMessage | None:
        """Parse a platform-specific webhook payload into an InboundMessage.

        Returns None if the payload is not a user message (e.g. status update,
        delivery receipt, or a message sent by us).
        """
