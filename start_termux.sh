#!/data/data/com.termux/files/usr/bin/bash
# Antigravity Mobile - Termux Engine Launcher
# Starts the pure Python agent server on Android port 8000

export ANTIGRAVITY_HOST="0.0.0.0"
export ANTIGRAVITY_PORT="8000"
export ANTIGRAVITY_WORKSPACE="${ANTIGRAVITY_WORKSPACE:-$HOME/antigravity_workspace}"

mkdir -p "$ANTIGRAVITY_WORKSPACE"

echo "========================================================"
echo "✦ Starting Antigravity Mobile Termux Agent ✦"
echo "  Host      : $ANTIGRAVITY_HOST:$ANTIGRAVITY_PORT"
echo "  Workspace : $ANTIGRAVITY_WORKSPACE"
echo "========================================================"

python run.py
