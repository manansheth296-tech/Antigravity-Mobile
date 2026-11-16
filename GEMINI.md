# Project: Antigravity Mobile

## 1. Overview & Objective
Antigravity Mobile is a mobile-first agentic AI IDE and companion application for Android. It brings autonomous code generation, multi-file inspection, Linux execution, and voice-assisted AI development directly to a dedicated Samsung Galaxy F13 (and companion devices), with bidirectional context synchronization with the main PC workstation.

---

## 2. Core Architecture & Operation Modes

### Mode 1: Standalone Android App (APK) — [ACTIVE & DEPLOYED]
- **Engine:** Direct client-side HTTPS connection to Google Gemini API (`gemini-3.5-flash-lite`).
- **No Background Server Required:** Runs directly as an installed Android app (`com.antigravity.mobile.debug`) on the phone.
- **Features:**
  - Antigravity Obsidian Dark design language with Gemini accents.
  - Native microphone integration for voice coding prompts.
  - On-device API key and conversation history persistence (`localStorage`).
  - Automated cloud compilation via GitHub Actions (`.github/workflows/build-apk.yml`).
  - Direct installation via ADB or GitHub Releases: `https://github.com/manansheth296-tech/Antigravity-Mobile/releases/tag/v1.0.0`.

### Mode 2: Termux Linux Agent Environment (Full Terminal Shell Engine)
- **Engine:** Pure Python multithreaded server (`run.py`, `backend/server.py`, `backend/gemini_client.py`).
- **Capabilities:** Direct bash tool calling, file reader/writer/patcher, git checkpoints, Termux API hardware status.
- **Requirements:** 100% standard library (zero C/Rust compiled packages, fully compatible with 32-bit ARM Android).

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
* **Active LLM Target:** `gemini-3.5-flash-lite` (Lightning-fast 2-second response latency; replaced deprecated 2.5 and slow 3.8 thinking preview).
* **Android Native Source:** Located in `android/`.
* **Automated APK Builder:** Configured in `.github/workflows/build-apk.yml`.
* **GitHub Repository:** `https://github.com/manansheth296-tech/Antigravity-Mobile.git`.
