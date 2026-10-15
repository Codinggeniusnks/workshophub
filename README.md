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
- **☁️ Personal Google Drive Sync (Phone ↔ PC)**:
  - Synchronize your schedule between your smartphone and your PC without any middleman server.
  - **Zero Developer Access**: Stored strictly in your personal Google Drive hidden App Data folder (`spaces=appDataFolder`).
  - **Smart Merge**: Automatically merges offline updates from any device by timestamp without overwriting or losing events.
- **💬 "Ask Your Schedule" AI Assistant**: Ask natural-language questions about your schedule (*"What sessions do I have this weekend?"*, *"Do I have any schedule clashes?"*, *"Give me a prep checklist"*).
- **⚠️ Schedule Clash & Conflict Detection**: Automatically warns you if two registered workshops overlap on the same date.
- **📅 1-Click Calendar Sync (Zero API Keys)**:
  - Direct **"Add to Google Calendar"** dynamic link generation.
  - One-click **`.ics` download** compatible with Apple Calendar, Outlook, and mobile devices.
- **⏰ Smart Agenda Timeline**: Grouped into *Today*, *Tomorrow*, *This Week*, *Later*, and *Past* with live countdown badges (`⚡ Live Now!`, `🚨 Today at 2:00 PM`, `In 2 days`).
- **💾 Full Data Portability**: Backup and restore your schedule anytime using **JSON Export/Import** or export to **CSV** for Google Sheets / Excel.

---

## ☁️ Personal Google Drive Sync Setup (Zero-Access Cloud Sync)

Want to view and manage your workshops seamlessly on both your **phone** and **computer**? WorkshopHub uses Google's secure **AppData Folder API**:

### 🛡️ Why is this 100% Private?
1. **0% Developer Access**: The developer does not have a server or database. The sync communication occurs purely client-side directly between your browser and Google's official servers.
2. **Hidden AppData Folder**: Data is saved to `workshophub_personal_schedule.json` in a hidden app folder inside **your own Google account**. It is invisible in standard Drive folders and inaccessible to any third parties.

### ⚙️ Quick Setup (Takes ~2 minutes):
1. Go to the **[Google Cloud Console](https://console.cloud.google.com/)** and create a free project (e.g. `My WorkshopHub`).
2. Navigate to **APIs & Services > Credentials**.
3. Configure the **OAuth Consent Screen** (User Type: External) and add your own Google email as a test user.
4. Click **Create Credentials > OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**:
     - `https://codinggeniusnks.github.io`
     - `http://127.0.0.1:47821` (for desktop PC launcher)
5. Copy your **Client ID** (looks like `123456789-xxxxxx.apps.googleusercontent.com`).
6. In WorkshopHub:
   - Tap **⚙️ Settings** > scroll down to **Personal Google Drive Sync**.
   - Paste your **Client ID** and click **Sign In with Google**.
   - Grant access, and your events will sync automatically across all your devices!

---

## 🚀 What's Updated in This Release?

- **Added Personal Google Drive Sync (`driveSync.js`)**:
  - Connect your personal Google account to keep schedules synchronized across Phone (PWA) and PC (Desktop `.exe` / Web).
  - 100% serverless, zero developer access guarantee.
  - Bidirectional conflict-free merge algorithm preserving latest updates from both devices.
- **New Sync Status Indicator**:
  - Top header now displays real-time sync status (`☁️ Sign In & Sync`, `Syncing...`, `Synced (Just now)`).
  - One-click instant manual sync button.
- **Clean Slate for New Users**:
  - Removed all hardcoded demo data so newly launched apps start completely clean.
- **Fixed Desktop Port Consistency**:
  - Desktop `.exe` launcher now runs on static port `47821` so `localStorage` events persist permanently across restarts.
- **Enhanced Privacy & Security**:
  - Git history cleaned of personal emails.
  - Strict XSS escaping and URL protocol sanitization (`safeUrl`) for meeting links and forms.

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
