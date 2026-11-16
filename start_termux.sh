#!/data/data/com.termux/files/usr/bin/bash
# PocketIDE - Termux Engine Launcher
# Starts the pure Python agent server on Android port 8000

export POCKETIDE_HOST="0.0.0.0"
export POCKETIDE_PORT="8000"
export POCKETIDE_WORKSPACE="${POCKETIDE_WORKSPACE:-${POCKETDEV_WORKSPACE:-$HOME/pocketide_workspace}}"

mkdir -p "$POCKETIDE_WORKSPACE"

echo "========================================================"
echo "✦ Starting PocketIDE Termux Agent ✦"
echo "  Host      : $POCKETIDE_HOST:$POCKETIDE_PORT"
echo "  Workspace : $POCKETIDE_WORKSPACE"
echo "========================================================"

python run.py
