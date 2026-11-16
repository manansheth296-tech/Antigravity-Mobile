#!/bin/bash
# ==============================================================================
# PocketDev Mobile - Termux Zero-Dependency Installer
# ==============================================================================

set -e

echo "✦ Setting up PocketDev Mobile on Android Termux..."

# 1. Update Termux base
echo "→ Updating Termux packages..."
pkg update -y

# 2. Install essential tools
echo "→ Installing Python and Git..."
pkg install -y python git

# 3. Prevent Android from sleeping Termux in background
if command -v termux-wake-lock &> /dev/null; then
  echo "→ Enabling Termux wake lock..."
  termux-wake-lock
fi

echo ""
echo "=============================================================================="
echo "✦ Setup Complete!"
echo "PocketDev Mobile is 100% Pure Python (Zero compiled dependencies)."
echo ""
echo "To start the app, run:"
echo "    python run.py"
echo ""
echo "Then open Chrome on your phone and go to:"
echo "    http://localhost:8000"
echo "=============================================================================="
