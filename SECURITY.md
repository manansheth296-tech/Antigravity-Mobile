# Security, Privacy & Zero-Honeypot Policy

**PocketDev Mobile** is engineered from the ground up with a strict **Zero-Honeypot, Zero-Telemetry, and Direct-to-Provider** architecture.

This document details how your keys, code, and network connections are handled, providing complete transparency so you can audit and verify that PocketDev is not a honeypot.

---

## 1. Zero-Honeypot Guarantee

A "honeypot" in developer tools is an application that lures users into providing API keys, credentials, or terminal access to exfiltrate private tokens or source code. 

**PocketDev Mobile guarantees:**
- **No Middleman Servers:** Your Google Gemini API key is sent directly to Google's official endpoint (`https://generativelanguage.googleapis.com`). It is **never** routed through any proxy, relay, or developer-operated cloud server.
- **No Third-Party Analytics or Telemetry:** PocketDev contains zero tracking code. No Google Analytics, Firebase Analytics, Sentry, Mixpanel, Segment, Datadog, or telemetry beacons.
- **No Remote Script Execution:** Zero CDN dependencies. All dependencies (`marked.min.js`, `prism.min.js`, stylesheets) are physically bundled inside the APK assets. The app executes zero remote `eval()` or unverified external scripts.
- **Local On-Device Storage:** Workspace files, chat history, and configuration are saved exclusively to on-device storage (`localStorage` in Standalone Mode, or your local filesystem in Termux/Desktop mode).
- **100% Auditable Open Source:** Every single line of code—from Java native bridges to web frontend and Python backend—is public under the MIT License.

---

## 2. Complete Network Flow Audit

You can independently verify every outbound request using Chrome Remote Debugging (`chrome://inspect`):

| Mode | Destination URL | Purpose | Secrets Transmitted |
| :--- | :--- | :--- | :--- |
| **Standalone Mode** | `https://generativelanguage.googleapis.com/v1beta/models/*` | Direct Gemini 3.5 Flash Lite inference | User's Gemini API Key (Direct to Google only) |
| **Standalone Mode** | `https://aistudio.google.com/app/apikey` | External link opening user's browser to generate key | None |
| **Termux / Desktop Mode** | `http://localhost:8000` (or user-defined PC IP) | Local loopback SSE stream for tool calls & shell | None (Communicates over local loopback / private LAN) |
| **Telemetry / Tracking** | *None* | *None* | *None* |

---

## 3. Sandboxing & Safe Code Execution

- **Live Web Preview:** The live web sandbox executes HTML5/Canvas/JavaScript code inside an isolated `<iframe>`. Scripts running in the preview sandbox cannot access the parent IDE's `localStorage`, API keys, or Android Native Bridge.
- **Virtual Console:** All `console.log`, `console.warn`, and `console.error` messages inside the sandbox are captured via `window.postMessage` and safely rendered in the slide-up virtual console without touching external networks.

---

## 4. How to Independently Audit PocketDev

We encourage all security researchers and developers to verify this independently:

### Option A: Inspect Live Network Traffic via Chrome DevTools
1. Enable **Developer Options** and **USB Debugging** on your Android device.
2. Connect your phone to your PC and launch PocketDev.
3. Open `chrome://inspect/#devices` on your desktop Chrome browser.
4. Click **Inspect** under `PocketDev Mobile`.
5. Navigate to the **Network** tab and observe all outbound requests. You will see that requests are made *only* to `generativelanguage.googleapis.com` or `localhost:8000`.

### Option B: Build from Source
PocketDev contains no proprietary build scripts or hidden blobs:
```bash
git clone https://github.com/manansheth296-tech/Antigravity-Mobile.git
cd Antigravity-Mobile/android
./gradlew assembleDebug
```
The compiled APK will match the GitHub Actions build exactly.

---

## 5. Reporting a Security Concern
If you discover a vulnerability or security issue, please open an issue on GitHub or submit a pull request with recommended hardening.
