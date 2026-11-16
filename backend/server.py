"""
Pure Python HTTP Server for Antigravity Mobile.
Uses Python's standard library (ThreadingHTTPServer) with Server-Sent Events (SSE).
Zero compiled dependencies - 100% portable on 32-bit and 64-bit Android Termux.
"""

import os
import sys
import json
import mimetypes
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from backend.gemini_client import PureGeminiAgent

WORKSPACE_DIR = os.getenv("ANTIGRAVITY_WORKSPACE", str(Path.cwd()))
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
CONFIG_FILE = Path(WORKSPACE_DIR) / ".antigravity_config.json"

# Load saved API key / config if exists
initial_key = os.getenv("GEMINI_API_KEY", "")
initial_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

if CONFIG_FILE.exists():
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            cfg = json.load(f)
            initial_key = cfg.get("api_key", initial_key)
            initial_model = cfg.get("model_name", initial_model)
    except Exception:
        pass

agent = PureGeminiAgent(
    workspace_dir=WORKSPACE_DIR,
    api_key=initial_key,
    model_name=initial_model
)


class AntigravityHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format, *args):
        sys.stderr.write(f"[HTTP] {args[0]} {args[1]}\n")

    def _send_json(self, data: dict, status_code: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # 1. API Endpoints
        if path == "/api/status":
            status_info = agent.tools.get_device_status()
            self._send_json({
                "status": "ready",
                "has_api_key": bool(agent.api_key),
                "model": agent.model_name,
                "workspace": str(agent.workspace_dir),
                "device": status_info.get("device_info", {})
            })
            return

        if path == "/api/files":
            sub_path = query.get("path", ["."])[0]
            res = agent.tools.list_directory(path=sub_path)
            self._send_json(res)
            return

        if path == "/api/file":
            file_path = query.get("path", [""])[0]
            if not file_path:
                self._send_json({"status": "error", "message": "Missing path parameter"}, 400)
                return
            res = agent.tools.read_file(path=file_path)
            self._send_json(res)
            return

        # 2. Static File Serving
        if path == "/" or path == "/index.html":
            file_target = FRONTEND_DIR / "index.html"
        elif path.startswith("/static/"):
            rel_file = path.replace("/static/", "")
            file_target = FRONTEND_DIR / rel_file
        else:
            file_target = FRONTEND_DIR / path.lstrip("/")

        if file_target.exists() and file_target.is_file():
            mime, _ = mimetypes.guess_type(str(file_target))
            if str(file_target).endswith(".js"):
                mime = "application/javascript"
            elif str(file_target).endswith(".css"):
                mime = "text/css"
            elif str(file_target).endswith(".json"):
                mime = "application/json"

            with open(file_target, "rb") as f:
                content = f.read()

            self.send_response(200)
            self.send_header("Content-Type", f"{mime or 'text/plain'}; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_error(404, f"File not found: {path}")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length)
        payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}

        if path == "/api/settings":
            if "api_key" in payload and payload["api_key"]:
                agent.set_api_key(payload["api_key"])
            if "model_name" in payload and payload["model_name"]:
                agent.model_name = payload["model_name"]
            if "workspace_dir" in payload and payload["workspace_dir"]:
                agent.workspace_dir = payload["workspace_dir"]
                agent.tools = agent.tools.__class__(payload["workspace_dir"])

            # Persist settings
            try:
                with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                    json.dump({
                        "api_key": agent.api_key,
                        "model_name": agent.model_name,
                        "workspace": str(agent.workspace_dir)
                    }, f)
            except Exception as e:
                sys.stderr.write(f"[WARN] Failed to save config: {e}\n")

            self._send_json({"status": "success", "model": agent.model_name, "workspace": str(agent.workspace_dir)})
            return

        if path == "/api/chat":
            prompt = payload.get("prompt", "").strip()
            if not prompt:
                self._send_json({"status": "error", "message": "Empty prompt"}, 400)
                return

            # Start SSE Stream
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache, no-transform")
            self.send_header("Connection", "close")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            try:
                for event in agent.run_turn(prompt):
                    msg = f"data: {json.dumps(event)}\n\n".encode("utf-8")
                    self.wfile.write(msg)
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass
            except Exception as e:
                sys.stderr.write(f"[CHAT ERROR] {str(e)}\n")
            finally:
                self.close_connection = True
            return

        self.send_error(404, "Unknown endpoint")


def run_server(host: str = "0.0.0.0", port: int = 8000):
    server = ThreadingHTTPServer((host, port), AntigravityHandler)
    print("=" * 60)
    print("✦ Antigravity Mobile - Pure Python Agent Server ✦")
    print("=" * 60)
    print(f"Workspace Directory : {agent.workspace_dir}")
    print(f"Local Server URL    : http://localhost:{port}")
    print(f"Has API Key Config  : {bool(agent.api_key)}")
    print("Zero compilation dependencies. 100% Android Termux compatible.")
    print("Press Ctrl+C to stop.")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Antigravity Mobile...")
        server.shutdown()


if __name__ == "__main__":
    host = os.getenv("ANTIGRAVITY_HOST", "0.0.0.0")
    port = int(os.getenv("ANTIGRAVITY_PORT", 8000))
    run_server(host, port)
