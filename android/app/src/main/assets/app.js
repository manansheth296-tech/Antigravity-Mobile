// Antigravity Mobile IDE - Hybrid Dual-Engine Client
// Supports:
// 1. Termux Linux Agent Engine (Server-Sent Events streaming, direct bash execution, real filesystem tools)
// 2. Standalone On-Device Engine (Direct Gemini 3.5 Flash Lite REST API + Virtual Workspace)
// 3. Auto-Detection with zero-latency fallback between Termux and Standalone mode

// --- Global State ---
let currentAgentMessageEl = null;
let currentAgentBubbleEl = null;
let activeToolCards = {};
let speechRecognizer = null;
let isRecording = false;
let chatHistory = [];

let activeFilePath = "index.html";
let activeFileIsDirty = false;
let consoleLogCount = 0;
let searchMatches = [];
let currentSearchMatchIndex = -1;

// Engine State
let isTermuxConnected = false;
let termuxWorkspacePath = "";
let serverCheckTimer = null;

// Audio TTS & PiP State
let isTtsEnabled = localStorage.getItem("antigravity_tts_enabled") === "true";
let isInPiP = false;
let currentVoiceTranscript = "";
let detectedVoiceCommand = null;
let currentTurnModelText = "";

// --- DOM References ---
const chatMessages = document.getElementById("chat-messages");
const promptInput = document.getElementById("prompt-input");
const btnSend = document.getElementById("btn-send");
const btnVoice = document.getElementById("btn-voice");
const btnTts = document.getElementById("btn-tts");
const btnPip = document.getElementById("btn-pip");
const activityPill = document.getElementById("live-activity-pill");
const activityText = document.getElementById("activity-text");
const modelLabel = document.getElementById("model-label");
const statusDot = document.querySelector(".status-dot");
const statusPill = document.getElementById("status-pill");

// Voice HUD Elements
const voiceHud = document.getElementById("voice-hud");
const voiceHudBackdrop = document.getElementById("voice-hud-backdrop");
const btnVoiceHudClose = document.getElementById("btn-voice-hud-close");
const voiceCmdBadge = document.getElementById("voice-cmd-badge");
const voiceCmdName = document.getElementById("voice-cmd-name");
const voiceTranscriptDisplay = document.getElementById("voice-transcript-display");
const btnVoiceCancel = document.getElementById("btn-voice-cancel");
const btnVoiceSubmit = document.getElementById("btn-voice-submit");

// Drawer & Workspace Explorer
const btnToggleFiles = document.getElementById("btn-toggle-files");
const btnCloseDrawer = document.getElementById("btn-close-drawer");
const fileDrawer = document.getElementById("file-drawer");
const drawerOverlay = document.getElementById("drawer-overlay");
const fileList = document.getElementById("file-list");
const workspaceFileCount = document.getElementById("workspace-file-count");
const workspaceSearchInput = document.getElementById("workspace-search-input");
const btnNewFile = document.getElementById("btn-new-file");
const btnImportFile = document.getElementById("btn-import-file");
const inputFileImport = document.getElementById("input-file-import");
const btnExportWorkspace = document.getElementById("btn-export-workspace");
const btnDrawerTemplates = document.getElementById("btn-drawer-templates");
const btnResetWorkspace = document.getElementById("btn-reset-workspace");

// Editor Modal Elements
const editorModal = document.getElementById("editor-modal");
const btnCloseEditor = document.getElementById("btn-close-editor");
const editorFilename = document.getElementById("editor-filename");
const editorDirtyIndicator = document.getElementById("editor-dirty-indicator");
const editorLineNumbers = document.getElementById("editor-line-numbers");
const editorTextarea = document.getElementById("editor-textarea");
const btnEditorSave = document.getElementById("btn-editor-save");
const btnEditorPreview = document.getElementById("btn-editor-preview");
const btnEditorAskAi = document.getElementById("btn-editor-ask-ai");
const btnEditorSearchToggle = document.getElementById("btn-editor-search-toggle");
const editorSearchBar = document.getElementById("editor-search-bar");
const editorSearchQuery = document.getElementById("editor-search-query");
const editorSearchMatchCount = document.getElementById("editor-search-match-count");
const btnSearchPrev = document.getElementById("btn-search-prev");
const btnSearchNext = document.getElementById("btn-search-next");
const btnSearchClose = document.getElementById("btn-search-close");

// Live Preview Runner Elements
const previewModal = document.getElementById("preview-modal");
const btnOpenPreview = document.getElementById("btn-open-preview");
const btnClosePreview = document.getElementById("btn-close-preview");
const btnPreviewRefresh = document.getElementById("btn-preview-refresh");
const btnToggleConsole = document.getElementById("btn-toggle-console");
const previewIframe = document.getElementById("preview-iframe");
const previewConsoleDrawer = document.getElementById("preview-console-drawer");
const previewConsoleLogs = document.getElementById("preview-console-logs");
const consoleBadge = document.getElementById("console-badge");
const btnClearConsole = document.getElementById("btn-clear-console");
const btnMinimizeConsole = document.getElementById("btn-minimize-console");

// Templates & AI Modals
const templatesModal = document.getElementById("templates-modal");
const btnOpenTemplates = document.getElementById("btn-open-templates");
const btnCloseTemplates = document.getElementById("btn-close-templates");
const aiActionSheet = document.getElementById("ai-action-sheet");
const btnCloseAiSheet = document.getElementById("btn-close-ai-sheet");

// Settings Modal
const btnSettings = document.getElementById("btn-settings");
const btnCloseSettings = document.getElementById("btn-close-settings");
const settingsModal = document.getElementById("settings-modal");
const btnSaveSettings = document.getElementById("btn-save-settings");
const inputApiKey = document.getElementById("input-api-key");
const selectModel = document.getElementById("select-model");
const inputWorkspace = document.getElementById("input-workspace");
const selectEngineMode = document.getElementById("select-engine-mode");
const inputServerUrl = document.getElementById("input-server-url");
const btnTestConnection = document.getElementById("btn-test-connection");
const connectionStatusHint = document.getElementById("connection-status-hint");

// ==========================================
// 1. SETTINGS & ENGINE CONFIGURATION
// ==========================================
function getApiKey() {
  return localStorage.getItem("antigravity_api_key") || "";
}

function getSelectedModel() {
  return localStorage.getItem("antigravity_model") || "gemini-3.5-flash-lite";
}

function getEngineMode() {
  return localStorage.getItem("antigravity_engine_mode") || "auto";
}

function getServerUrl() {
  const url = localStorage.getItem("antigravity_server_url") || "http://localhost:8000";
  return url.replace(/\/+$/, "");
}

function initSettings() {
  const key = getApiKey();
  const model = getSelectedModel();
  const mode = getEngineMode();
  const srvUrl = getServerUrl();

  if (inputApiKey) inputApiKey.value = key;
  if (selectModel) selectModel.value = model;
  if (selectEngineMode) selectEngineMode.value = mode;
  if (inputServerUrl) inputServerUrl.value = srvUrl;

  updateStatusUI();
}

function updateStatusUI() {
  const mode = getEngineMode();
  const model = getSelectedModel().replace("gemini-", "").replace("-preview", "");

  if (isTermuxConnected && (mode === "auto" || mode === "termux")) {
    statusDot.style.backgroundColor = "var(--accent-green)";
    statusDot.style.boxShadow = "0 0 10px var(--accent-green)";
    modelLabel.textContent = `Termux (${model})`;
    statusPill.title = `Termux Linux Agent Active on ${getServerUrl()}`;
  } else if (getApiKey()) {
    statusDot.style.backgroundColor = "var(--accent-green)";
    statusDot.style.boxShadow = "0 0 6px var(--accent-green)";
    modelLabel.textContent = `${model}`;
    statusPill.title = "Standalone Mobile Mode (Direct Gemini API)";
  } else {
    statusDot.style.backgroundColor = "var(--accent-amber)";
    statusDot.style.boxShadow = "none";
    modelLabel.textContent = "No API Key";
    statusPill.title = "Please enter Gemini API key in Settings";
  }
}

async function checkTermuxHealth() {
  const srvUrl = getServerUrl();
  const mode = getEngineMode();

  if (mode === "standalone") {
    isTermuxConnected = false;
    updateStatusUI();
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${srvUrl}/api/status`, {
      method: "GET",
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const wasConnected = isTermuxConnected;
      isTermuxConnected = (data.status === "ready");

      if (data.workspace) {
        termuxWorkspacePath = data.workspace;
        if (inputWorkspace) inputWorkspace.value = data.workspace;
      }
      if (data.model && selectModel) {
        selectModel.value = data.model;
      }
      if (data.has_api_key && inputApiKey && !inputApiKey.value) {
        inputApiKey.placeholder = "Configured on Termux Server";
      }

      updateStatusUI();

      if (!wasConnected && isTermuxConnected) {
        console.log("Connected to Termux Linux Agent at", srvUrl);
        renderWorkspaceDrawer();
      }
    } else {
      isTermuxConnected = false;
      updateStatusUI();
    }
  } catch (err) {
    isTermuxConnected = false;
    updateStatusUI();
  }
}

async function testServerConnection() {
  const url = inputServerUrl.value.trim().replace(/\/+$/, "");
  connectionStatusHint.textContent = `Pinging ${url}...`;
  connectionStatusHint.style.color = "var(--accent-amber)";

  const t0 = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${url}/api/status`, {
      method: "GET",
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const latency = Math.round(performance.now() - t0);
    if (res.ok) {
      const data = await res.json();
      connectionStatusHint.textContent = `✅ Connected (${latency}ms) - ${data.engine || "Termux Linux Agent"} Ready`;
      connectionStatusHint.style.color = "var(--accent-green)";
    } else {
      connectionStatusHint.textContent = `⚠️ Server returned HTTP ${res.status}`;
      connectionStatusHint.style.color = "var(--accent-amber)";
    }
  } catch (err) {
    connectionStatusHint.textContent = `❌ Unreachable: ${err.message}. Ensure 'python run.py' is running.`;
    connectionStatusHint.style.color = "var(--accent-red)";
  }
}

async function saveSettings() {
  const key = inputApiKey.value.trim();
  const model = selectModel.value;
  const mode = selectEngineMode.value;
  const srvUrl = inputServerUrl.value.trim().replace(/\/+$/, "") || "http://localhost:8000";

  if (key) {
    localStorage.setItem("antigravity_api_key", key);
  }
  localStorage.setItem("antigravity_model", model);
  localStorage.setItem("antigravity_engine_mode", mode);
  localStorage.setItem("antigravity_server_url", srvUrl);

  // Sync settings with Termux server if online
  if (isTermuxConnected) {
    try {
      await fetch(`${srvUrl}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: key || undefined,
          model_name: model,
          workspace_dir: inputWorkspace ? inputWorkspace.value.trim() : undefined
        })
      });
    } catch (e) {}
  }

  settingsModal.classList.add("hidden");
  initSettings();
  checkTermuxHealth();
}

// ==========================================
// 2. STARTER TEMPLATES & CODE STORE
// ==========================================
const STARTER_TEMPLATES = {
  canvas_game: {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Neon Arcade Defender</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="hud">
    <div class="hud-item">SCORE: <span id="score">0</span></div>
    <div class="hud-item">LIVES: <span id="lives">♥♥♥</span></div>
  </div>
  <canvas id="gameCanvas"></canvas>
  <div id="touch-controls">
    <div class="touch-hint">Drag anywhere to maneuver and shoot!</div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
    "style.css": `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #06080e;
  overflow: hidden;
  font-family: -apple-system, sans-serif;
  touch-action: none;
}
.hud {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  color: #4285f4;
  font-family: monospace;
  font-size: 14px;
  font-weight: bold;
  letter-spacing: 1px;
  text-shadow: 0 0 8px rgba(66, 133, 244, 0.6);
  pointer-events: none;
  z-index: 10;
}
#gameCanvas {
  display: block;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at 50% 50%, #0d1222 0%, #04060a 100%);
}
#touch-controls {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  pointer-events: none;
}`,
    "app.js": `// Neon Space Defender - 60fps Mobile Canvas Game
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");

let width, height;
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

let score = 0;
let lives = 3;
let player = { x: width / 2, y: height - 100, radius: 18, color: "#4285f4" };
let bullets = [];
let enemies = [];
let particles = [];
let lastShoot = 0;

let targetX = player.x;
let targetY = player.y;

function setTarget(x, y) {
  targetX = Math.max(player.radius, Math.min(width - player.radius, x));
  targetY = Math.max(player.radius, Math.min(height - player.radius, y));
}

window.addEventListener("pointerdown", (e) => setTarget(e.clientX, e.clientY));
window.addEventListener("pointermove", (e) => {
  if (e.buttons > 0 || e.pointerType === "touch") setTarget(e.clientX, e.clientY);
});

function spawnEnemy() {
  const radius = Math.random() * 10 + 12;
  enemies.push({
    x: Math.random() * (width - radius * 2) + radius,
    y: -radius,
    radius: radius,
    speed: Math.random() * 2 + 1.5,
    color: Math.random() > 0.5 ? "#ea4335" : "#fbbc04"
  });
}

function createExplosion(x, y, color) {
  for (let i = 0; i < 16; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      radius: Math.random() * 3 + 1,
      color,
      alpha: 1
    });
  }
}

let lastSpawn = 0;
function gameLoop(timestamp) {
  ctx.clearRect(0, 0, width, height);

  player.x += (targetX - player.x) * 0.2;
  player.y += (targetY - player.y) * 0.2;

  if (timestamp - lastShoot > 180) {
    bullets.push({ x: player.x, y: player.y - player.radius, speed: 9 });
    lastShoot = timestamp;
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y -= b.speed;
    ctx.fillStyle = "#34a853";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#34a853";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (b.y < -10) bullets.splice(i, 1);
  }

  if (timestamp - lastSpawn > 900) {
    spawnEnemy();
    lastSpawn = timestamp;
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const en = enemies[i];
    en.y += en.speed;

    ctx.fillStyle = en.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = en.color;
    ctx.beginPath();
    ctx.arc(en.x, en.y, en.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      const dist = Math.hypot(b.x - en.x, b.y - en.y);
      if (dist < en.radius + 4) {
        createExplosion(en.x, en.y, en.color);
        enemies.splice(i, 1);
        bullets.splice(j, 1);
        score += 10;
        scoreEl.textContent = score;
        break;
      }
    }

    if (en && Math.hypot(player.x - en.x, player.y - en.y) < player.radius + en.radius) {
      createExplosion(player.x, player.y, "#ffffff");
      enemies.splice(i, 1);
      lives = Math.max(0, lives - 1);
      livesEl.textContent = "♥".repeat(lives);
    }

    if (en && en.y > height + 30) enemies.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.025;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  ctx.save();
  ctx.fillStyle = player.color;
  ctx.shadowBlur = 16;
  ctx.shadowColor = player.color;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - player.radius);
  ctx.lineTo(player.x - player.radius, player.y + player.radius);
  ctx.lineTo(player.x, player.y + player.radius * 0.6);
  ctx.lineTo(player.x + player.radius, player.y + player.radius);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
console.log("Neon Defender game engine initialized at 60 FPS!");`
  },

  mobile_notes: {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Obsidian Notes</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="app">
    <header class="header">
      <h2>✦ Notes & Tasks</h2>
      <button id="add-btn">+ New</button>
    </header>
    <div id="notes-list" class="notes-list"></div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
    "style.css": `body { background: #0b0d12; color: #f0f4f9; font-family: -apple-system, sans-serif; margin: 0; padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
#add-btn { background: #4285f4; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: bold; }
.note-card { background: #151922; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; margin-bottom: 10px; }
.note-title { font-weight: 600; margin-bottom: 6px; }
.note-date { font-size: 11px; color: #9aa0a6; }`,
    "app.js": `const notesList = document.getElementById("notes-list");
const addBtn = document.getElementById("add-btn");
let notes = JSON.parse(localStorage.getItem("notes_data") || "[]");
if (notes.length === 0) {
  notes = [
    { title: "Antigravity Mobile IDE", content: "Standalone APK running with bundled Prism and Live Sandbox.", date: "Today" }
  ];
}
function render() {
  notesList.innerHTML = notes.map((n) => \`
    <div class="note-card">
      <div class="note-title">\${n.title}</div>
      <p style="font-size:13px; color:#c0c6d0; margin-bottom:6px;">\${n.content}</p>
      <div class="note-date">\${n.date}</div>
    </div>
  \`).join("");
}
addBtn.onclick = () => {
  const title = prompt("Note Title:");
  if (!title) return;
  const content = prompt("Note Content:") || "";
  notes.unshift({ title, content, date: "Just now" });
  localStorage.setItem("notes_data", JSON.stringify(notes));
  render();
};
render();`
  },

  canvas_chart: {
    "index.html": `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Telemetry Dashboard</title>
  <style>
    body { background: #0a0c10; color: #e1e4e8; font-family: monospace; padding: 12px; margin: 0; }
    h3 { margin-bottom: 8px; color: #4285f4; }
    canvas { background: #12151d; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); display: block; width: 100%; height: 260px; }
    .metrics { display: flex; gap: 8px; margin-top: 12px; }
    .metric { flex: 1; background: #12151d; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); text-align: center; }
    .metric-val { font-size: 20px; font-weight: bold; color: #34a853; margin-top: 4px; }
  </style>
</head>
<body>
  <h3>✦ Live Android Telemetry</h3>
  <canvas id="chart"></canvas>
  <div class="metrics">
    <div class="metric"><div>CPU LOAD</div><div id="m-cpu" class="metric-val">28%</div></div>
    <div class="metric"><div>RAM USAGE</div><div id="m-ram" class="metric-val">3.2 GB</div></div>
    <div class="metric"><div>FPS</div><div id="m-fps" class="metric-val">60</div></div>
  </div>
  <script>
    const canvas = document.getElementById("chart");
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
    const data = Array.from({ length: 40 }, () => Math.random() * 60 + 20);
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width, h = canvas.height;
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += h / 5) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.strokeStyle = "#4285f4";
      ctx.lineWidth = 3 * window.devicePixelRatio;
      ctx.beginPath();
      data.forEach((val, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - (val / 100) * (h - 20) - 10;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      data.shift();
      data.push(Math.max(10, Math.min(95, data[data.length - 1] + (Math.random() - 0.5) * 15)));
      document.getElementById("m-cpu").textContent = Math.round(data[data.length - 1]) + "%";
      setTimeout(draw, 250);
    }
    draw();
  </script>
</body>
</html>`
  },

  termux_agent: {
    "termux_hardware.py": `#!/usr/bin/env python3
"""
Antigravity Mobile - Termux Android Hardware Monitor
Queries Android hardware via Termux API (zero C compilation, pure stdlib).
"""
import subprocess
import json
import sys

def run_termux_cmd(cmd):
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        if res.returncode == 0 and res.stdout.strip():
            return json.loads(res.stdout)
        return {"error": res.stderr.strip() or "No output"}
    except Exception as e:
        return {"error": str(e)}

def main():
    print("=" * 45)
    print("  Antigravity Mobile: Android Hardware Report")
    print("=" * 45)

    # Battery
    battery = run_termux_cmd(["termux-battery-status"])
    print(f"🔋 Battery: {battery.get('percentage', 'N/A')}% | Status: {battery.get('status', 'N/A')}")
    print(f"🌡️  Temp: {battery.get('temperature', 'N/A')}°C | Health: {battery.get('health', 'N/A')}")

    # Wifi
    wifi = run_termux_cmd(["termux-wifi-connectioninfo"])
    print(f"📶 Wifi SSID: {wifi.get('ssid', 'N/A')} | IP: {wifi.get('ip', 'N/A')}")

    # Vibration feedback test
    try:
        subprocess.run(["termux-vibrate", "-d", "150"], timeout=2)
        print("📳 Haptic Vibrate: Executed")
    except Exception:
        pass

    print("=" * 45)

if __name__ == "__main__":
    main()`
  },

  fastapi_service: {
    "main.py": `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Antigravity Mobile API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    prompt: str
    model: str = "gemini-3.5-flash-lite"

@app.get("/")
def health_check():
    return {"status": "ok", "app": "Antigravity Mobile Microservice"}

@app.post("/api/echo")
def echo_payload(req: PromptRequest):
    return {"received": req.prompt, "model": req.model, "status": "processed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)`,
    "requirements.txt": `fastapi>=0.100.0\nuvicorn>=0.22.0\npydantic>=2.0.0`
  }
};

// ==========================================
// 3. UNIFIED WORKSPACE MANAGER (DISK + VIRTUAL)
// ==========================================
const Workspace = {
  KEY: "antigravity_workspace_files",

  init() {
    const saved = localStorage.getItem(this.KEY);
    if (!saved) {
      this.loadTemplate("canvas_game", false);
    }
  },

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || "{}");
    } catch (e) {
      return {};
    }
  },

  saveAll(filesMap) {
    localStorage.setItem(this.KEY, JSON.stringify(filesMap));
    renderWorkspaceDrawer();
  },

  get(path) {
    const files = this.getAll();
    return files[path] || "";
  },

  set(path, content) {
    const files = this.getAll();
    files[path] = content;
    this.saveAll(files);
  },

  delete(path) {
    const files = this.getAll();
    delete files[path];
    this.saveAll(files);
  },

  list() {
    const files = this.getAll();
    return Object.keys(files).sort();
  },

  loadTemplate(name, notify = true) {
    const t = STARTER_TEMPLATES[name];
    if (!t) return;
    const files = this.getAll();
    Object.assign(files, t);
    this.saveAll(files);
    if (notify) {
      alert(`Template loaded! Files added: ${Object.keys(t).join(", ")}`);
      openEditorWithCurrentFile(Object.keys(t)[0]);
    }
  },

  reset() {
    localStorage.removeItem(this.KEY);
    this.loadTemplate("canvas_game", false);
    renderWorkspaceDrawer();
    openEditorWithCurrentFile("index.html");
  }
};

function getFileIcon(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  switch (ext) {
    case "html": return "📄";
    case "css": return "🎨";
    case "js": return "⚡";
    case "py": return "🐍";
    case "json": return "⚙️";
    case "md": return "📝";
    case "sh": return "💻";
    default: return "📄";
  }
}

// ==========================================
// 4. CHAT RENDERING & TOOL EXECUTION CARDS
// ==========================================
function setupMarkdownParser() {
  if (!window.marked) return;

  const renderer = new marked.Renderer();

  renderer.code = function(token) {
    const code = typeof token === "object" ? token.text : token;
    const lang = (typeof token === "object" ? token.lang : arguments[1]) || "plaintext";
    const language = lang.toLowerCase().trim();

    let highlighted = escapeHtml(code);
    if (window.Prism && Prism.languages[language]) {
      try {
        highlighted = Prism.highlight(code, Prism.languages[language], language);
      } catch (e) {
        highlighted = escapeHtml(code);
      }
    }

    const isWeb = ["html", "javascript", "js", "css"].includes(language);
    const runBtn = isWeb
      ? `<button class="code-action-btn run-code-btn" onclick="runCodeSnippet(this)" title="Run in Live Preview">▶ Run</button>`
      : "";

    return `
      <div class="code-card" data-lang="${language}">
        <div class="code-header">
          <div class="code-lang-badge">
            <span class="code-lang-dot"></span>
            <span>${language.toUpperCase()}</span>
          </div>
          <div class="code-actions">
            ${runBtn}
            <button class="code-action-btn edit-code-btn" onclick="editCodeSnippet(this)" title="Open in Code Editor">✏️ Edit</button>
            <button class="code-action-btn copy-code-btn" onclick="copyCodeSnippet(this)" title="Copy Code">📋 Copy</button>
          </div>
        </div>
        <pre class="language-${language}"><code class="language-${language}">${highlighted}</code></pre>
        <textarea style="display:none" class="raw-code-store">${escapeHtml(code)}</textarea>
      </div>
    `;
  };

  marked.use({ renderer });
}

window.copyCodeSnippet = function(btn) {
  const card = btn.closest(".code-card");
  const rawCode = card.querySelector(".raw-code-store").value;
  navigator.clipboard.writeText(rawCode).then(() => {
    const origText = btn.textContent;
    btn.textContent = "✓ Copied!";
    setTimeout(() => { btn.textContent = origText; }, 1500);
  });
};

window.editCodeSnippet = function(btn) {
  const card = btn.closest(".code-card");
  const lang = card.getAttribute("data-lang") || "js";
  const rawCode = card.querySelector(".raw-code-store").value;

  let ext = "js";
  if (lang === "python" || lang === "py") ext = "py";
  else if (lang === "html") ext = "html";
  else if (lang === "css") ext = "css";
  else if (lang === "json") ext = "json";
  else if (lang === "bash" || lang === "sh") ext = "sh";

  const tempName = `snippet_${Date.now().toString().slice(-4)}.${ext}`;
  if (isTermuxConnected) {
    saveFileToDisk(tempName, rawCode).then(() => openEditorWithCurrentFile(tempName));
  } else {
    Workspace.set(tempName, rawCode);
    openEditorWithCurrentFile(tempName);
  }
};

window.runCodeSnippet = function(btn) {
  const card = btn.closest(".code-card");
  const lang = card.getAttribute("data-lang") || "html";
  const rawCode = card.querySelector(".raw-code-store").value;

  let compiledHtml = "";
  if (lang === "html") {
    compiledHtml = rawCode;
  } else if (lang === "javascript" || lang === "js") {
    compiledHtml = `<!DOCTYPE html><html><body><script>${rawCode}<\/script></body></html>`;
  } else if (lang === "css") {
    compiledHtml = `<!DOCTYPE html><html><head><style>${rawCode}</style></head><body><h1>CSS Preview</h1><p>Previewing styled elements.</p></body></html>`;
  }

  openLivePreviewWithCustomHtml(compiledHtml);
};

function appendUserMessage(text) {
  const welcome = document.querySelector(".welcome-card");
  if (welcome) welcome.remove();

  const msg = document.createElement("div");
  msg.className = "message user";
  msg.textContent = text;
  chatMessages.appendChild(msg);
  scrollToBottom();
}

function createAgentMessageContainer() {
  const msg = document.createElement("div");
  msg.className = "message agent";

  const bubble = document.createElement("div");
  bubble.className = "agent-bubble";
  msg.appendChild(bubble);

  chatMessages.appendChild(msg);
  currentAgentMessageEl = msg;
  currentAgentBubbleEl = bubble;
  currentAgentBubbleEl._rawText = "";
  scrollToBottom();
}

function appendModelChunk(text) {
  if (!currentAgentBubbleEl) {
    createAgentMessageContainer();
  }
  currentAgentBubbleEl._rawText += text;
  if (window.marked) {
    currentAgentBubbleEl.innerHTML = marked.parse(currentAgentBubbleEl._rawText);
  } else {
    currentAgentBubbleEl.textContent = currentAgentBubbleEl._rawText;
  }
  scrollToBottom();
}

// Live Tool Execution Cards for Termux Agent
function renderToolCall(toolName, args) {
  if (!currentAgentMessageEl) {
    createAgentMessageContainer();
  }

  const card = document.createElement("div");
  card.className = "tool-card";

  let argSummary = "";
  if (toolName === "run_shell") {
    argSummary = args.command || "";
  } else if (toolName === "read_file" || toolName === "write_file" || toolName === "patch_file") {
    argSummary = args.path || "";
  } else if (toolName === "git_checkpoint") {
    argSummary = args.message || "";
  }

  card.innerHTML = `
    <div class="tool-header">
      <div class="tool-title">
        <span>⚙</span>
        <span>${escapeHtml(toolName)}</span>
        <span style="color:var(--text-muted);font-weight:normal;font-size:0.75rem">${escapeHtml(argSummary)}</span>
      </div>
      <span class="tool-badge running">RUNNING</span>
    </div>
    <div class="tool-body">${escapeHtml(JSON.stringify(args, null, 2))}</div>
  `;

  currentAgentMessageEl.appendChild(card);
  activeToolCards[toolName] = card;
  scrollToBottom();
}

function renderToolResult(toolName, result) {
  const card = activeToolCards[toolName];
  if (!card) return;

  const badge = card.querySelector(".tool-badge");
  const isSuccess = result.status === "success" || result.exit_code === 0;

  badge.className = `tool-badge ${isSuccess ? "success" : "error"}`;
  badge.textContent = isSuccess ? "SUCCESS" : "ERROR";

  const body = card.querySelector(".tool-body");
  if (toolName === "run_shell" && (result.stdout || result.stderr)) {
    let out = "";
    if (result.stdout) out += result.stdout;
    if (result.stderr) out += (out ? "\n" : "") + "[stderr]\n" + result.stderr;
    body.textContent = out;
  } else if (result.content && toolName === "read_file") {
    body.textContent = result.content.slice(0, 500) + (result.content.length > 500 ? "\n... (truncated)" : "");
  } else {
    body.textContent = JSON.stringify(result, null, 2);
  }
  scrollToBottom();
}

function renderErrorMessage(msg) {
  if (!currentAgentMessageEl) {
    createAgentMessageContainer();
  }
  const errDiv = document.createElement("div");
  errDiv.style.color = "var(--accent-red)";
  errDiv.style.padding = "8px 0";
  errDiv.textContent = `⚠️ ${msg}`;
  currentAgentMessageEl.appendChild(errDiv);
  scrollToBottom();
}

function finalizeAgentMessage() {
  currentAgentMessageEl = null;
  currentAgentBubbleEl = null;
  activeToolCards = {};
}

function showActivity(text) {
  activityText.textContent = text;
  activityPill.classList.remove("hidden");
}

function hideActivity() {
  activityPill.classList.add("hidden");
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ==========================================
// 5. HYBRID DISPATCHER: TERMUX LINUX vs STANDALONE
// ==========================================
async function sendPrompt(customPrompt = null) {
  const text = customPrompt ? customPrompt.trim() : promptInput.value.trim();
  if (!text) return;

  currentTurnModelText = "";
  appendUserMessage(text);
  if (!customPrompt) {
    promptInput.value = "";
    promptInput.style.height = "auto";
  }

  showActivity("Thinking...");

  const mode = getEngineMode();
  const shouldUseTermux = (mode === "termux") || (mode === "auto" && isTermuxConnected);

  if (shouldUseTermux) {
    await sendPromptToTermuxAgent(text);
  } else {
    await sendPromptToStandaloneGemini(text);
  }
}

// Route A: Termux Linux Agent Engine (SSE Stream + Real Bash/File Tools)
async function sendPromptToTermuxAgent(text) {
  const srvUrl = getServerUrl();

  try {
    const res = await fetch(`${srvUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text })
    });

    if (!res.ok) {
      hideActivity();
      renderErrorMessage(`Termux Server HTTP ${res.status}: ${res.statusText}`);
      finalizeAgentMessage();
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop();

      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const eventJson = JSON.parse(trimmed.slice(6));
            handleTermuxAgentEvent(eventJson);
            if (eventJson.type === "done" || eventJson.type === "error") {
              try { await reader.cancel(); } catch (e) {}
              return;
            }
          } catch (e) {
            console.error("SSE parse error:", e);
          }
        }
      }
    }
  } catch (err) {
    hideActivity();
    renderErrorMessage(`Connection to Termux server lost: ${err.message}. Check that 'python run.py' is active.`);
    finalizeAgentMessage();
  }
}

function handleTermuxAgentEvent(event) {
  switch (event.type) {
    case "status":
      showActivity(event.data);
      break;
    case "chunk":
      currentTurnModelText += (event.text || "");
      appendModelChunk(event.text);
      break;
    case "tool_call":
      renderToolCall(event.tool, event.args);
      break;
    case "tool_result":
      renderToolResult(event.tool, event.result);
      break;
    case "error":
      hideActivity();
      renderErrorMessage(event.message);
      speakText("Error: " + event.message);
      break;
    case "done":
      hideActivity();
      finalizeAgentMessage();
      if (currentTurnModelText) {
        speakText(currentTurnModelText);
      }
      break;
  }
}

// Route B: Standalone Direct Gemini API (Sub-3s REST API + Virtual Workspace)
async function sendPromptToStandaloneGemini(text) {
  const apiKey = getApiKey();
  if (!apiKey) {
    settingsModal.classList.remove("hidden");
    alert("Please enter your Gemini API key in Settings first.");
    hideActivity();
    return;
  }

  const model = getSelectedModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  chatHistory.push({ role: "user", parts: [{ text: text }] });

  const filesList = Workspace.list();
  const workspaceContext = `The user is in Antigravity Mobile IDE on Android.
Current workspace files: ${filesList.join(", ")}.
If asked to write or fix code, return complete, runnable, syntax-clean code inside standard markdown blocks.`;

  const payload = {
    contents: chatHistory,
    systemInstruction: {
      parts: [{
        text: `You are Antigravity Mobile, an autonomous agentic AI software engineering IDE companion on Android. Help the user build, code, debug, refactor, and architect applications on mobile and desktop. Provide high quality, production-ready code with clear explanations. ${workspaceContext}`
      }]
    },
    generationConfig: { temperature: 0.2 }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    hideActivity();

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const errMsg = errJson.error ? errJson.error.message : res.statusText;
      renderErrorMessage(`Gemini API Error (${res.status}): ${errMsg}`);
      return;
    }

    const data = await res.json();
    const candidate = data.candidates && data.candidates[0];
    if (!candidate || !candidate.content) {
      renderErrorMessage("No response received from Gemini.");
      return;
    }

    const parts = candidate.content.parts || [];
    const modelText = parts.map((p) => p.text || "").join("");

    if (modelText) {
      appendModelChunk(modelText);
      chatHistory.push(candidate.content);
      speakText(modelText);
    }
  } catch (err) {
    hideActivity();
    renderErrorMessage(`Network error: ${err.message}`);
  } finally {
    finalizeAgentMessage();
  }
}

function sendQuickPrompt(prompt) {
  promptInput.value = prompt;
  sendPrompt();
}

function handleQuickAction(action) {
  if (isTermuxConnected && action === "termux") {
    sendPrompt("Check device status using get_device_status, list files in the workspace, and run termux-battery-status to inspect battery.");
    return;
  }

  const currentCode = editorTextarea ? editorTextarea.value : Workspace.get(activeFilePath);
  let prompt = "";

  switch (action) {
    case "explain":
      prompt = `Explain the following code in ${activeFilePath} step-by-step:\n\`\`\`\n${currentCode}\n\`\`\``;
      break;
    case "tests":
      prompt = `Generate a comprehensive suite of unit tests with edge case assertions for ${activeFilePath}:\n\`\`\`\n${currentCode}\n\`\`\``;
      break;
    case "bugs":
      prompt = `Perform a rigorous code review of ${activeFilePath}. Find potential bugs, race conditions, null references, security flaws, and suggest fixes:\n\`\`\`\n${currentCode}\n\`\`\``;
      break;
    case "refactor":
      prompt = `Refactor the code in ${activeFilePath} to make it cleaner, more modular, faster, and adhering to best practices:\n\`\`\`\n${currentCode}\n\`\`\``;
      break;
    case "termux":
      prompt = `Write a Python automation script for Termux Android to inspect device hardware, battery status, and sensor alerts.`;
      break;
  }

  if (prompt) {
    sendPrompt(prompt);
  }
}

// ==========================================
// 6. WORKSPACE EXPLORER (DISK + VIRTUAL)
// ==========================================
async function renderWorkspaceDrawer() {
  if (isTermuxConnected) {
    await renderTermuxDiskWorkspace();
  } else {
    renderVirtualWorkspace();
  }
}

async function renderTermuxDiskWorkspace() {
  const srvUrl = getServerUrl();
  try {
    const res = await fetch(`${srvUrl}/api/files`);
    const data = await res.json();

    const query = workspaceSearchInput.value.toLowerCase().trim();
    fileList.innerHTML = "";

    if (data.status === "success" && data.items && data.items.length > 0) {
      const items = query ? data.items.filter(i => i.name.toLowerCase().includes(query)) : data.items;
      workspaceFileCount.textContent = `${items.length} files (Termux Disk)`;

      items.forEach(item => {
        const el = document.createElement("div");
        el.className = "file-item";
        el.innerHTML = `
          <div class="file-item-left">
            <span class="file-icon">${item.type === "dir" ? "📁" : getFileIcon(item.name)}</span>
            <span class="file-name">${escapeHtml(item.rel_path)}</span>
          </div>
          <div class="file-item-actions">
            ${item.type === "file" ? `<button class="file-action-icon" title="Delete" onclick="deleteDiskFile(event, '${escapeHtml(item.rel_path)}')">🗑️</button>` : ""}
          </div>
        `;
        if (item.type === "file") {
          el.querySelector(".file-item-left").onclick = () => openFileFromDisk(item.rel_path);
        }
        fileList.appendChild(el);
      });
    } else {
      workspaceFileCount.textContent = "0 files (Termux)";
      fileList.innerHTML = '<p class="empty-state" style="padding:16px;text-align:center;color:#666">No files in Termux workspace.</p>';
    }
  } catch (err) {
    renderVirtualWorkspace();
  }
}

function renderVirtualWorkspace() {
  const files = Workspace.list();
  workspaceFileCount.textContent = `${files.length} file${files.length === 1 ? "" : "s"} (Local)`;

  const query = workspaceSearchInput.value.toLowerCase().trim();
  const filtered = query ? files.filter(f => f.toLowerCase().includes(query)) : files;

  fileList.innerHTML = "";
  if (filtered.length === 0) {
    fileList.innerHTML = '<p class="empty-state" style="padding:16px;text-align:center;color:#666">No matching files.</p>';
    return;
  }

  filtered.forEach(filename => {
    const item = document.createElement("div");
    item.className = "file-item";
    item.innerHTML = `
      <div class="file-item-left" onclick="openEditorWithCurrentFile('${escapeHtml(filename)}')">
        <span class="file-icon">${getFileIcon(filename)}</span>
        <span class="file-name">${escapeHtml(filename)}</span>
      </div>
      <div class="file-item-actions">
        <button class="file-action-icon" title="Delete" onclick="deleteWorkspaceFile(event, '${escapeHtml(filename)}')">🗑️</button>
      </div>
    `;
    fileList.appendChild(item);
  });
}

async function openFileFromDisk(path) {
  const srvUrl = getServerUrl();
  try {
    const res = await fetch(`${srvUrl}/api/file?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (data.status === "success") {
      activeFilePath = path;
      editorFilename.textContent = path;
      editorTextarea.value = data.content || "";
      activeFileIsDirty = false;
      editorDirtyIndicator.classList.add("hidden");
      updateLineNumbers();
      fileDrawer.classList.remove("open");
      drawerOverlay.classList.remove("active");
      fileDrawer.classList.remove("open");
  drawerOverlay.classList.remove("active");
  editorModal.classList.remove("hidden");
    } else {
      alert("Could not load file: " + (data.message || "Unknown error"));
    }
  } catch (err) {
    alert("Failed to load file from Termux: " + err.message);
  }
}

async function saveFileToDisk(path, content) {
  const srvUrl = getServerUrl();
  try {
    const res = await fetch(`${srvUrl}/api/file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content, overwrite: true })
    });
    const data = await res.json();
    return data.status === "success";
  } catch (err) {
    return false;
  }
}

window.deleteDiskFile = async function(e, path) {
  e.stopPropagation();
  if (!confirm(`Delete ${path} from Termux storage?`)) return;
  const srvUrl = getServerUrl();
  try {
    await fetch(`${srvUrl}/api/file?path=${encodeURIComponent(path)}`, { method: "DELETE" });
    renderWorkspaceDrawer();
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
};

window.deleteWorkspaceFile = function(e, filename) {
  e.stopPropagation();
  if (confirm(`Delete ${filename}?`)) {
    Workspace.delete(filename);
    if (activeFilePath === filename) {
      const remaining = Workspace.list();
      if (remaining.length > 0) openEditorWithCurrentFile(remaining[0]);
    }
  }
};

btnToggleFiles.addEventListener("click", () => {
  renderWorkspaceDrawer();
  fileDrawer.classList.add("open");
  drawerOverlay.classList.add("active");
});

btnCloseDrawer.addEventListener("click", () => {
  fileDrawer.classList.remove("open");
  drawerOverlay.classList.remove("active");
});

drawerOverlay.addEventListener("click", () => {
  fileDrawer.classList.remove("open");
  drawerOverlay.classList.remove("active");
});

workspaceSearchInput.addEventListener("input", renderWorkspaceDrawer);

btnNewFile.addEventListener("click", async () => {
  const name = prompt("Enter new filename (e.g., script.py, app.js, index.html):");
  if (!name) return;

  if (isTermuxConnected) {
    await saveFileToDisk(name, "");
    await openFileFromDisk(name);
  } else {
    Workspace.set(name, "");
    openEditorWithCurrentFile(name);
  }
  fileDrawer.classList.remove("open");
  drawerOverlay.classList.remove("active");
});

btnImportFile.addEventListener("click", () => inputFileImport.click());

inputFileImport.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  files.forEach(f => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      if (isTermuxConnected) {
        await saveFileToDisk(f.name, evt.target.result);
      } else {
        Workspace.set(f.name, evt.target.result);
      }
      renderWorkspaceDrawer();
    };
    reader.readAsText(f);
  });
  inputFileImport.value = "";
  alert(`Imported ${files.length} file(s).`);
});

btnExportWorkspace.addEventListener("click", () => {
  const allFiles = Workspace.getAll();
  const blob = new Blob([JSON.stringify(allFiles, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `antigravity_workspace_${Date.now()}.json`;
  a.click();
});

btnDrawerTemplates.addEventListener("click", () => {
  fileDrawer.classList.remove("open");
  drawerOverlay.classList.remove("active");
  openTemplatesModal();
});

btnResetWorkspace.addEventListener("click", () => {
  if (confirm("Reset workspace to default demo project?")) {
    Workspace.reset();
  }
});

// ==========================================
// 7. FULLSCREEN MOBILE CODE EDITOR
// ==========================================
function updateLineNumbers() {
  const lines = editorTextarea.value.split("\n").length;
  let numbers = "";
  for (let i = 1; i <= lines; i++) {
    numbers += i + "\n";
  }
  editorLineNumbers.textContent = numbers;
}

function openEditorWithCurrentFile(filename) {
  activeFilePath = filename;
  editorFilename.textContent = filename;
  editorTextarea.value = Workspace.get(filename);
  activeFileIsDirty = false;
  editorDirtyIndicator.classList.add("hidden");
  updateLineNumbers();
  fileDrawer.classList.remove("open");
  drawerOverlay.classList.remove("active");
  editorModal.classList.remove("hidden");
}

async function saveActiveFile() {
  const content = editorTextarea.value;
  if (isTermuxConnected) {
    await saveFileToDisk(activeFilePath, content);
  } else {
    Workspace.set(activeFilePath, content);
  }
  activeFileIsDirty = false;
  editorDirtyIndicator.classList.add("hidden");
  btnEditorSave.textContent = "Saved!";
  setTimeout(() => { btnEditorSave.textContent = "Save"; }, 1200);
}

editorTextarea.addEventListener("input", () => {
  activeFileIsDirty = true;
  editorDirtyIndicator.classList.remove("hidden");
  updateLineNumbers();
});

editorTextarea.addEventListener("scroll", () => {
  editorLineNumbers.scrollTop = editorTextarea.scrollTop;
});

editorTextarea.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = editorTextarea.selectionStart;
    const end = editorTextarea.selectionEnd;
    editorTextarea.value = editorTextarea.value.substring(0, start) + "  " + editorTextarea.value.substring(end);
    editorTextarea.selectionStart = editorTextarea.selectionEnd = start + 2;
    updateLineNumbers();
  }
});

// Mobile Coding Symbols Ribbon
document.querySelectorAll(".symbol-key").forEach(btn => {
  btn.addEventListener("click", () => {
    const insert = btn.getAttribute("data-insert");
    const pair = btn.getAttribute("data-pair");
    const toInsert = pair || insert;

    const start = editorTextarea.selectionStart;
    const end = editorTextarea.selectionEnd;
    const val = editorTextarea.value;

    editorTextarea.value = val.substring(0, start) + toInsert + val.substring(end);
    const newPos = start + (pair ? 1 : toInsert.length);
    editorTextarea.selectionStart = editorTextarea.selectionEnd = newPos;
    editorTextarea.focus();
    updateLineNumbers();
    activeFileIsDirty = true;
    editorDirtyIndicator.classList.remove("hidden");
  });
});

btnEditorSave.addEventListener("click", saveActiveFile);

btnCloseEditor.addEventListener("click", () => {
  if (activeFileIsDirty) {
    saveActiveFile();
  }
  editorModal.classList.add("hidden");
});

btnEditorPreview.addEventListener("click", () => {
  saveActiveFile();
  openLivePreview();
});

btnEditorAskAi.addEventListener("click", () => {
  aiActionSheet.classList.remove("hidden");
});

btnCloseAiSheet.addEventListener("click", () => {
  aiActionSheet.classList.add("hidden");
});

window.executeAiFileAction = function(actionType) {
  aiActionSheet.classList.add("hidden");
  editorModal.classList.add("hidden");
  handleQuickAction(actionType);
};

// Editor Search / Find
btnEditorSearchToggle.addEventListener("click", () => {
  editorSearchBar.classList.toggle("hidden");
  if (!editorSearchBar.classList.contains("hidden")) {
    editorSearchQuery.focus();
  }
});

btnSearchClose.addEventListener("click", () => {
  editorSearchBar.classList.add("hidden");
});

editorSearchQuery.addEventListener("input", () => {
  const query = editorSearchQuery.value;
  if (!query) {
    editorSearchMatchCount.textContent = "0/0";
    searchMatches = [];
    currentSearchMatchIndex = -1;
    return;
  }

  const text = editorTextarea.value;
  searchMatches = [];
  let idx = 0;
  while ((idx = text.toLowerCase().indexOf(query.toLowerCase(), idx)) !== -1) {
    searchMatches.push(idx);
    idx += query.length;
  }

  editorSearchMatchCount.textContent = `${searchMatches.length ? 1 : 0}/${searchMatches.length}`;
  if (searchMatches.length > 0) {
    currentSearchMatchIndex = 0;
    highlightSearchMatch(0, query.length);
  }
});

function highlightSearchMatch(matchIndex, len) {
  const pos = searchMatches[matchIndex];
  editorTextarea.selectionStart = pos;
  editorTextarea.selectionEnd = pos + len;
  editorTextarea.focus();
}

btnSearchNext.addEventListener("click", () => {
  if (searchMatches.length === 0) return;
  currentSearchMatchIndex = (currentSearchMatchIndex + 1) % searchMatches.length;
  editorSearchMatchCount.textContent = `${currentSearchMatchIndex + 1}/${searchMatches.length}`;
  highlightSearchMatch(currentSearchMatchIndex, editorSearchQuery.value.length);
});

btnSearchPrev.addEventListener("click", () => {
  if (searchMatches.length === 0) return;
  currentSearchMatchIndex = (currentSearchMatchIndex - 1 + searchMatches.length) % searchMatches.length;
  editorSearchMatchCount.textContent = `${currentSearchMatchIndex + 1}/${searchMatches.length}`;
  highlightSearchMatch(currentSearchMatchIndex, editorSearchQuery.value.length);
});

// ==========================================
// 8. LIVE MOBILE SANDBOX PREVIEW RUNNER
// ==========================================
function openLivePreview() {
  const html = Workspace.get("index.html") || "<h1>No index.html</h1>";
  const css = Workspace.get("style.css") || "";
  const js = Workspace.get("app.js") || "";

  const consoleScript = `
    <script>
      (function() {
        function send(type, args) {
          try {
            var msg = Array.from(args).map(function(a) {
              return (typeof a === 'object') ? JSON.stringify(a) : String(a);
            }).join(' ');
            window.parent.postMessage({ type: 'CONSOLE_LOG', level: type, text: msg }, '*');
          } catch(e) {}
        }
        var origLog = console.log;
        var origWarn = console.warn;
        var origError = console.error;
        console.log = function() { origLog.apply(console, arguments); send('log', arguments); };
        console.warn = function() { origWarn.apply(console, arguments); send('warn', arguments); };
        console.error = function() { origError.apply(console, arguments); send('error', arguments); };
        window.onerror = function(msg, url, line, col) {
          send('error', ['Error (' + line + ':' + col + '): ' + msg]);
        };
      })();
    <\/script>
  `;

  let compiled = html;
  if (!compiled.includes("<style>") && css) {
    compiled = compiled.replace("</head>", `<style>${css}</style></head>`);
  }
  if (!compiled.includes("<script src=\"app.js\">") && js) {
    compiled = compiled.replace("</body>", `<script>${js}<\/script></body>`);
  }
  compiled = consoleScript + compiled;

  openLivePreviewWithCustomHtml(compiled);
}

function openLivePreviewWithCustomHtml(htmlContent) {
  resetConsoleLogs();
  previewIframe.srcdoc = htmlContent;
  previewModal.classList.remove("hidden");
}

function resetConsoleLogs() {
  consoleLogCount = 0;
  consoleBadge.textContent = "0";
  previewConsoleLogs.innerHTML = '<div class="console-line system">[System] Sandbox initialized. Ready to execute code.</div>';
}

function appendConsoleLog(level, text) {
  consoleLogCount++;
  consoleBadge.textContent = String(consoleLogCount);

  const line = document.createElement("div");
  line.className = `console-line ${level}`;
  line.textContent = `[${level.toUpperCase()}] ${text}`;
  previewConsoleLogs.appendChild(line);
  previewConsoleLogs.scrollTop = previewConsoleLogs.scrollHeight;
}

window.addEventListener("message", (e) => {
  if (e.data && e.data.type === "CONSOLE_LOG") {
    appendConsoleLog(e.data.level, e.data.text);
  }
});

btnOpenPreview.addEventListener("click", openLivePreview);

btnClosePreview.addEventListener("click", () => {
  previewModal.classList.add("hidden");
  previewIframe.srcdoc = "";
});

btnPreviewRefresh.addEventListener("click", () => {
  openLivePreview();
});

btnToggleConsole.addEventListener("click", () => {
  previewConsoleDrawer.classList.toggle("collapsed");
});

btnMinimizeConsole.addEventListener("click", () => {
  previewConsoleDrawer.classList.add("collapsed");
});

btnClearConsole.addEventListener("click", resetConsoleLogs);

// ==========================================
// 9. TEMPLATES GALLERY
// ==========================================
function openTemplatesModal() {
  templatesModal.classList.remove("hidden");
}

function loadTemplate(key) {
  Workspace.loadTemplate(key, true);
  templatesModal.classList.add("hidden");
}

btnOpenTemplates.addEventListener("click", openTemplatesModal);
btnCloseTemplates.addEventListener("click", () => templatesModal.classList.add("hidden"));

// ==========================================
// 10. VOICE-DRIVEN CODING & AUDIO FEEDBACK (OPTION 4)
// ==========================================

function triggerHaptic(type = "short") {
  if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === "function") {
    if (type === "short") window.AndroidBridge.vibrate(35);
    else if (type === "success") {
      window.AndroidBridge.vibrate(40);
      setTimeout(() => window.AndroidBridge.vibrate(40), 90);
    } else if (type === "alert") {
      window.AndroidBridge.vibrate(75);
    }
    return;
  }
  if (navigator.vibrate) {
    if (type === "short") navigator.vibrate(35);
    else if (type === "success") navigator.vibrate([40, 60, 40]);
    else if (type === "alert") navigator.vibrate(75);
  }
}

function initTts() {
  if (isTtsEnabled) {
    btnTts.classList.add("active");
    btnTts.title = "Spoken Audio Responses: ON (Tap to Mute)";
  } else {
    btnTts.classList.remove("active");
    btnTts.title = "Spoken Audio Responses: OFF (Tap to Enable)";
  }
}

function toggleTts() {
  isTtsEnabled = !isTtsEnabled;
  localStorage.setItem("antigravity_tts_enabled", isTtsEnabled ? "true" : "false");
  initTts();
  triggerHaptic("short");
  if (isTtsEnabled) {
    speakText("Voice audio feedback enabled.");
  } else {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }
}

function speakText(text) {
  if (!isTtsEnabled || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();

    // Clean text: strip code blocks, inline code, html, markdown symbols
    let clean = text
      .replace(/```[\s\S]*?```/g, "Code block generated.")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/[#*_~>]/g, "")
      .trim();

    // Extract first 1-2 concise sentences for quick developer audio feedback
    const sentences = clean.split(/(?<=[.?!])\s+/);
    const excerpt = sentences.slice(0, 2).join(" ");
    if (!excerpt) return;

    const utterance = new SpeechSynthesisUtterance(excerpt);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("TTS speakText failed:", err);
  }
}

// Picture-in-Picture (PiP) Floating Companion
function togglePiP() {
  triggerHaptic("short");
  if (window.AndroidBridge && typeof window.AndroidBridge.enterPiP === "function") {
    window.AndroidBridge.enterPiP();
  } else {
    // Fallback toggle for testing outside native shell
    document.body.classList.toggle("pip-mode");
    isInPiP = document.body.classList.contains("pip-mode");
  }
}

// Global hook invoked directly by MainActivity.java on Android PiP mode transition
window.onPiPModeChanged = function(inPiP) {
  isInPiP = inPiP;
  document.body.classList.toggle("pip-mode", inPiP);
  if (inPiP) {
    if (editorModal) editorModal.classList.add("hidden");
    if (previewModal) previewModal.classList.add("hidden");
    if (templatesModal) templatesModal.classList.add("hidden");
    if (settingsModal) settingsModal.classList.add("hidden");
    if (aiActionSheet) aiActionSheet.classList.add("hidden");
    if (fileDrawer) fileDrawer.classList.remove("open");
    if (drawerOverlay) drawerOverlay.classList.remove("active");
    if (voiceHud) voiceHud.classList.add("hidden");
    scrollToBottom();
  }
};

// Smart Voice Developer Commands Intent Classifier
function classifyVoiceCommand(transcript) {
  const lower = transcript.trim().toLowerCase();

  // 1. Run Shell
  const shellMatch = lower.match(/^(?:run shell|execute|run command|terminal)\s+(.+)$/i);
  if (shellMatch) {
    return {
      type: "shell",
      label: `Run Shell: ${shellMatch[1]}`,
      action: () => sendPrompt(`run_shell: ${shellMatch[1]}`)
    };
  }

  // 2. Run Tests
  if (lower.includes("run test") || lower.includes("run tests") || lower.includes("test project") || lower.includes("run unit test")) {
    return {
      type: "tests",
      label: "Run Project Tests",
      action: () => handleQuickAction("tests")
    };
  }

  // 3. Git Status
  if (lower.includes("git status") || lower.includes("check git") || lower.includes("git diff")) {
    return {
      type: "git",
      label: "Check Git Status",
      action: () => sendPrompt("Check git status and current branch in the workspace using run_shell.")
    };
  }

  // 4. Explain Code
  if (lower.includes("explain code") || lower.includes("explain this") || lower.includes("explain file") || lower.includes("what does this code do")) {
    return {
      type: "explain",
      label: "Explain Code",
      action: () => handleQuickAction("explain")
    };
  }

  // 5. Find Bugs / Debug
  if (lower.includes("find bug") || lower.includes("find bugs") || lower.includes("check bugs") || lower.includes("debug this") || lower.includes("debug code")) {
    return {
      type: "bugs",
      label: "Find Bugs & Security Issues",
      action: () => handleQuickAction("bugs")
    };
  }

  // 6. Refactor Code
  if (lower.includes("refactor code") || lower.includes("clean up code") || lower.includes("refactor this")) {
    return {
      type: "refactor",
      label: "Refactor Code",
      action: () => handleQuickAction("refactor")
    };
  }

  // 7. Live Preview
  if (lower.includes("live preview") || lower.includes("preview app") || lower.includes("run preview") || lower.includes("open preview") || lower.includes("launch preview")) {
    return {
      type: "preview",
      label: "Open Live Preview",
      action: () => openLivePreview()
    };
  }

  // 8. Starter Templates
  if (lower.includes("starter template") || lower.includes("templates") || lower.includes("new project template") || lower.includes("load template")) {
    return {
      type: "templates",
      label: "Open Templates Gallery",
      action: () => openTemplatesModal()
    };
  }

  // 9. Open Editor
  if (lower.includes("open editor") || lower.includes("edit code") || lower.includes("code editor")) {
    return {
      type: "editor",
      label: "Open Mobile Editor",
      action: () => openEditorWithCurrentFile()
    };
  }

  // 10. Clear Chat
  if (lower.includes("clear chat") || lower.includes("reset chat") || lower.includes("clear conversation")) {
    return {
      type: "clear",
      label: "Clear Conversation",
      action: () => {
        chatHistory = [];
        chatMessages.innerHTML = `
          <div class="welcome-card">
            <div class="welcome-icon">✦</div>
            <h2>Antigravity Mobile IDE</h2>
            <p>Chat cleared. Ready for your next coding instruction or voice command.</p>
          </div>
        `;
        speakText("Conversation cleared.");
      }
    };
  }

  return null;
}

function openVoiceHud() {
  voiceHud.classList.remove("hidden");
  voiceTranscriptDisplay.textContent = "Listening... Speak a coding instruction or command";
  voiceCmdBadge.classList.add("hidden");
  currentVoiceTranscript = "";
  detectedVoiceCommand = null;
}

function closeVoiceHud() {
  voiceHud.classList.add("hidden");
  if (isRecording && speechRecognizer) {
    try { speechRecognizer.stop(); } catch (e) {}
  }
}

function setupVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    btnVoice.style.display = "none";
    return;
  }

  speechRecognizer = new SpeechRecognition();
  speechRecognizer.continuous = false;
  speechRecognizer.interimResults = true;
  speechRecognizer.lang = "en-US";

  speechRecognizer.onstart = () => {
    isRecording = true;
    btnVoice.classList.add("recording");
    triggerHaptic("short");
    openVoiceHud();
  };

  speechRecognizer.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((r) => r[0].transcript)
      .join("");
    currentVoiceTranscript = transcript;
    voiceTranscriptDisplay.textContent = transcript || "Listening...";
    promptInput.value = transcript;

    detectedVoiceCommand = classifyVoiceCommand(transcript);
    if (detectedVoiceCommand) {
      voiceCmdBadge.classList.remove("hidden");
      voiceCmdName.textContent = detectedVoiceCommand.label;
    } else {
      voiceCmdBadge.classList.add("hidden");
    }
  };

  speechRecognizer.onerror = (err) => {
    console.warn("Speech recognition error:", err);
    isRecording = false;
    btnVoice.classList.remove("recording");
    setTimeout(closeVoiceHud, 1200);
  };

  speechRecognizer.onend = () => {
    isRecording = false;
    btnVoice.classList.remove("recording");

    if (detectedVoiceCommand) {
      triggerHaptic("success");
      setTimeout(() => {
        closeVoiceHud();
        detectedVoiceCommand.action();
      }, 500);
    } else if (currentVoiceTranscript.trim().length > 0) {
      triggerHaptic("short");
    } else {
      setTimeout(closeVoiceHud, 400);
    }
  };

  btnVoice.addEventListener("click", () => {
    if (isRecording) {
      speechRecognizer.stop();
    } else {
      try {
        speechRecognizer.start();
      } catch (e) {
        setTimeout(() => speechRecognizer.start(), 200);
      }
    }
  });

  if (btnVoiceCancel) btnVoiceCancel.addEventListener("click", closeVoiceHud);
  if (btnVoiceHudClose) btnVoiceHudClose.addEventListener("click", closeVoiceHud);
  if (voiceHudBackdrop) voiceHudBackdrop.addEventListener("click", closeVoiceHud);

  if (btnVoiceSubmit) {
    btnVoiceSubmit.addEventListener("click", () => {
      closeVoiceHud();
      if (detectedVoiceCommand) {
        detectedVoiceCommand.action();
      } else if (currentVoiceTranscript.trim()) {
        sendPrompt(currentVoiceTranscript);
      }
    });
  }
}

// ==========================================
// 11. EVENT LISTENERS & INITIALIZATION
// ==========================================
btnSend.addEventListener("click", () => sendPrompt());

promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendPrompt();
  }
});

if (btnTts) btnTts.addEventListener("click", toggleTts);
if (btnPip) btnPip.addEventListener("click", togglePiP);

btnSettings.addEventListener("click", () => {
  initSettings();
  settingsModal.classList.remove("hidden");
});
btnCloseSettings.addEventListener("click", () => settingsModal.classList.add("hidden"));
btnSaveSettings.addEventListener("click", saveSettings);
if (btnTestConnection) {
  btnTestConnection.addEventListener("click", testServerConnection);
}

promptInput.addEventListener("input", () => {
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, 110) + "px";
});

window.addEventListener("DOMContentLoaded", () => {
  setupMarkdownParser();
  initSettings();
  initTts();
  Workspace.init();
  setupVoice();

  // Initial Termux health check and periodic heartbeat
  checkTermuxHealth();
  serverCheckTimer = setInterval(checkTermuxHealth, 8000);
});
