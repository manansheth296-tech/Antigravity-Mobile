#!/usr/bin/env python3
"""
Antigravity Mobile Runner.
Starts the pure Python agent server.
"""

import os
import sys
from pathlib import Path

# Add current workspace root to sys.path
WORKSPACE_ROOT = Path(__file__).parent.resolve()
sys.path.insert(0, str(WORKSPACE_ROOT))

from backend.server import run_server

if __name__ == "__main__":
    host = os.getenv("ANTIGRAVITY_HOST", "0.0.0.0")
    port = int(os.getenv("ANTIGRAVITY_PORT", 8000))
    run_server(host, port)
