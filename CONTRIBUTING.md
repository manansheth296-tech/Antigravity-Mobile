# Contributing to Antigravity Mobile

Thank you for your interest in contributing to **Antigravity Mobile**! We welcome bug reports, feature suggestions, documentation improvements, and pull requests.

---

## 🛠️ Development Setup

Antigravity Mobile consists of two core layers:
1. **Android App (`android/`):** Native Android wrapper (`MainActivity.java`) embedding the mobile IDE with hardware acceleration, audio recording permissions, and native Picture-in-Picture bridge.
2. **Mobile Web Runtime (`android/app/src/main/assets/` & `frontend/`):** Fullscreen code editor, live sandbox preview runner, offline Prism/Marked runtime, voice coding HUD, and hybrid engine dispatcher.
3. **Termux Linux Backend (`backend/`):** Pure Python standard library multithreaded server powering bash tool execution, file patching, and git checkpoints.

### Requirements
- **Local Testing:** Any modern browser or Node.js to test frontend assets.
- **Android Compilation:** JDK 17, Android SDK Platform 34, Build Tools 34.0.0 (or simply use the automated GitHub Actions builder upon pushing).
- **Backend Execution:** Python 3.9+ (zero pip packages required; 100% standard library).

---

## 🚀 Guidelines for Contributions

1. **Zero Android Compilation Dependencies:** The Python backend must remain 100% standard library so it runs cleanly on any 32-bit or 64-bit Android device without C/Rust compiled wheels.
2. **Speed & Latency First:** Always prioritize lightning-fast models (`gemini-3.5-flash-lite`).
3. **Mobile Ergonomics:** Ensure UI elements are touch-friendly, respect Android navigation/status bar insets, and support the Mobile Coding Symbols Ribbon.
4. **Synchronize Frontend Assets:** When editing frontend files, ensure both `android/app/src/main/assets/` and `frontend/` are kept identical.

---

## 🤝 Submitting Pull Requests

1. Fork the repository.
2. Create your feature branch (`git checkout -b feat/amazing-feature`).
3. Commit your changes with clear messages (`git commit -m "feat: Add support for custom syntax themes"`).
4. Push to the branch (`git push origin feat/amazing-feature`).
5. Open a Pull Request on GitHub. Automated GitHub Actions will automatically compile and verify the APK!
