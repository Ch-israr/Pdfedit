"""Security helpers: passwords, JWT sessions, guest identity, CORS.

Secrets (SECRET_KEY) come from server-side environment variables only and are
never exposed to the browser or committed to source control.
"""
import hashlib
import os
import time

import bcrypt
import jwt

SECRET_KEY = os.environ.get("SECRET_KEY", "")
JWT_EXPIRY_SECONDS = 30 * 24 * 3600  # 30 days


def _require_secret() -> str:
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY environment variable is not set")
    return SECRET_KEY


# ---------------------------------------------------------------- passwords

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


# ---------------------------------------------------------------- JWT

def create_token(user_id: str, plan: str) -> str:
    now = int(time.time())
    payload = {"sub": user_id, "plan": plan, "iat": now, "exp": now + JWT_EXPIRY_SECONDS}
    return jwt.encode(payload, _require_secret(), algorithm="HS256")


def verify_token(token: str):
    """Return the decoded payload, or None when invalid/expired."""
    try:
        return jwt.decode(token, _require_secret(), algorithms=["HS256"])
    except Exception:
        return None


def bearer_user_id(headers) -> str | None:
    """Extract the user id from an Authorization: Bearer <jwt> header.

    Works with both a dict of headers and http.server's http.client.HTTPMessage.
    """
    auth = _get_header(headers, "authorization") or ""
    if not auth.lower().startswith("bearer "):
        return None
    payload = verify_token(auth[7:].strip())
    if not payload:
        return None
    return payload.get("sub")


# ---------------------------------------------------------------- identity

def _get_header(headers, name: str):
    if hasattr(headers, "get"):
        # http.client.HTTPMessage is case-insensitive already
        return headers.get(name) or headers.get(name.title())
    if isinstance(headers, dict):
        lowered = {k.lower(): v for k, v in headers.items()}
        return lowered.get(name.lower())
    return None


def client_ip(headers, default: str = "unknown") -> str:
    """Best-effort client IP. Vercel sets x-forwarded-for and overwrites any
    client-supplied value, so the first entry is trustworthy here."""
    xff = _get_header(headers, "x-forwarded-for") or ""
    if xff:
        return xff.split(",")[0].strip()
    return _get_header(headers, "x-real-ip") or default


def guest_id_from_headers(headers) -> str | None:
    return _get_header(headers, "x-guest-id")


def identity_for_request(headers) -> tuple[str, bool]:
    """Return (identity_key, is_authenticated).

    Authenticated users are keyed by their verified user id (from the JWT —
    never trust a user id supplied directly by the browser). Guests are keyed
    by a hash of IP + their client-generated guest id, so clearing local
    storage alone does not reset the limit while the IP stays the same.
    """
    user_id = bearer_user_id(headers)
    if user_id:
        return f"user:{user_id}", True
    ip = client_ip(headers)
    guest_id = guest_id_from_headers(headers) or ""
    digest = hashlib.sha256(f"{ip}|{guest_id}".encode("utf-8")).hexdigest()[:32]
    return f"guest:{digest}", False


# ---------------------------------------------------------------- CORS

def cors_headers() -> dict:
    allowed = os.environ.get("ALLOWED_ORIGINS", "*").strip()
    return {
        "Access-Control-Allow-Origin": allowed if allowed else "*",
        "Access-Control-Allow-Headers": "Authorization, X-Guest-Id, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
    }
