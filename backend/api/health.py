"""GET /api/health — liveness probe."""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler

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

    def do_OPTIONS(self):
        self.send_response(200)
        for k, v in self._cors().items():
            self.send_header(k, v)
        self.end_headers()

    def log_message(self, *args):
        pass

    def do_GET(self):
        _, store = _mods()
        body = json.dumps(
            {
                "ok": True,
                "service": "pdfedit-backend",
                "database": "configured" if store.is_configured() else "not-configured",
                "max_file_mb": int(os.environ.get("MAX_FILE_MB", "4")),
            }
        ).encode("utf-8")
        self.send_response(200)
        for k, v in self._cors().items():
            self.send_header(k, v)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
