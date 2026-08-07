#!/usr/bin/env python3
"""Tiny HTTP receiver for browser-exported attraction originals."""

from __future__ import annotations

import base64
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "tmp" / "attraction-sources"
OUT.mkdir(parents=True, exist_ok=True)


class Handler(BaseHTTPRequestHandler):
    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        payload = json.loads(raw.decode("utf-8"))
        name = payload["name"]
        data = base64.b64decode(payload["b64"])
        dest = OUT / f"{name}-source.jpg"
        dest.write_bytes(data)
        body = json.dumps({"ok": True, "path": str(dest), "bytes": len(data)}).encode()
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        print(f"saved {dest} ({len(data)} bytes)", flush=True)

    def log_message(self, fmt: str, *args) -> None:
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 8765), Handler)
    print("listening on http://127.0.0.1:8765", flush=True)
    server.serve_forever()
