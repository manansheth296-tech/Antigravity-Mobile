#!/usr/bin/env python3
"""
PocketIDE Runner.
Starts the pure Python agent server.
"""

import os
import sys
from pathlib import Path

# Add current workspace root to sys.path
WORKSPACE_ROOT = Path(__file__).parent.resolve()
sys.path.insert(0, str(WORKSPACE_ROOT))

# Optional: Accept workspace path as first command-line argument
if len(sys.argv) > 1 and not sys.argv[1].startswith("-"):
    os.environ["POCKETIDE_WORKSPACE"] = sys.argv[1]

from backend.server import run_server

if __name__ == "__main__":
    host = os.getenv("POCKETIDE_HOST", os.getenv("POCKETDEV_HOST", os.getenv("ANTIGRAVITY_HOST", "0.0.0.0")))
    port = int(os.getenv("POCKETIDE_PORT", os.getenv("POCKETDEV_PORT", os.getenv("ANTIGRAVITY_PORT", 8000))))
    run_server(host, port)
