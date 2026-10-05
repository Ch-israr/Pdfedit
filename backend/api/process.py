"""POST /api/process?tool=<slug> — process PDFs synchronously.

Guest mode: no sign-in required. Authenticated users (Bearer JWT) get their
plan from the database — never trust plan/premium values from the browser.

Flow: validate -> identify -> check limit -> process -> count on success ->
return the file. Failed attempts return 4xx and do NOT consume allowance.
"""
import io
import json
import os
import sys
import urllib.parse
from email import policy
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler

MAX_FILE_MB = int(os.environ.get("MAX_FILE_MB", "4"))
MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

_MODS = None


def _mods():
    """Lazily import lib modules (keeps module import stdlib-only so the
    Vercel builder can detect the entrypoint before deps install)."""
    global _MODS
    if _MODS is None:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
        from lib import limits, pdf_tools, security, store

        _MODS = (limits, pdf_tools, security, store)
    return _MODS


def _parse_multipart(content_type: str, body: bytes):
    """Return (files, fields). files: list of (filename, bytes)."""
    raw = (
        b"Content-Type: " + content_type.encode("latin-1")
        + b"\r\nMIME-Version: 1.0\r\n\r\n" + body
    )
    msg = BytesParser(policy=policy.HTTP).parsebytes(raw)
    files: list[tuple[str, bytes]] = []
    fields: dict[str, str] = {}
    for part in msg.iter_parts():
        filename = part.get_filename()
        payload = part.get_payload(decode=True) or b""
        if filename:
            files.append((filename, payload))
        else:
            name = part.get_param("name", header="content-disposition")
            if name:
                fields[name] = payload.decode("utf-8", "replace") if isinstance(payload, bytes) else str(payload)
    return files, fields


def _looks_like_pdf(data: bytes) -> bool:
    return data[:5] == b"%PDF-"


class handler(BaseHTTPRequestHandler):
    server_version = "pdfedit/1.0"

    # -- plumbing ------------------------------------------------------

    def _send(self, status: int, body: bytes, content_type: str, extra: dict | None = None):
        self.send_response(status)
        for k, v in self._cors().items():
            self.send_header(k, v)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _cors(self):
        _, _, security, _ = _mods()
        return security.cors_headers()

    def _json(self, status: int, obj: dict, extra: dict | None = None):
        self._send(status, json.dumps(obj).encode("utf-8"), "application/json", extra)

    def do_OPTIONS(self):
        self.send_response(200)
        for k, v in self._cors().items():
            self.send_header(k, v)
        self.end_headers()

    def log_message(self, *args):
        pass  # keep Vercel logs clean

    # -- route ----------------------------------------------------------

    def do_POST(self):
        limits, pdf_tools, security, store = _mods()
        try:
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            tool = (query.get("tool") or [""])[0]
            if tool not in pdf_tools.TOOLS:
                return self._json(400, {"error": f"Unknown tool '{tool}'."})

            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0:
                return self._json(400, {"error": "Empty request body."})
            if length > (MAX_FILE_BYTES * 6 + 1024 * 1024):
                return self._json(413, {"error": f"Request too large (max {MAX_FILE_MB} MB per file)."})

            content_type = self.headers.get("Content-Type", "")
            if "multipart/form-data" not in content_type:
                return self._json(400, {"error": "Expected multipart/form-data."})
            files, fields = _parse_multipart(content_type, self.rfile.read(length))

            if not files:
                return self._json(400, {"error": "No files uploaded."})
            if tool not in pdf_tools.MULTI_FILE_TOOLS and len(files) > 1:
                return self._json(400, {"error": "This tool accepts a single PDF file."})
            for name, data in files:
                if len(data) > MAX_FILE_BYTES:
                    return self._json(413, {"error": f"'{name}' exceeds the {MAX_FILE_MB} MB limit."})
                if not _looks_like_pdf(data):
                    return self._json(400, {"error": f"'{name}' is not a valid PDF file."})

            # -- identity & plan (server-side only) ---------------------
            identity, authenticated = security.identity_for_request(self.headers)
            plan = "free"
            if authenticated and store.is_configured():
                user_id = security.bearer_user_id(self.headers)
                user = store.get_user_by_id(user_id) if user_id else None
                if user:
                    plan = user.get("plan") or "free"

            # -- limit check --------------------------------------------
            snap = limits.check_allowed(identity, tool, plan)
            if not snap["allowed"]:
                limits.record_failure(identity, tool)
                return self._json(
                    429,
                    {
                        "error": limits.LIMIT_MESSAGE,
                        "remaining": 0,
                        "limit": snap["limit"],
                        "reset_after": snap["reset_after"],
                    },
                )

            # -- process -------------------------------------------------
            try:
                result_name, result_bytes, mime = self._run_tool(tool, files, fields)
            except pdf_tools.ToolError as e:
                limits.record_failure(identity, tool)
                return self._json(400, {"error": str(e)})

            # -- count only on success -----------------------------------
            limits.record_success(identity, tool)
            if store.is_configured():
                try:
                    store.record_file(
                        identity, tool, files[0][0], result_name, len(result_bytes)
                    )
                except Exception:
                    pass

            snap = limits.usage_snapshot(identity, tool, plan)
            extra = {
                "Content-Disposition": f'attachment; filename="{result_name}"',
            }
            if snap["remaining"] is not None:
                extra["X-Usage-Remaining"] = str(snap["remaining"])
                extra["X-Usage-Limit"] = str(snap["limit"])
            return self._send(200, result_bytes, mime, extra)

        except Exception:  # never leak internals
            return self._json(500, {"error": "Processing failed unexpectedly."})

    # -- tools ----------------------------------------------------------

    def _run_tool(self, tool: str, files: list[tuple[str, bytes]], fields: dict):
        _, pdf_tools, _, _ = _mods()
        datas = [data for _, data in files]
        if tool == "merge-pdf":
            return "merged.pdf", pdf_tools.merge_pdfs(datas), "application/pdf"
        if tool == "split-pdf":
            mode = (fields.get("mode") or "ranges").lower()
            outputs = pdf_tools.split_pdf(datas[0], mode, fields.get("ranges", ""))
            if len(outputs) == 1:
                name, data = outputs[0]
                return name, data, "application/pdf"
            return "split-pages.zip", pdf_tools.to_zip(outputs), "application/zip"
        if tool == "compress-pdf":
            level = (fields.get("level") or "medium").lower()
            return "compressed.pdf", pdf_tools.compress_pdf(datas[0], level), "application/pdf"
        if tool == "pdf-to-word":
            base = files[0][0].rsplit(".", 1)[0] or "converted"
            return f"{base}.docx", pdf_tools.pdf_to_word(datas[0]), (
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
        raise pdf_tools.ToolError(f"Unknown tool '{tool}'.")
