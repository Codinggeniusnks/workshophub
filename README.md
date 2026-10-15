# WorkshopHub 📅🚀
> **A privacy-first, zero-leak dashboard to allocate, organize, and track every programme, workshop, and webinar you register for.**

Have you ever registered for multiple tech workshops, webinars, or university programmes via **Google Forms**, only to forget:
- *What date and time was it scheduled for?*
- *Is it on Google Meet, Zoom, MS Teams, or an in-person physical hall?*
- *What was the workshop actually about?*
- *Where are the preparation notes or prerequisite links?*

**WorkshopHub** solves this by giving you a clean, unified dashboard with automated countdowns, 1-click calendar sync, and smart Google Form confirmation parsing.

---

## ✨ Features

- **🎯 Complete Workshop Allocation**: Record Title, Organizer, Date, Time, Format (Virtual vs In-Person), Venue / Meeting Link, Passcode, Description ("What is it about?"), Preparation Checklist, and Registration reference.
- **⚡ Smart Ingest (Google Form / Email Parser)**: Simply paste the text from your Google Form confirmation response or email receipt — WorkshopHub automatically extracts dates, meeting URLs, and details locally.
- **📅 1-Click Calendar Sync (Zero API Keys)**:
  - Direct **"Add to Google Calendar"** dynamic link generation.
  - One-click **`.ics` download** compatible with Apple Calendar, Outlook, and mobile devices.
- **⏰ Live Countdowns & Spotlight Banner**:
  - Highlights the very next upcoming workshop with real-time countdown badges (*"Today at 2:00 PM"*, *"In 2 days"*, *"⚡ In Progress Now"*).
- **🔒 Zero-Leak & Privacy by Design**:
  - **No backend database, no external telemetry, and NO API keys required.**
  - All data is stored in the browser's `localStorage`.
  - Your personal schedule is completely private to your device.
- **👥 Multi-User Ready**:
  - Includes an **"Insert Programme"** modal so anyone who clones or visits your deployment can use it immediately for their own schedule.
  - **Sample Demo Mode Switch**: Easily switch between realistic demo workshops and your personal workspace (great for screenshots and showing off the project on GitHub without exposing personal information).
- **💾 Full Data Portability**:
  - Backup & restore your events via **JSON export/import**.
  - Export to **CSV** for Google Sheets or Microsoft Excel.

---

## 🚀 Live Demo & Quick Start

### Option 1: Open Directly in Your Browser (No Installation Required!)
Simply double-click or open `index.html` in any web browser (Chrome, Edge, Firefox, Safari).

### Option 2: Deploy to GitHub Pages (Free, in 30 Seconds)
1. Fork or push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of WorkshopHub"
   git remote add origin https://github.com/<your-username>/workshophub.git
   git branch -M main
   git push -u origin main
   ```
2. On GitHub, go to your repository **Settings** → **Pages**.
3. Under **Build and deployment** → **Source**, select **Deploy from a branch**.
4. Choose the `main` branch and `/ (root)` folder, then click **Save**.
5. Your dashboard is now live at `https://<your-username>.github.io/workshophub/`!

---

## 🛠️ Built With

- **HTML5 & Vanilla ES6+**: Lightweight, blazing fast, zero build steps.
- **Tailwind CSS**: Modern, clean, and responsive UI.
- **Browser LocalStorage**: Offline-capable, private client-side persistence.
- **iCalendar (.ics) Engine**: Standard-compliant calendar generation.

---

## 🛡️ Security & Privacy Assurance

- **No Personal Information Committed**: This repository only contains mock demo data for illustration.
- **Zero API Keys**: No Google Cloud Console, OAuth credentials, or third-party API tokens are required.
- **Isolated Storage**: When other users visit your published GitHub Pages site, their browser stores only their data. They cannot view your schedule, and you cannot view theirs.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - free to use, fork, and customize.
