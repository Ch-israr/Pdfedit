"""GET /api/usage?tool=<slug> — remaining free uses for one tool.

No sign-in required. Returns the per-tool hourly allowance state so the UI
can show e.g. "3 of 5 uses remaining this hour."
"""
import json
import os
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler

_MODS = None


def _mods():
    global _MODS
    if _MODS is None:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
        from lib import limits, pdf_tools, security, store

        _MODS = (limits, pdf_tools, security, store)
    return _MODS


class handler(BaseHTTPRequestHandler):
    server_version = "pdfedit/1.0"

    def _cors(self):
        _, _, security, _ = _mods()
        return security.cors_headers()

    def _json(self, status: int, obj: dict):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        for k, v in self._cors().items():
            self.send_header(k, v)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        for k, v in self._cors().items():
            self.send_header(k, v)
        self.end_headers()

    def log_message(self, *args):
        pass

    def do_GET(self):
        limits, pdf_tools, security, store = _mods()
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        tool = (query.get("tool") or [""])[0]
        if tool not in pdf_tools.TOOLS:
            return self._json(400, {"error": f"Unknown tool '{tool}'."})

        identity, authenticated = security.identity_for_request(self.headers)
        plan = "free"
        if authenticated and store.is_configured():
            user_id = security.bearer_user_id(self.headers)
            try:
                user = store.get_user_by_id(user_id) if user_id else None
                if user:
                    plan = user.get("plan") or "free"
            except Exception:
                pass

        return self._json(200, limits.usage_snapshot(identity, tool, plan))
