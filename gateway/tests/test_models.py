"""Tests for gateway message models."""

from gateway.models import InboundMessage, OutboundMessage, CommandResult, MessageType


class TestInboundMessage:
    def test_create_text_message(self):
        msg = InboundMessage(
            channel="whatsapp",
            chat_id="5731200000@s.whatsapp.net",
            sender_id="5731200000",
            sender_name="Santiago",
            text="hey",
        )
        assert msg.channel == "whatsapp"
        assert msg.text == "hey"
        assert msg.message_type == MessageType.TEXT

    def test_frozen(self):
        msg = InboundMessage(
            channel="whatsapp", chat_id="x", sender_id="x",
            sender_name="x", text="hello",
        )
        try:
            msg.text = "modified"
            assert False, "Should be frozen"
        except AttributeError:
            pass


class TestOutboundMessage:
    def test_create(self):
        msg = OutboundMessage(chat_id="123@s.whatsapp.net", text="Hello!")
        assert msg.text == "Hello!"
        assert msg.parse_mode is None


class TestCommandResult:
    def test_simple_response(self):
        r = CommandResult(response="Done!")
        assert r.response == "Done!"
        assert r.run_id is None
        assert not r.is_async

    def test_async_run(self):
        r = CommandResult(
            response="Starting...",
            run_id="abc-123",
            agent_name="QA Engineer",
            is_async=True,
        )
        assert r.is_async
        assert r.run_id == "abc-123"
