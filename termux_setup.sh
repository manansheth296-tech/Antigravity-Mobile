#!/data/data/com.termux/files/usr/bin/bash
# ========================================================
# PocketIDE - Termux Linux Agent 1-Command Setup
# Runs directly on Android in Termux (32-bit & 64-bit ARM)
# ========================================================

set -e
echo "========================================================"
echo "✦ PocketIDE: Termux Linux Agent Setup ✦"
echo "========================================================"

# 1. Update Termux repositories
echo "[1/4] Updating package repositories..."
pkg update -y || apt-get update -y

# 2. Install Python, Git, Termux-API, and curl
echo "[2/4] Installing Python, Git, and Termux API packages..."
pkg install -y python git termux-api curl || apt-get install -y python git termux-api curl

# 3. Setup Android storage
echo "[3/4] Requesting shared storage access..."
if [ ! -d "$HOME/storage" ]; then
    termux-setup-storage || true
fi

# 4. Clone or update PocketIDE repository
TARGET_DIR="$HOME/pocketide"
echo "[4/4] Setting up PocketIDE in $TARGET_DIR..."
if [ -d "$TARGET_DIR/.git" ]; then
    echo "Updating existing installation..."
    cd "$TARGET_DIR"
    git pull origin main || true
else
    echo "Cloning PocketIDE..."
    git clone https://github.com/manansheth296-tech/Antigravity-Mobile.git "$TARGET_DIR"
    cd "$TARGET_DIR"
fi

chmod +x start_termux.sh run.py 2>/dev/null || true

echo "========================================================"
echo "✅ Setup Complete! PocketIDE is ready on Termux."
echo ""
echo "To start the autonomous Linux agent server, run:"
echo "    cd ~/pocketide && ./start_termux.sh"
echo ""
echo "The Android app will automatically detect Termux on localhost:8000!"
echo "========================================================"
