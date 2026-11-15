// Antigravity Mobile - Standalone Android App Engine

let currentAgentMessageEl = null;
let currentAgentBubbleEl = null;
let activeToolCards = {};
let speechRecognizer = null;
let isRecording = false;
let chatHistory = [];

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

// --- Settings Management ---
function getApiKey() {
  return localStorage.getItem("antigravity_api_key") || "";
}

function getSelectedModel() {
  return localStorage.getItem("antigravity_model") || "gemini-3.8-flash";
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
  }

  selectModel.value = model;
  modelLabel.textContent = model.replace("gemini-", "");
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

// --- Activity Indicator ---
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

// --- Direct Gemini REST API Caller ---
async function sendPrompt() {
  const text = promptInput.value.trim();
  if (!text) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    settingsModal.classList.remove("hidden");
    alert("Please enter your Gemini API key in Settings first.");
    return;
  }

  appendUserMessage(text);
  promptInput.value = "";
  promptInput.style.height = "auto";

  showActivity("Thinking...");

  const model = getSelectedModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  chatHistory.push({
    role: "user",
    parts: [{ text: text }]
  });

  const payload = {
    contents: chatHistory,
    systemInstruction: {
      parts: [{
        text: "You are Antigravity Mobile, an autonomous agentic AI software companion on Android. Help the user build, code, debug, refactor, and architect applications on mobile and desktop. Provide high quality, production-ready code with clear explanations."
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

// --- Event Listeners ---
btnSend.addEventListener("click", sendPrompt);

promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendPrompt();
  }
});

btnSettings.addEventListener("click", () => settingsModal.classList.remove("hidden"));
btnCloseSettings.addEventListener("click", () => settingsModal.classList.add("hidden"));
btnSaveSettings.addEventListener("click", saveSettings);

btnToggleFiles.addEventListener("click", () => {
  alert("Standalone Mobile Mode: Code and chat are stored on-device. Link to desktop PC in Phase 2 for full repo sync.");
});

// Auto-expand textarea
promptInput.addEventListener("input", () => {
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, 120) + "px";
});

// Initialization
window.addEventListener("DOMContentLoaded", () => {
  initSettings();
  setupVoice();
});
