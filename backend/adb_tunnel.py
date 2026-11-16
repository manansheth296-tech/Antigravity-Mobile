"""
Persistent ADB Reverse Tunnel Daemon.
Keeps port 8000 tunneled over USB to the connected Android device.
"""

import time
import subprocess
import sys
from pathlib import Path

ADB_EXE = Path(__file__).parent.parent / "platform-tools" / "adb.exe"

def main():
    print(f"[ADB TUNNEL] Starting persistent USB tunnel with {ADB_EXE}...")
    while True:
        try:
            res = subprocess.run(
                [str(ADB_EXE), "reverse", "tcp:8000", "tcp:8000"],
                capture_output=True,
                text=True,
                timeout=10
            )
            # Sleep 3 seconds before heartbeat check
            time.sleep(3)
        except Exception as e:
            sys.stderr.write(f"[ADB TUNNEL ERROR] {e}\n")
            time.sleep(5)

if __name__ == "__main__":
    main()
