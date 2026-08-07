#!/usr/bin/env python3
"""HTTP receiver for browser-exported downtown photo originals."""

from __future__ import annotations

import base64
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "tmp" / "downtown-sources"
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
        name = payload.get("filename") or payload.get("name")
        if not name:
            raise ValueError("missing filename/name")
        b64 = payload.get("b64") or payload.get("data") or payload.get("base64")
        if not b64:
            raise ValueError("missing b64")
        if "," in b64 and b64.strip().startswith("data:"):
            b64 = b64.split(",", 1)[1]
        data = base64.b64decode(b64)
        # Allow absolute filenames with extension; default .jpg
        dest_name = name if Path(name).suffix else f"{name}.jpg"
        dest = OUT / Path(dest_name).name
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
    print(f"listening on http://127.0.0.1:8765 -> {OUT}", flush=True)
    server.serve_forever()
