"""Tests for WhatsApp adapter webhook parsing."""

import pytest

from gateway.adapters.whatsapp import WhatsAppAdapter
from gateway.models import MessageType


def _adapter():
    return WhatsAppAdapter(
        evolution_url="http://localhost:8080",
        instance_name="vadgr",
        api_key="test-key",
    )


class TestParseWebhook:
    def test_parse_text_message(self):
        payload = {
            "event": "messages.upsert",
            "instance": "vadgr",
            "data": {
                "key": {
                    "remoteJid": "5731200000@s.whatsapp.net",
                    "fromMe": False,
                    "id": "MSG001",
                },
                "pushName": "Santiago",
                "message": {"conversation": "hey"},
                "messageTimestamp": 1712345678,
            },
        }
        msg = _adapter().parse_webhook(payload)
        assert msg is not None
        assert msg.channel == "whatsapp"
        assert msg.chat_id == "5731200000@s.whatsapp.net"
        assert msg.sender_id == "5731200000"
        assert msg.sender_name == "Santiago"
        assert msg.text == "hey"
        assert msg.message_type == MessageType.TEXT

    def test_parse_extended_text_message(self):
        payload = {
            "event": "messages.upsert",
            "data": {
                "key": {"remoteJid": "111@s.whatsapp.net", "fromMe": False},
                "pushName": "Test",
                "message": {"extendedTextMessage": {"text": "run qa"}},
            },
        }
        msg = _adapter().parse_webhook(payload)
        assert msg is not None
        assert msg.text == "run qa"

    def test_skip_from_me(self):
        payload = {
            "event": "messages.upsert",
            "data": {
                "key": {"remoteJid": "111@s.whatsapp.net", "fromMe": True},
                "pushName": "Me",
                "message": {"conversation": "response"},
            },
        }
        assert _adapter().parse_webhook(payload) is None

    def test_skip_group_messages(self):
        payload = {
            "event": "messages.upsert",
            "data": {
                "key": {"remoteJid": "123456@g.us", "fromMe": False},
                "pushName": "Someone",
                "message": {"conversation": "hello group"},
            },
        }
        assert _adapter().parse_webhook(payload) is None

    def test_skip_non_message_events(self):
        payload = {"event": "connection.update", "data": {"state": "open"}}
        assert _adapter().parse_webhook(payload) is None

    def test_skip_qrcode_events(self):
        payload = {"event": "qrcode.updated", "data": {"qrcode": "base64..."}}
        assert _adapter().parse_webhook(payload) is None

    def test_image_message_type(self):
        payload = {
            "event": "messages.upsert",
            "data": {
                "key": {"remoteJid": "111@s.whatsapp.net", "fromMe": False},
                "pushName": "Test",
                "message": {"imageMessage": {"caption": "photo"}},
            },
        }
        msg = _adapter().parse_webhook(payload)
        assert msg is not None
        assert msg.message_type == MessageType.IMAGE
        assert msg.text == ""

    def test_empty_payload(self):
        assert _adapter().parse_webhook({}) is None

    def test_missing_message(self):
        payload = {
            "event": "messages.upsert",
            "data": {
                "key": {"remoteJid": "111@s.whatsapp.net", "fromMe": False},
                "pushName": "Test",
                "message": {},
            },
        }
        msg = _adapter().parse_webhook(payload)
        assert msg is not None
        assert msg.text == ""
        assert msg.message_type == MessageType.UNKNOWN
