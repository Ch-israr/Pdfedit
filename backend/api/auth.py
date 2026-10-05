"""Authentication API. Sign-in / sign-up are OPTIONAL — guests can use every
tool without an account.

  POST /api/auth?action=register  {email, password, name?} -> {access_token, user}
  POST /api/auth?action=login     {email, password}         -> {access_token, user}
  GET  /api/auth?action=me        (Authorization: Bearer)   -> {user}

Requires Supabase configuration; otherwise returns 503 with a clear message.
Passwords are bcrypt-hashed. The plan (free/premium) always comes from the
database — the browser can never grant itself premium.
"""
import json
import os
import re
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

_MODS = None


def _mods():
    global _MODS
    if _MODS is None:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
        from lib import security, store

        _MODS = (security, store)
    return _MODS


class handler(BaseHTTPRequestHandler):
    server_version = "pdfedit/1.0"

    def _cors(self):
        security, _ = _mods()
        return security.cors_headers()

    def _send(self, status: int, body: bytes, content_type: str):
        self.send_response(status)
        for k, v in self._cors().items():
            self.send_header(k, v)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status: int, obj: dict):
        self._send(status, json.dumps(obj).encode("utf-8"), "application/json")

    def do_OPTIONS(self):
        self.send_response(200)
        for k, v in self._cors().items():
            self.send_header(k, v)
        self.end_headers()

    def log_message(self, *args):
        pass

    # -- GET /api/auth?action=me ----------------------------------------

    def do_GET(self):
        security, store = _mods()
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        action = (query.get("action") or [""])[0]
        if action != "me":
            return self._json(400, {"error": "Unknown action."})
        if not store.is_configured():
            return self._json(503, {"error": "Accounts are not configured yet."})
        user_id = security.bearer_user_id(self.headers)
        if not user_id:
            return self._json(401, {"error": "Not signed in."})
        try:
            user = store.get_user_by_id(user_id)
        except Exception:
            return self._json(500, {"error": "Could not load account."})
        if not user:
            return self._json(401, {"error": "Account not found."})
        return self._json(200, {"user": _public_user(user)})

    # -- POST register / login -------------------------------------------

    def do_POST(self):
        security, store = _mods()
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        action = (query.get("action") or [""])[0]
        if action not in ("register", "login"):
            return self._json(400, {"error": "Unknown action."})
        if not store.is_configured():
            return self._json(503, {"error": "Accounts are not configured yet."})

        length = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        except Exception:
            return self._json(400, {"error": "Invalid JSON body."})

        email = str(body.get("email") or "").strip()
        password = str(body.get("password") or "")
        if not EMAIL_RE.match(email):
            return self._json(400, {"error": "Please enter a valid email address."})
        if len(password) < 6:
            return self._json(400, {"error": "Password must be at least 6 characters long."})

        try:
            if action == "register":
                return self._register(email, password, str(body.get("name") or ""))
            return self._login(email, password)
        except Exception:
            return self._json(500, {"error": "Something went wrong. Please try again."})

    def _register(self, email: str, password: str, name: str):
        security, store = _mods()
        if store.get_user_by_email(email):
            return self._json(409, {"error": "An account with this email already exists."})
        user = store.create_user(email, name, security.hash_password(password))
        if not user:
            return self._json(500, {"error": "Could not create account."})
        token = security.create_token(user["id"], user.get("plan") or "free")
        return self._json(201, {"access_token": token, "user": _public_user(user)})

    def _login(self, email: str, password: str):
        security, store = _mods()
        user = store.get_user_by_email(email)
        if not user or not security.verify_password(password, user.get("password_hash") or ""):
            return self._json(401, {"error": "Login failed — check your email and password."})
        try:
            store.update_last_login(user["id"])
        except Exception:
            pass
        token = security.create_token(user["id"], user.get("plan") or "free")
        return self._json(200, {"access_token": token, "user": _public_user(user)})


def _public_user(user: dict) -> dict:
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "plan": user.get("plan") or "free",
        "created_at": user.get("created_at"),
        "last_login": user.get("last_login"),
    }
