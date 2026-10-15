# WorkshopHub 📅🤖
> **An intelligent, privacy-first personal dashboard to allocate, organize, and track every programme, workshop, and webinar you register for.**

---

### 🔒 100% Client-Side Local Storage — Your Data is Private to You!
> **Important Privacy Notice:**  
> When you use WorkshopHub, all your registered programmes, notes, dates, and meeting links are stored **strictly in your own device's local storage (`localStorage`)**.
> - **Zero Server / Zero Database**: There is NO backend server collecting your schedule.
> - **Zero Data Sharing**: Other people visiting the website cannot see your data, and you cannot see theirs. Each user gets their own completely isolated, private dashboard.
> - **Zero Leaks**: Optional AI API keys are saved only in your personal browser and are never uploaded to GitHub or included in exported files.

---

## 🌐 Live Web App Link
Open immediately on any phone, tablet, or computer:  
👉 **[https://codinggeniusnks.github.io/workshophub/](https://codinggeniusnks.github.io/workshophub/)**

---

## 📱 Phone Users vs. 💻 PC Users: What is the Difference?

| Feature | 📱 Phone Users (iOS & Android) | 💻 PC Users (Windows) |
| :--- | :--- | :--- |
| **Primary Method** | **Web App (PWA)** | **Web App OR Desktop `.exe`** |
| **How to Access** | Open the [Web Link](https://codinggeniusnks.github.io/workshophub/) on Safari or Chrome | Open the [Web Link](https://codinggeniusnks.github.io/workshophub/) OR double-click `WorkshopHub.exe` |
| **Installation** | Tap **"Install"** or **"Add to Home Screen"** (runs as an app, no App Store needed!) | Download the **[WorkshopHub.exe Release](https://github.com/Codinggeniusnks/workshophub/releases)** |
| **Offline Support** | ✅ Yes, works 100% offline | ✅ Yes, works 100% offline |
| **Window Style** | Fullscreen mobile app with ergonomic bottom navigation | Clean borderless desktop window without browser URL bars or tabs |
| **Storage Location** | Your phone browser's private local storage | Your PC's private local storage |

---

## 💻 Download for PC (Windows Standalone `.exe`)

For Windows users who prefer a native desktop application window instead of running inside a web browser:

1. Go to **[GitHub Releases](https://github.com/Codinggeniusnks/workshophub/releases)**.
2. Download **`WorkshopHub-Windows-v2.0.zip`** (only ~40 KB!).
3. Extract the ZIP folder anywhere on your computer.
4. Double-click **`WorkshopHub.exe`** to launch!
   - Runs in a clean, standalone desktop window (no browser address bar, no tabs).
   - Uses a fixed local port (`47821`) so your events stay saved permanently across restarts.

---

## ✨ Core Features

- **🤖 Multimodal AI Ingest (Gemini 2.0 Flash)**:
  - **Paste text**: Paste registration confirmation emails or Google Form receipts.
  - **Upload poster/flyer screenshots**: Gemini vision automatically extracts workshop title, date, start/end time, organizer, online meeting links, or physical venue from the image.
  - **Offline Regex Fallback**: Built-in deterministic extractor works even without an internet connection or without an AI key.
- **💬 "Ask Your Schedule" AI Assistant**: Ask natural-language questions about your schedule (*"What sessions do I have this weekend?"*, *"Do I have any schedule clashes?"*, *"Give me a prep checklist"*).
- **⚠️ Schedule Clash & Conflict Detection**: Automatically warns you if two registered workshops overlap on the same date.
- **📅 1-Click Calendar Sync (Zero API Keys)**:
  - Direct **"Add to Google Calendar"** dynamic link generation.
  - One-click **`.ics` download** compatible with Apple Calendar, Outlook, and mobile devices.
- **⏰ Smart Agenda Timeline**: Grouped into *Today*, *Tomorrow*, *This Week*, *Later*, and *Past* with live countdown badges (`⚡ Live Now!`, `🚨 Today at 2:00 PM`, `In 2 days`).
- **💾 Full Data Portability**: Backup and restore your schedule anytime using **JSON Export/Import** or export to **CSV** for Google Sheets / Excel.

---

## 🔑 How to Get a Free Gemini API Key (Optional)

WorkshopHub works completely offline with built-in regex parsers. To enable AI image vision and the schedule chatbot:
1. Visit **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**.
2. Sign in with your Google Account and click **Create API key**.
3. In WorkshopHub, tap **⚙️ Settings**, paste your key, and click **Save**.
*(Your key is stored only in your own browser's local storage and is never uploaded anywhere.)*

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - free to use, modify, and distribute.
