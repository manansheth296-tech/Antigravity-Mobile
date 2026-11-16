#!/data/data/com.termux/files/usr/bin/bash
# PocketDev Mobile - Termux Engine Launcher
# Starts the pure Python agent server on Android port 8000

export POCKETDEV_HOST="0.0.0.0"
export POCKETDEV_PORT="8000"
export POCKETDEV_WORKSPACE="${POCKETDEV_WORKSPACE:-$HOME/pocketdev_workspace}"

mkdir -p "$POCKETDEV_WORKSPACE"

echo "========================================================"
echo "✦ Starting PocketDev Mobile Termux Agent ✦"
echo "  Host      : $POCKETDEV_HOST:$POCKETDEV_PORT"
echo "  Workspace : $POCKETDEV_WORKSPACE"
echo "========================================================"

python run.py
