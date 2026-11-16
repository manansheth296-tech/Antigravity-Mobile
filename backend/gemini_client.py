"""
Pure Python Gemini API Client.
Zero compiled dependencies - uses standard library urllib for maximum portability on mobile/Android Termux.
"""

import os
import sys
import json
import ssl
import socket
import urllib.request
import urllib.error

# Force IPv4 resolution to eliminate mobile hotspot IPv6 connection timeouts
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_only_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = _ipv4_only_getaddrinfo

from typing import Dict, Any, List, Optional, Generator

from backend.tools import ToolRegistry

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

SYSTEM_INSTRUCTION = """You are PocketDev Mobile, an autonomous agentic AI software engineer and IDE companion running directly on an Android device (via Termux Linux environment).

Your Mission:
1. Help the user build, code, debug, refactor, and manage software repositories directly on this device.
2. You have direct access to tools: shell execution, reading files, writing files, targeted code patching, listing directories, and git checkpoints.
3. Use your tools proactively to inspect files, execute tests, verify your changes, and maintain git history.
4. Always checkpoint with git before undertaking destructive or large multi-file operations.
5. Provide clear, concise explanations. When you perform tool calls, summarize the outcome clearly.
6. Remember that you are operating on a mobile device: prefer lightweight commands, clean dependencies, and verify exit codes.
"""

# Gemini REST API proto3 schema strictly requires UPPERCASE types (OBJECT, STRING, INTEGER, BOOLEAN)
TOOL_DECLARATIONS = [
    {
        "name": "run_shell",
        "description": "Execute a shell command inside the workspace directory.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "command": {"type": "STRING", "description": "The shell command to run"},
                "timeout_seconds": {"type": "INTEGER", "description": "Command timeout in seconds (default 60)"}
            },
            "required": ["command"]
        }
    },
    {
        "name": "read_file",
        "description": "Read text contents of a file, optionally bounded by line numbers.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "path": {"type": "STRING", "description": "Path to file relative to workspace"},
                "start_line": {"type": "INTEGER", "description": "1-indexed start line"},
                "end_line": {"type": "INTEGER", "description": "1-indexed end line"}
            },
            "required": ["path"]
        }
    },
    {
        "name": "write_file",
        "description": "Write text content to a file. Overwrites or creates new.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "path": {"type": "STRING", "description": "Path to file relative to workspace"},
                "content": {"type": "STRING", "description": "Full file content"},
                "overwrite": {"type": "BOOLEAN", "description": "Whether to overwrite existing file"}
            },
            "required": ["path", "content"]
        }
    },
    {
        "name": "patch_file",
        "description": "Replace an exact target block of text in a file with replacement block.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "path": {"type": "STRING", "description": "Path to file"},
                "target_block": {"type": "STRING", "description": "Exact text to find"},
                "replacement_block": {"type": "STRING", "description": "Replacement text"}
            },
            "required": ["path", "target_block", "replacement_block"]
        }
    },
    {
        "name": "list_directory",
        "description": "List files and subdirectories inside the workspace.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "path": {"type": "STRING", "description": "Subdirectory path (default '.')"},
                "max_depth": {"type": "INTEGER", "description": "Max recursion depth (default 2)"}
            }
        }
    },
    {
        "name": "git_checkpoint",
        "description": "Automatically stage changes and commit as a safety checkpoint.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "message": {"type": "STRING", "description": "Git commit message"}
            },
            "required": ["message"]
        }
    },
    {
        "name": "get_device_status",
        "description": "Inspect device OS, memory, Termux environment, and battery.",
        "parameters": {
            "type": "OBJECT",
            "properties": {}
        }
    }
]


class PureGeminiAgent:
    def __init__(self, workspace_dir: str, api_key: Optional[str] = None, model_name: str = "gemini-3.5-flash-lite"):
        self.workspace_dir = workspace_dir
        self.tools = ToolRegistry(workspace_dir)
        self.api_key = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
        self.model_name = model_name
        self.history: List[Dict[str, Any]] = []

    def set_api_key(self, key: str):
        self.api_key = key.strip()

    def _execute_tool(self, name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        tool_map = {
            "run_shell": self.tools.run_shell,
            "read_file": self.tools.read_file,
            "write_file": self.tools.write_file,
            "patch_file": self.tools.patch_file,
            "list_directory": self.tools.list_directory,
            "git_checkpoint": self.tools.git_checkpoint,
            "get_device_status": self.tools.get_device_status,
        }
        if name not in tool_map:
            return {"status": "error", "message": f"Unknown tool: {name}"}
        try:
            return tool_map[name](**args)
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def _call_gemini_api(self, contents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Send raw HTTP POST to Gemini REST endpoint with fast 15-second timeout."""
        url = f"{GEMINI_API_BASE}/{self.model_name}:generateContent?key={self.api_key}"
        
        payload = {
            "contents": contents,
            "systemInstruction": {
                "parts": [{"text": SYSTEM_INSTRUCTION}]
            },
            "tools": [
                {"functionDeclarations": TOOL_DECLARATIONS}
            ],
            "generationConfig": {
                "temperature": 0.2
            }
        }

        data_bytes = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "AntigravityMobile/1.0"
        }

        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers=headers,
            method="POST"
        )

        ctx = ssl.create_default_context()
        try:
            with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
                body = resp.read().decode("utf-8")
                return json.loads(body)
        except ssl.SSLError:
            unverified_ctx = ssl._create_unverified_context()
            with urllib.request.urlopen(req, timeout=15, context=unverified_ctx) as resp:
                body = resp.read().decode("utf-8")
                return json.loads(body)

    def run_turn(self, user_prompt: str) -> Generator[Dict[str, Any], None, None]:
        if not self.api_key:
            yield {
                "type": "error",
                "message": "Gemini API key is missing. Please click the Settings gear icon and enter your API key."
            }
            yield {"type": "done"}
            return

        yield {"type": "status", "data": "Thinking..."}

        self.history.append({
            "role": "user",
            "parts": [{"text": user_prompt}]
        })

        max_turns = 8
        current_turn = 0

        while current_turn < max_turns:
            current_turn += 1
            try:
                resp_json = self._call_gemini_api(self.history)
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8", errors="replace")
                print(f"[API ERROR] HTTP {e.code}: {err_body}", file=sys.stderr)
                yield {"type": "error", "message": f"Gemini API HTTP {e.code}: {err_body}"}
                yield {"type": "done"}
                return
            except Exception as e:
                print(f"[API ERROR] Connection error: {str(e)}", file=sys.stderr)
                yield {"type": "error", "message": f"Connection error: {str(e)}"}
                yield {"type": "done"}
                return

            candidates = resp_json.get("candidates", [])
            if not candidates:
                yield {"type": "error", "message": "No candidate returned from Gemini model."}
                yield {"type": "done"}
                return

            candidate = candidates[0]
            content = candidate.get("content", {})
            parts = content.get("parts", [])

            text_chunks = [p.get("text", "") for p in parts if "text" in p]
            model_text = "".join(text_chunks)
            if model_text:
                yield {"type": "chunk", "text": model_text}

            self.history.append(content)

            function_calls = [p.get("functionCall") for p in parts if "functionCall" in p]
            if not function_calls:
                break

            fn_response_parts = []
            for fc in function_calls:
                fn_name = fc.get("name")
                fn_args = fc.get("args", {})

                yield {
                    "type": "tool_call",
                    "tool": fn_name,
                    "args": fn_args
                }
                yield {"type": "status", "data": f"Running {fn_name}..."}

                result = self._execute_tool(fn_name, fn_args)

                yield {
                    "type": "tool_result",
                    "tool": fn_name,
                    "result": result
                }

                fn_response_parts.append({
                    "functionResponse": {
                        "name": fn_name,
                        "response": {"result": result}
                    }
                })

            self.history.append({
                "role": "user",
                "parts": fn_response_parts
            })
            yield {"type": "status", "data": "Evaluating tool results..."}

        yield {"type": "done"}
