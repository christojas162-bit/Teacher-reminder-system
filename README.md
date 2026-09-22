# Teacher Reminder & Acknowledgement Automation Hub

A modern, responsive, single-page functional web application built to trigger, monitor, and manage the **Teacher Reminder & Acknowledgement System** workflow deployed on **CrewAI Enterprise Cloud**.

Hosted seamlessly on **Vercel** with zero build configuration required.

---

## 🌟 Key Features

- **Direct CrewAI Integration**:
  - Pre-configured with your active CrewAI endpoint (`https://teacher-reminder-acknowledgement-system-v1--be296410.crewai.com`) and Bearer Token (`9f387117896f`).
  - Real-time API health monitor with round-trip latency tracking.
- **Intelligent Form Control**:
  - **Auto-Extraction of Google Sheet IDs**: Paste either a raw ID or full Google Sheets URL (e.g., `https://docs.google.com/spreadsheets/d/{ID}/edit`), and the app automatically extracts the clean ID.
  - **Quick Reminder Templates**: Pre-loaded templates for Mid-Term Grade Submissions, Faculty Meeting Confirmations, Weekly Lesson Plan Follow-ups, and Professional Development Acknowledgements.
- **Live Workflow Telemetry & Tracking**:
  - Instant dispatch (`POST /kickoff`).
  - Active polling (`GET /status/{kickoff_id}`) every 2 seconds with animated progress bars, status badges (`Queued`, `Running`, `Completed`, `Failed`), and real-time elapsed execution stopwatch.
  - Live console terminal displaying timestamped telemetry logs.
- **Rich Output Presentation**:
  - Formatted Markdown viewer with syntax-highlighted code blocks, tables, lists, and headers.
  - Raw JSON inspection tab for developers.
  - 1-Click "Copy Output" and "Download Report" (.txt / .json).
- **Execution History**:
  - Automatically saves execution records (Kickoff ID, Spreadsheet ID, Status, Duration) in browser `localStorage`.
  - Fast 1-click re-population of previous Sheet IDs.
- **Customizable Security Settings**:
  - In-app credentials manager allowing you to update or override API tokens and base URLs on the fly without editing code or redeploying.

---

## 🚀 How to Deploy to Vercel

This repository is built as a zero-dependency static single-page application and is ready to deploy immediately to Vercel.

### Method 1: Deploy via Vercel Web Dashboard (Recommended)

1. Push this project folder to a GitHub, GitLab, or Bitbucket repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Teacher Reminder Automation Hub"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new) and log into your Vercel account.
3. Import your Git repository.
4. Keep the default settings:
   - **Framework Preset**: `Other`
   - **Root Directory**: `./`
   - **Build Command**: Leave empty (none required)
   - **Output Directory**: Leave empty
5. Click **Deploy**. Your app will be live globally in less than 10 seconds!

### Method 2: Deploy via Vercel CLI

If you have the Vercel CLI installed:
```bash
vercel
```
Follow the short terminal prompts and select defaults. For production deployment:
```bash
vercel --prod
```

---

## 💻 Running Locally

You can open `index.html` directly in any modern browser:

- Double-click `index.html` in your file explorer, OR
- Serve with any local HTTP server (such as VS Code Live Server, Python `python -m http.server 3000`, or Node `npx serve`).

---

## ⚙️ CrewAI Workflow Endpoints Used

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/inputs` | Verifies connection and retrieves dynamic required fields (`spreadsheet_id`, `reminder_input`). |
| `POST` | `/kickoff` | Initiates the crew execution with JSON input payload and returns a unique `kickoff_id`. |
| `GET` | `/status/{kickoff_id}` | Polls the current task, state (`queued`, `running`, `completed`), and final output results. |

---

## 🔒 Security Note

All API credentials configured in the UI or stored in `localStorage` are transmitted directly from your client browser to the CrewAI Cloud API endpoint over TLS (HTTPS). No intermediary backend or third-party servers see your tokens.
