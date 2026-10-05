"""Per-tool hourly usage limits.

Free (guest and registered): 5 successful uses per tool per rolling 1-hour
window. Each tool has its own independent counter. Premium: unlimited.

Limits are enforced server-side only. Failed processing attempts do not
consume the allowance — a use is counted only after successful completion.

An optional Upstash Redis (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)
acts as a fast counter cache; Postgres remains the source of truth.
"""
import os
import time
import urllib.request
import urllib.parse
import json

from . import store

FREE_LIMIT = 5
WINDOW_SECONDS = 3600

LIMIT_MESSAGE = (
    "You have reached the free limit for this tool. "
    "Please try again after the limit resets or upgrade to Premium."
)


# ---------------------------------------------------------------- redis (optional)

def _redis_config():
    url = os.environ.get("UPSTASH_REDIS_REST_URL")
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
    if url and token:
        return url.rstrip("/"), token
    return None, None


def _redis_incr(key: str, ttl_seconds: int):
    """INCR + EXPIRE via Upstash REST. Returns the new count, or None on any failure."""
    url, token = _redis_config()
    if not url:
        return None
    try:
        def call(*parts):
            path = "/".join(urllib.parse.quote(str(p), safe="") for p in parts)
            req = urllib.request.Request(
                f"{url}/{path}", headers={"Authorization": f"Bearer {token}"}
            )
            with urllib.request.urlopen(req, timeout=3) as res:
                return json.loads(res.read().decode("utf-8"))

        count = int(call("INCR", key)["result"])
        call("EXPIRE", key, ttl_seconds)
        return count
    except Exception:
        return None


def _redis_get(key: str):
    url, token = _redis_config()
    if not url:
        return None
    try:
        path = "/".join(urllib.parse.quote(str(p), safe="") for p in ("GET", key))
        req = urllib.request.Request(
            f"{url}/{path}", headers={"Authorization": f"Bearer {token}"}
        )
        with urllib.request.urlopen(req, timeout=3) as res:
            result = json.loads(res.read().decode("utf-8"))["result"]
        return int(result) if result is not None else 0
    except Exception:
        return None


# ---------------------------------------------------------------- public API

def _window_key(identity: str, tool: str) -> str:
    window = int(time.time() // WINDOW_SECONDS)
    return f"pdfedit:usage:{identity}:{tool}:{window}"


def usage_snapshot(identity: str, tool: str, plan: str) -> dict:
    """Current limit state for one identity + tool. Never mutates counters."""
    if plan == "premium":
        return {
            "tool": tool,
            "plan": "premium",
            "limit": None,
            "remaining": None,
            "reset_after": 0,
            "enforced": True,
        }
    if not store.is_configured():
        return {
            "tool": tool,
            "plan": "free",
            "limit": FREE_LIMIT,
            "remaining": None,
            "reset_after": 0,
            "enforced": False,
        }

    used = _redis_get(_window_key(identity, tool))
    if used is None:
        used = store.count_recent_usage(identity, tool, WINDOW_SECONDS)
    remaining = max(0, FREE_LIMIT - used)
    return {
        "tool": tool,
        "plan": "free",
        "limit": FREE_LIMIT,
        "remaining": remaining,
        "reset_after": _reset_after(identity, tool) if remaining == 0 else 0,
        "enforced": True,
    }


def check_allowed(identity: str, tool: str, plan: str) -> dict:
    snap = usage_snapshot(identity, tool, plan)
    snap["allowed"] = snap["remaining"] is None or snap["remaining"] > 0
    return snap


def record_success(identity: str, tool: str):
    """Count one successful use. Called only after processing completed."""
    _redis_incr(_window_key(identity, tool), WINDOW_SECONDS)
    if store.is_configured():
        try:
            store.record_usage(identity, tool, True)
        except Exception:
            pass  # Redis already counted; never fail the request on logging


def record_failure(identity: str, tool: str):
    """Log a failed attempt for history. Does NOT consume the allowance."""
    if store.is_configured():
        try:
            store.record_usage(identity, tool, False)
        except Exception:
            pass


def _reset_after(identity: str, tool: str) -> int:
    if not store.is_configured():
        return 0
    try:
        oldest = store.oldest_usage_in_window(identity, tool, WINDOW_SECONDS)
        if not oldest:
            return 0
        from datetime import datetime

        ts = oldest.replace("Z", "+00:00")
        oldest_epoch = datetime.fromisoformat(ts).timestamp()
        return max(0, int(oldest_epoch + WINDOW_SECONDS - time.time()))
    except Exception:
        return 0
