"""Tests for gateway security layer."""

import time

import pytest

from gateway.models import InboundMessage
from gateway.security import SecurityConfig, SecurityGuard


def _msg(sender_id="5731200000", text="hello"):
    return InboundMessage(
        channel="whatsapp",
        chat_id=f"{sender_id}@s.whatsapp.net",
        sender_id=sender_id,
        sender_name="Test",
        text=text,
    )


class TestAllowlist:
    def test_allowed_sender_passes(self):
        guard = SecurityGuard(SecurityConfig(allowed_senders=["5731200000"]))
        assert guard.check(_msg(sender_id="5731200000")) is None

    def test_unknown_sender_silently_rejected(self):
        guard = SecurityGuard(SecurityConfig(allowed_senders=["5731200000"]))
        # Returns None (silent reject, not an error message)
        assert guard.check(_msg(sender_id="9999999999")) is None

    def test_empty_allowlist_allows_everyone(self):
        guard = SecurityGuard(SecurityConfig(allowed_senders=[]))
        assert guard.check(_msg(sender_id="anyone")) is None


class TestRateLimit:
    def test_under_limit_passes(self):
        guard = SecurityGuard(SecurityConfig(rate_limit=3, rate_window=60))
        for _ in range(3):
            assert guard.check(_msg()) is None

    def test_over_limit_rejected(self):
        guard = SecurityGuard(SecurityConfig(rate_limit=2, rate_window=3600))
        guard.check(_msg())
        guard.check(_msg())
        result = guard.check(_msg())
        assert result is not None
        assert "Slow down" in result

    def test_different_senders_independent(self):
        guard = SecurityGuard(SecurityConfig(rate_limit=1, rate_window=3600))
        assert guard.check(_msg(sender_id="111")) is None
        assert guard.check(_msg(sender_id="222")) is None
        # 111 is rate limited, 222 is not
        assert guard.check(_msg(sender_id="111")) is not None


class TestMessageLength:
    def test_short_message_passes(self):
        guard = SecurityGuard(SecurityConfig())
        assert guard.check(_msg(text="hello")) is None

    def test_too_long_rejected(self):
        guard = SecurityGuard(SecurityConfig())
        long_text = "x" * 3000
        result = guard.check(_msg(text=long_text))
        assert result is not None
        assert "too long" in result.lower()


class TestSanitization:
    def test_removes_shell_chars(self):
        guard = SecurityGuard(SecurityConfig())
        assert guard.sanitize_input("path; rm -rf /") == "path rm -rf /"
        assert guard.sanitize_input("hello | cat") == "hello  cat"
        assert guard.sanitize_input("$(whoami)") == "whoami"

    def test_clean_input_unchanged(self):
        guard = SecurityGuard(SecurityConfig())
        assert guard.sanitize_input("/home/user/repo") == "/home/user/repo"


class TestAuditLog:
    def test_writes_audit_log(self, tmp_path):
        log_path = str(tmp_path / "audit.jsonl")
        guard = SecurityGuard(SecurityConfig(audit_log_path=log_path))
        guard.check(_msg(text="run qa"))

        import json
        with open(log_path) as f:
            entry = json.loads(f.readline())
        assert entry["sender_id"] == "5731200000"
        assert entry["text"] == "run qa"

    def test_no_audit_without_config(self):
        guard = SecurityGuard(SecurityConfig())
        # Should not raise
        guard.check(_msg())
