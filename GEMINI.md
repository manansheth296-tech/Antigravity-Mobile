# Project: PocketDev Mobile

## 1. Overview & Objective
PocketDev Mobile is a mobile-first agentic AI IDE and companion application for Android. It brings autonomous code generation, multi-file inspection, Linux execution, and voice-assisted AI development directly to a dedicated Samsung Galaxy F13 (and companion devices), with bidirectional context synchronization with the main PC workstation.

---

## 2. Core Architecture & Operation Modes

### Mode 1: Standalone Android App (APK) — [ACTIVE & DEPLOYED]
- **Engine:** Direct client-side HTTPS connection to Google Gemini API (`gemini-3.5-flash-lite`).
- **No Background Server Required:** Runs directly as an installed Android app (`com.pocketdev.mobile.debug`) on the phone.
- **Built-in Mobile IDE Superpowers:**
  - **Bundled Offline Runtime:** Zero external CDN dependencies; `marked.min.js`, `prism.min.js`, `prism-tomorrow.css`, and language grammars are bundled directly inside the APK assets.
  - **Virtual On-Device Workspace:** Local file system stored in `localStorage` supporting multi-file projects, create, import, export, delete, and search.
  - **Fullscreen Mobile Code Editor:** Line numbers gutter, syntax highlighting, search/replace, and a dedicated **Mobile Coding Symbols Ribbon** (`Tab`, `{ }`, `( )`, `[ ]`, `" "`, `' '`, `=`, `;`, `:`, `>`, `<`, `/`, `\`, `!`, `$`, `#`, `_`) for rapid mobile typing.
  - **Live Mobile Web Sandbox Runner:** Sandboxed `<iframe>` that instantly renders and runs HTML5, Canvas, CSS, and JS web applications live on device, complete with a slide-up **Virtual DevTools Console** capturing logs, warnings, and errors.
  - **Voice-Driven Coding & HUD:** Visual glowing audio waveform HUD with developer voice shortcuts (*"Run tests"*, *"Run shell"*, *"Explain code"*, *"Find bugs"*), TTS speech responses, and haptic feedback.
  - **Android Picture-in-Picture (`⧉ PiP`):** Native floating companion mode allows the IDE to float over Termux, Chrome, or any other app.
  - **In-Chat Code Block Superpowers:** Header bar with language badges, 1-tap copy with checkmark animations, "✏️ Edit" (pops snippet into Editor), and "▶ Run" (directly launches snippet in Live Preview).
  - **Starter Templates Scaffolding Gallery:** 1-click scaffolding for:
    1. 🎮 *Neon Arcade Touch Game* (60fps Canvas physics game with virtual touch controls)
    2. 📱 *Obsidian Mobile Notes PWA* (Offline notes and task manager)
    3. 📊 *Real-time Telemetry Dashboard* (Live canvas charts)
    4. 🐍 *Termux Hardware Telemetry Script* (Battery, sensors, haptics)
    5. ⚡ *FastAPI Microservice Boilerplate*
  - **Developer Quick-Action Chips:** Horizontal ribbon above the input bar for instant prompts (⚡ Explain Code, 🧪 Generate Tests, 🐞 Find Bugs, 🛠️ Refactor, ▶ Live Preview, 📂 Templates, 📱 Termux API).
- **Automated Cloud Compilation:** GitHub Actions workflow (`.github/workflows/build-apk.yml`) automatically compiles and releases APKs upon push.

### Mode 2: Termux Linux Agent Environment (Full Terminal Shell Engine) — [ACTIVE & INTEGRATED]
- **Engine:** Pure Python multithreaded server (`run.py`, `backend/server.py`, `backend/gemini_client.py`).
- **Capabilities:** Direct bash tool calling (`run_shell`), file reader/writer/patcher (`read_file`, `write_file`, `patch_file`), git safety checkpoints (`git_checkpoint`), Termux API hardware status (`get_device_status`).
- **Hybrid Dual-Engine Architecture:** Auto-detects local Termux agent on `http://localhost:8000`. When active, streams tool call execution cards directly into chat and reads/writes real Android disk files; when offline, seamlessly falls back to Standalone Mode.
- **Requirements:** 100% standard library (zero C/Rust compiled packages, fully compatible with 32-bit ARM Android).
- **Scripts:** `termux_setup.sh` (1-command installer) and `start_termux.sh` (background daemon launcher).

### Mode 3: Desktop Hub & Context Bridge (Phase 2)
- Main PC workstation serves as the central heavy-compute and repository hub.
- Local network / Tailscale sync between mobile device and desktop.

---

## 3. Hardware Profile
* **Primary Target:** Samsung Galaxy F13 (`SM-E135F`)
  * **Storage:** 128 GB
  * **OS:** Android 14 (One UI Core 6.1)
  * **Userspace ABI:** 32-bit (`armeabi-v7a`)
  * **Battery:** 6,000 mAh
  * **ADB Serial:** `RZ8W405CPNY`
* **Secondary Targets:** Samsung Galaxy M02s (64GB), Xiaomi / Redmi.

---

## 4. Current Status & Active Model
* **Active LLM Target:** `gemini-3.5-flash-lite` (Sub-2.5s generation latency; default everywhere).
* **Android Native Source:** Located in `android/`. Package: `com.pocketdev.mobile`.
* **Automated APK Builder:** Configured in `.github/workflows/build-apk.yml`.
* **GitHub Repository:** `https://github.com/manansheth296-tech/Antigravity-Mobile.git`.
