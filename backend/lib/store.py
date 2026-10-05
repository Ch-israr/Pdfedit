"""Persistent storage via Supabase Postgres (PostgREST over HTTPS).

The database is the source of truth. Credentials (SUPABASE_URL,
SUPABASE_SERVICE_KEY) are server-side environment variables only — they never
reach the browser or the repository.

When Supabase is not configured, is_configured() is False and the API runs in
a degraded mode: PDF processing still works, but auth endpoints return 503
and usage limits are not enforced (the frontend is told via enforced=false).
"""
import os
from datetime import datetime, timezone

_client = None


def is_configured() -> bool:
    return bool(os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_KEY"))


def _client_or_raise():
    global _client
    if not is_configured():
        raise RuntimeError("Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY)")
    if _client is None:
        from supabase import create_client

        _client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
    return _client


def _rows(response):
    return response.data or []


# ---------------------------------------------------------------- users

_PUBLIC_USER_FIELDS = "id,email,name,plan,created_at,last_login"


def get_user_by_email(email: str):
    res = (
        _client_or_raise()
        .table("users")
        .select("*")
        .eq("email", email.lower().strip())
        .limit(1)
        .execute()
    )
    rows = _rows(res)
    return rows[0] if rows else None


def get_user_by_id(user_id: str):
    res = (
        _client_or_raise()
        .table("users")
        .select(_PUBLIC_USER_FIELDS)
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    rows = _rows(res)
    return rows[0] if rows else None


def create_user(email: str, name: str | None, password_hash: str):
    res = (
        _client_or_raise()
        .table("users")
        .insert(
            {
                "email": email.lower().strip(),
                "name": (name or "").strip() or None,
                "password_hash": password_hash,
                "plan": "free",
            }
        )
        .select(_PUBLIC_USER_FIELDS)
        .execute()
    )
    rows = _rows(res)
    return rows[0] if rows else None


def update_last_login(user_id: str):
    _client_or_raise().table("users").update(
        {"last_login": datetime.now(timezone.utc).isoformat()}
    ).eq("id", user_id).execute()


# ---------------------------------------------------------------- usage

def count_recent_usage(identity: str, tool: str, window_seconds: int = 3600) -> int:
    """Number of *successful* uses of one tool by one identity in the window."""
    res = (
        _client_or_raise()
        .table("usage_events")
        .select("id", count="exact")
        .eq("identity", identity)
        .eq("tool", tool)
        .eq("success", True)
        .gte("created_at", _window_start_iso(window_seconds))
        .execute()
    )
    return res.count or 0


def oldest_usage_in_window(identity: str, tool: str, window_seconds: int = 3600):
    """ISO timestamp of the oldest successful use inside the window (for reset_after)."""
    res = (
        _client_or_raise()
        .table("usage_events")
        .select("created_at")
        .eq("identity", identity)
        .eq("tool", tool)
        .eq("success", True)
        .gte("created_at", _window_start_iso(window_seconds))
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    )
    rows = _rows(res)
    return rows[0]["created_at"] if rows else None


def record_usage(identity: str, tool: str, success: bool):
    _client_or_raise().table("usage_events").insert(
        {"identity": identity, "tool": tool, "success": success}
    ).execute()


def record_file(identity: str, tool: str, original_name: str, result_name: str, size_bytes: int):
    _client_or_raise().table("files").insert(
        {
            "identity": identity,
            "tool": tool,
            "original_name": original_name,
            "result_name": result_name,
            "size_bytes": size_bytes,
        }
    ).execute()


def _window_start_iso(window_seconds: int) -> str:
    from datetime import timedelta

    start = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)
    return start.isoformat()
