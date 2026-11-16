// Antigravity Mobile IDE - Complete Standalone Agentic Engine
// Supports On-Device Virtual Workspace, Prism Syntax Highlighting,
// Live Mobile Web Sandbox Runner, Touch Coding Symbols, and Gemini 3.5 API.

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

// --- DOM References ---
const chatMessages = document.getElementById("chat-messages");
const promptInput = document.getElementById("prompt-input");
const btnSend = document.getElementById("btn-send");
const btnVoice = document.getElementById("btn-voice");
const activityPill = document.getElementById("live-activity-pill");
const activityText = document.getElementById("activity-text");
const modelLabel = document.getElementById("model-label");
const statusDot = document.querySelector(".status-dot");

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

// ==========================================
// 1. STARTER TEMPLATES & DEFAULT CODE
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

// Touch / Mouse control
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

  // Smooth player movement
  player.x += (targetX - player.x) * 0.2;
  player.y += (targetY - player.y) * 0.2;

  // Auto fire
  if (timestamp - lastShoot > 180) {
    bullets.push({ x: player.x, y: player.y - player.radius, speed: 9 });
    lastShoot = timestamp;
  }

  // Draw & update bullets
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

  // Spawn enemies
  if (timestamp - lastSpawn > 900) {
    spawnEnemy();
    lastSpawn = timestamp;
  }

  // Draw & update enemies
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

    // Bullet collision
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

    // Player collision
    if (en && Math.hypot(player.x - en.x, player.y - en.y) < player.radius + en.radius) {
      createExplosion(player.x, player.y, "#ffffff");
      enemies.splice(i, 1);
      lives = Math.max(0, lives - 1);
      livesEl.textContent = "♥".repeat(lives);
    }

    if (en && en.y > height + 30) enemies.splice(i, 1);
  }

  // Particles
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

  // Draw Player
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
    "style.css": `body {
  background: #0b0d12;
  color: #f0f4f9;
  font-family: -apple-system, sans-serif;
  margin: 0;
  padding: 16px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
#add-btn {
  background: #4285f4;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: bold;
}
.note-card {
  background: #151922;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
}
.note-title { font-weight: 600; margin-bottom: 6px; }
.note-date { font-size: 11px; color: #9aa0a6; }`,
    "app.js": `const notesList = document.getElementById("notes-list");
const addBtn = document.getElementById("add-btn");

let notes = JSON.parse(localStorage.getItem("notes_data") || "[]");
if (notes.length === 0) {
  notes = [
    { title: "Review Gemini 3.5 Models", content: "Switch to 3.5 Flash Lite for sub-3s response latency.", date: "Today" },
    { title: "Antigravity Mobile IDE", content: "Standalone APK running with bundled Prism and Live Sandbox.", date: "Today" }
  ];
}

function render() {
  notesList.innerHTML = notes.map((n, i) => \`
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

render();
console.log("Obsidian Notes app loaded with", notes.length, "notes.");`
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
      const w = canvas.width;
      const h = canvas.height;

      // Draw grid
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += h / 5) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Draw gradient line
      ctx.strokeStyle = "#4285f4";
      ctx.lineWidth = 3 * window.devicePixelRatio;
      ctx.beginPath();
      data.forEach((val, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - (val / 100) * (h - 20) - 10;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Cycle data
      data.shift();
      data.push(Math.max(10, Math.min(95, data[data.length - 1] + (Math.random() - 0.5) * 15)));

      document.getElementById("m-cpu").textContent = Math.round(data[data.length - 1]) + "%";
      setTimeout(draw, 250);
    }
    draw();
    console.log("Telemetry real-time chart started.");
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
// 2. VIRTUAL WORKSPACE FILE SYSTEM
// ==========================================
const Workspace = {
  KEY: "antigravity_workspace_files",

  init() {
    const saved = localStorage.getItem(this.KEY);
    if (!saved) {
      // Seed with Canvas Game Starter
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

  rename(oldPath, newPath) {
    const files = this.getAll();
    if (files[oldPath] !== undefined) {
      files[newPath] = files[oldPath];
      delete files[oldPath];
      this.saveAll(files);
    }
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

// File icon helper
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
// 3. SETTINGS & MODEL MANAGEMENT
// ==========================================
function getApiKey() {
  return localStorage.getItem("antigravity_api_key") || "";
}

function getSelectedModel() {
  return localStorage.getItem("antigravity_model") || "gemini-3.5-flash-lite";
}

function initSettings() {
  const key = getApiKey();
  const model = getSelectedModel();

  if (key) {
    inputApiKey.value = key;
    statusDot.style.backgroundColor = "var(--accent-green)";
    statusDot.style.boxShadow = "0 0 8px var(--accent-green)";
  } else {
    statusDot.style.backgroundColor = "var(--accent-amber)";
    statusDot.style.boxShadow = "none";
  }

  selectModel.value = model;
  modelLabel.textContent = model.replace("gemini-", "").replace("-preview", "");
}

function saveSettings() {
  const key = inputApiKey.value.trim();
  const model = selectModel.value;

  if (key) {
    localStorage.setItem("antigravity_api_key", key);
  }
  localStorage.setItem("antigravity_model", model);

  settingsModal.classList.add("hidden");
  initSettings();
}

// ==========================================
// 4. CHAT RENDERING & CODE BLOCK ACTIONS
// ==========================================
// Setup Marked with custom code renderer
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

// Action callbacks on in-chat code blocks
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
  Workspace.set(tempName, rawCode);
  openEditorWithCurrentFile(tempName);
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
// 5. DIRECT GEMINI API CALLER
// ==========================================
async function sendPrompt(customPrompt = null) {
  const text = customPrompt ? customPrompt.trim() : promptInput.value.trim();
  if (!text) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    settingsModal.classList.remove("hidden");
    alert("Please enter your Gemini API key in Settings first.");
    return;
  }

  appendUserMessage(text);
  if (!customPrompt) {
    promptInput.value = "";
    promptInput.style.height = "auto";
  }

  showActivity("Thinking...");

  const model = getSelectedModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  chatHistory.push({
    role: "user",
    parts: [{ text: text }]
  });

  // Provide workspace context to AI
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
    generationConfig: {
      temperature: 0.2
    }
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

// Quick action shortcuts
function handleQuickAction(action) {
  const currentCode = Workspace.get(activeFilePath);
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
// 6. WORKSPACE EXPLORER DRAWER
// ==========================================
function renderWorkspaceDrawer() {
  const files = Workspace.list();
  workspaceFileCount.textContent = `${files.length} file${files.length === 1 ? "" : "s"}`;

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

btnNewFile.addEventListener("click", () => {
  const name = prompt("Enter new filename (e.g., script.py, app.js, index.html):");
  if (!name) return;
  if (!Workspace.get(name)) {
    Workspace.set(name, "");
  }
  openEditorWithCurrentFile(name);
  fileDrawer.classList.remove("open");
  drawerOverlay.classList.remove("active");
});

btnImportFile.addEventListener("click", () => inputFileImport.click());

inputFileImport.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  files.forEach(f => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      Workspace.set(f.name, evt.target.result);
      renderWorkspaceDrawer();
    };
    reader.readAsText(f);
  });
  inputFileImport.value = "";
  alert(`Imported ${files.length} file(s) into workspace.`);
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
  editorModal.classList.remove("hidden");
}

function saveActiveFile() {
  Workspace.set(activeFilePath, editorTextarea.value);
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

// Sync scrolling between line numbers and textarea
editorTextarea.addEventListener("scroll", () => {
  editorLineNumbers.scrollTop = editorTextarea.scrollTop;
});

// Handle Tab key
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

// Mobile Coding Symbols Ribbon touch listeners
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

// Editor Search / Find in Code
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

  // Compile standalone document with virtual console hook
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

// Receive logs from sandboxed iframe
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
// 10. VOICE CODING INTEGRATION
// ==========================================
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
  };

  speechRecognizer.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((r) => r[0].transcript)
      .join("");
    promptInput.value = transcript;
  };

  speechRecognizer.onerror = () => {
    isRecording = false;
    btnVoice.classList.remove("recording");
  };

  speechRecognizer.onend = () => {
    isRecording = false;
    btnVoice.classList.remove("recording");
  };

  btnVoice.addEventListener("click", () => {
    if (isRecording) {
      speechRecognizer.stop();
    } else {
      speechRecognizer.start();
    }
  });
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

btnSettings.addEventListener("click", () => settingsModal.classList.remove("hidden"));
btnCloseSettings.addEventListener("click", () => settingsModal.classList.add("hidden"));
btnSaveSettings.addEventListener("click", saveSettings);

// Auto-expand textarea
promptInput.addEventListener("input", () => {
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, 110) + "px";
});

window.addEventListener("DOMContentLoaded", () => {
  setupMarkdownParser();
  initSettings();
  Workspace.init();
  setupVoice();
});
