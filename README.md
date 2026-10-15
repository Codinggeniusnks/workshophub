# WorkshopHub 📅🤖
> **An intelligent, privacy-first personal dashboard to allocate, organize, and track every programme, workshop, and webinar you register for.**

Have you ever registered for multiple workshops or tech webinars via **Google Forms**, only to forget:
- *What date and time was it scheduled for?*
- *Is it on Google Meet, Zoom, MS Teams, or a physical campus hall?*
- *What was the workshop actually about?*
- *Do you have overlapping sessions or missing preparation materials?*

**WorkshopHub** automatically organizes your schedule with **AI Multimodal Ingestion (text + flyer screenshots)**, **Schedule Clash Detection**, and **1-Click Calendar Syncing**, available as an **installable Mobile PWA (iOS & Android)**, a **Desktop App**, or hosted on **GitHub Pages**.

---

## ✨ Features

### 🤖 Intelligent AI & Smart Organization
- **Multimodal AI Ingest (Gemini 2.0 Flash)**:
  - **Option A: Paste text** from Google Form receipts or confirmation emails.
  - **Option B: Upload an image / poster screenshot** — Gemini vision reads dates, times, speaker, and links straight from the flyer!
  - **Offline Heuristic Fallback**: Built-in deterministic regex parser works even without an internet connection or without an API key.
- **💬 "Ask Your Schedule" AI Assistant**: Chat with your workshops (*"What sessions do I have this weekend?"*, *"Do I have any clashes?"*, *"Give me a prep checklist"*).
- **⚠️ Schedule Clash & Conflict Detection**: Automatically highlights overlapping workshops on the same day.
- **🔍 Smart Agenda Timeline**: Grouped into *Today*, *Tomorrow*, *This Week*, *Later*, and *Past* with live countdown badges (`⚡ Live Now!`, `🚨 Today at 2:00 PM`, `In 2 days`).

### 📱 Mobile-First & PWA
- **Installable on Android & iOS**: Add to Home Screen in 1 tap directly from your browser.
- **Works 100% Offline**: Service worker caches all assets locally.
- **Android Web Share Target**: Share confirmation emails or WhatsApp messages directly to WorkshopHub to auto-extract details!

### 📅 Zero-API Calendar Sync
- **1-Click "Add to Google Calendar"**: Direct dynamic URL generator pre-filling title, time, venue, and description without Google OAuth credentials.
- **Download `.ics`**: Generates RFC-compliant calendar files with timezone tags compatible with Apple Calendar and Microsoft Outlook.

### 🔒 Privacy-by-Design & Zero-Leak Security
- **No Backend, No External Telemetry, Zero Stored Secrets**:
  - All data is stored in the browser's `localStorage`.
  - Your personal schedule is completely private to your device.
  - Optional Gemini API keys are stored in `localStorage` only, passed via secure HTTPS headers, and **strictly excluded from JSON/CSV exports**.
- **Multi-User Ready**: When published to GitHub Pages, every visitor gets their own private workspace with an "Insert Programme" form. Includes a 1-click **Demo Mode** toggle for portfolio showcase.

---

## 🚀 Quick Start

### 1. Web Browser & Mobile Phone (PWA)
1. Open `index.html` in your browser, or visit your deployed GitHub Pages URL.
2. On mobile (Chrome/Safari), tap **Install** or **Share → Add to Home Screen**.

### 2. Desktop App (Windows)
Double-click `WorkshopHub.exe` (or compile with `powershell -File desktop/build.ps1`):
- Runs in a clean, standalone native desktop window (no browser address bars or tabs).
- Uses a fixed local port (`47821`) so your `localStorage` data persists permanently.
- Single-instance protection prevents duplicate background processes.

---

## 🔑 How to Get a Free Gemini API Key (Optional)

WorkshopHub works completely offline with built-in regex parsers. To enable AI vision and chatbot features:
1. Visit **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**.
2. Sign in with your Google Account and click **Create API key**.
3. In WorkshopHub, tap **⚙️ Settings**, paste your key, and click **Save**.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - free to use, modify, and distribute.
