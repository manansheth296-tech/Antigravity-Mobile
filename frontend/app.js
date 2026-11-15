// Antigravity Mobile Frontend Client (SSE Streamed, Zero-Dependency Backend)

let currentAgentMessageEl = null;
let currentAgentBubbleEl = null;
let activeToolCards = {};
let speechRecognizer = null;
let isRecording = false;

// DOM Elements
const chatMessages = document.getElementById("chat-messages");
const promptInput = document.getElementById("prompt-input");
const btnSend = document.getElementById("btn-send");
const btnVoice = document.getElementById("btn-voice");
const activityPill = document.getElementById("live-activity-pill");
const activityText = document.getElementById("activity-text");
const modelLabel = document.getElementById("model-label");
const statusDot = document.querySelector(".status-dot");

// Drawer & Modals
const btnToggleFiles = document.getElementById("btn-toggle-files");
const btnCloseDrawer = document.getElementById("btn-close-drawer");
const fileDrawer = document.getElementById("file-drawer");
const drawerOverlay = document.getElementById("drawer-overlay");
const fileList = document.getElementById("file-list");

const btnSettings = document.getElementById("btn-settings");
const btnCloseSettings = document.getElementById("btn-close-settings");
const settingsModal = document.getElementById("settings-modal");
const btnSaveSettings = document.getElementById("btn-save-settings");
const inputApiKey = document.getElementById("input-api-key");
const selectModel = document.getElementById("select-model");
const inputWorkspace = document.getElementById("input-workspace");

const fileViewerModal = document.getElementById("file-viewer-modal");
const btnCloseViewer = document.getElementById("btn-close-viewer");
const viewerFilename = document.getElementById("viewer-filename");
const viewerCode = document.getElementById("viewer-code");

// --- Health / Status Checker ---
async function checkServerHealth() {
  try {
    const res = await fetch("/api/status");
    if (res.ok) {
      const data = await res.json();
      statusDot.style.backgroundColor = "var(--accent-green)";
      statusDot.style.boxShadow = "0 0 8px var(--accent-green)";
      if (data.model) {
        modelLabel.textContent = data.model.replace("gemini-", "");
        selectModel.value = data.model;
      }
      if (data.workspace) {
        inputWorkspace.value = data.workspace;
      }
      if (data.has_api_key && !inputApiKey.value) {
        inputApiKey.placeholder = "API Key is configured (saved)";
      }
    } else {
      statusDot.style.backgroundColor = "var(--accent-amber)";
    }
  } catch (err) {
    statusDot.style.backgroundColor = "var(--accent-red)";
    statusDot.style.boxShadow = "none";
  }
}

// --- Agent Event Handler ---
function handleAgentEvent(event) {
  switch (event.type) {
    case "status":
      showActivity(event.data);
      break;

    case "chunk":
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
      break;

    case "done":
      hideActivity();
      finalizeAgentMessage();
      break;
  }
}

function showActivity(text) {
  activityText.textContent = text;
  activityPill.classList.remove("hidden");
}

function hideActivity() {
  activityPill.classList.add("hidden");
}

// --- Chat Rendering ---
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

function renderToolCall(toolName, args) {
  if (!currentAgentMessageEl) {
    createAgentMessageContainer();
  }

  const card = document.createElement("div");
  card.className = "tool-card";

  const header = document.createElement("div");
  header.className = "tool-header";
  header.innerHTML = `
    <div class="tool-title">
      <span>⚙</span>
      <span>${escapeHtml(toolName)}</span>
    </div>
    <span class="tool-badge running">RUNNING</span>
  `;

  const body = document.createElement("div");
  body.className = "tool-body";
  body.textContent = JSON.stringify(args, null, 2);

  card.appendChild(header);
  card.appendChild(body);

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
  badge.textContent = isSuccess ? "DONE" : "ERROR";

  const body = card.querySelector(".tool-body");
  let outputText = "";
  if (result.stdout) outputText += result.stdout;
  if (result.stderr) outputText += (outputText ? "\n" : "") + result.stderr;
  if (result.content) outputText = result.content;
  if (!outputText) outputText = JSON.stringify(result, null, 2);

  body.textContent = outputText;
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

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- SSE Streaming via Fetch ---
async function sendPrompt() {
  const text = promptInput.value.trim();
  if (!text) return;

  appendUserMessage(text);
  promptInput.value = "";
  promptInput.style.height = "auto";

  showActivity("Thinking...");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text })
    });

    if (!res.ok) {
      hideActivity();
      renderErrorMessage(`Server responded with ${res.status}: ${res.statusText}`);
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
            handleAgentEvent(eventJson);
            if (eventJson.type === "done" || eventJson.type === "error") {
              try { await reader.cancel(); } catch (e) {}
              return;
            }
          } catch (e) {
            console.error("Parse error:", e, trimmed);
          }
        }
      }
    }
  } catch (err) {
    hideActivity();
    renderErrorMessage(`Network error: ${err.message}`);
  }
}

function sendQuickPrompt(prompt) {
  promptInput.value = prompt;
  sendPrompt();
}

// --- Voice Recognition ---
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

// --- File Explorer Drawer ---
async function loadFiles() {
  try {
    const res = await fetch("/api/files");
    const data = await res.json();
    fileList.innerHTML = "";

    if (data.status === "success" && data.items.length > 0) {
      data.items.forEach((item) => {
        const el = document.createElement("div");
        el.className = "file-item";
        el.innerHTML = `
          <span>${item.type === "dir" ? "📁" : "📄"}</span>
          <span>${escapeHtml(item.rel_path)}</span>
        `;
        if (item.type === "file") {
          el.onclick = () => openFileViewer(item.rel_path);
        }
        fileList.appendChild(el);
      });
    } else {
      fileList.innerHTML = '<p class="empty-state">No files in workspace.</p>';
    }
  } catch (err) {
    fileList.innerHTML = '<p class="empty-state">Failed to load files.</p>';
  }
}

async function openFileViewer(path) {
  try {
    const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    viewerFilename.textContent = path;
    viewerCode.textContent = data.content || data.message || "";
    fileViewerModal.classList.remove("hidden");
  } catch (err) {
    alert("Could not load file: " + err);
  }
}

// --- App Settings ---
async function saveSettings() {
  const payload = {
    api_key: inputApiKey.value.trim() || undefined,
    model_name: selectModel.value,
    workspace_dir: inputWorkspace.value.trim() || undefined
  };

  await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  settingsModal.classList.add("hidden");
  checkServerHealth();
}

// --- Event Listeners ---
btnSend.addEventListener("click", sendPrompt);

promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendPrompt();
  }
});

btnToggleFiles.addEventListener("click", () => {
  fileDrawer.classList.add("open");
  drawerOverlay.classList.add("active");
  loadFiles();
});

btnCloseDrawer.addEventListener("click", () => {
  fileDrawer.classList.remove("open");
  drawerOverlay.classList.remove("active");
});

drawerOverlay.addEventListener("click", () => {
  fileDrawer.classList.remove("open");
  drawerOverlay.classList.remove("active");
});

btnSettings.addEventListener("click", () => settingsModal.classList.remove("hidden"));
btnCloseSettings.addEventListener("click", () => settingsModal.classList.add("hidden"));
btnSaveSettings.addEventListener("click", saveSettings);
btnCloseViewer.addEventListener("click", () => fileViewerModal.classList.add("hidden"));

// Auto-expand textarea
promptInput.addEventListener("input", () => {
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, 120) + "px";
});

// Initialization
window.addEventListener("DOMContentLoaded", () => {
  checkServerHealth();
  setupVoice();
  setInterval(checkServerHealth, 5000);
});
