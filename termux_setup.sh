#!/data/data/com.termux/files/usr/bin/bash
# Antigravity Mobile - Termux Environment Setup Script
# Runs directly on Android in Termux (32-bit & 64-bit ARM compatible)

echo "========================================================"
echo "✦ Antigravity Mobile: Termux Linux Setup ✦"
echo "========================================================"

# 1. Update Termux package mirrors
echo "[1/4] Updating package repositories..."
pkg update -y || apt-get update -y

# 2. Install Python, Git, and Termux-API
echo "[2/4] Installing Python, Git, and Termux API packages..."
pkg install -y python git termux-api curl || apt-get install -y python git termux-api curl

# 3. Setup Android shared storage access
echo "[3/4] Requesting shared storage access..."
if [ ! -d "$HOME/storage" ]; then
    termux-setup-storage
fi

# 4. Create Antigravity workspace
WORKSPACE="$HOME/antigravity_workspace"
mkdir -p "$WORKSPACE"
echo "[4/4] Workspace directory ready at: $WORKSPACE"

# Set permissions
chmod +x start_termux.sh run.py 2>/dev/null

echo "========================================================"
echo "✅ Antigravity Mobile Termux Setup Complete!"
echo "To start the agent server, run:"
echo "    ./start_termux.sh"
echo "========================================================"
