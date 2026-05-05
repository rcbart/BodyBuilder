# 🏋️ BodyBuilder

A coach-focused web application for managing athlete training programs — workouts, nutrition, supplements, and progress tracking — all running locally on your Mac with no cloud subscription required.

**Current version:** 1.1.1 · macOS

---

## Features

| Tab | What it does |
|---|---|
| 👤 **Athlete** | Manage multiple athletes; auto-calculates RMR (Mifflin, Harris-Benedict, Katch-McArdle), TDEE, and LBM |
| 📅 **Calendar** | Log daily steps, aerobic activity, and notes; workout sessions from active plans appear automatically |
| 🍽️ **Meal Plan** | Set macro targets; build training-day and rest-day meal plans from a built-in food library or custom foods |
| 🔄 **Food Swaps** | Create food swap pairs by category (carbs, fats, fruits/veg) for flexible meal planning |
| 💊 **Supplements** | Schedule supplements by day of week and time of day (AM / Intra / PM) |
| 🏋️ **Workout** | Build multi-session training plans with exercises, sets/reps/weight, RIR, tempo, and intensifiers; full cardio mode with duration, RPE, and heart rate zones |
| ⚙️ **Admin** | Export athlete programs to Excel; email programs via SMTP; customise TDEE activity multipliers |

**Other highlights**
- Light and dark mode (persisted across sessions)
- Imperial and metric unit support
- Exercise image library fetched automatically from Wikipedia
- Session templates — clone any saved session as a starting point
- Fully offline after first install — no internet required to use the app

---

## Installation (macOS)

Full step-by-step guidance including troubleshooting is in [`installer/INSTALL_GUIDE.md`](installer/INSTALL_GUIDE.md).

**Quick start:**
1. Open the `installer` folder.
2. **Right-click** `install.command` → **Open** → click **Open** in the security dialog.
3. Follow the on-screen prompts (~1–2 minutes).
4. Launch **BodyBuilder** from your Desktop or the Applications folder.

The installer creates a self-contained Python virtual environment in `~/.bodybuilder/` and installs a macOS `.app` bundle. Your data lives in `~/.bodybuilder/app/backend/bodybuilder.db` and is never touched by updates.

**Requirements:** macOS 11 (Big Sur) or newer · Python 3.8+ · ~200 MB free disk space

---

## Updating

1. Stop BodyBuilder (double-click **Stop BodyBuilder** on your Desktop).
2. Replace the project folder with the new version.
3. Re-run `installer/install.command`.

Your athlete data is preserved across updates.

---

## Development

The app is a FastAPI backend + plain React 18 (CDN, no bundler) frontend.

```
bodyBuilder/
├── backend/
│   ├── main.py          # FastAPI app, all endpoints, Pydantic models
│   ├── seed_images.py   # One-off script to pre-fetch exercise images from Wikipedia
│   └── exercise_images/ # Cached exercise images (gitignored)
├── frontend/
│   ├── index.html       # Entry point — loads all JS via Babel standalone
│   ├── css/style.css    # CSS custom properties; light/dark themes
│   └── js/
│       ├── api.js           # Thin fetch wrappers
│       ├── validation.js    # Shared validation rules
│       ├── components.js    # Shared React components
│       ├── app.js           # Root — athlete switcher, tab shell
│       ├── athlete-tab.js
│       ├── calendar-tab.js
│       ├── mealplan-tab.js
│       ├── foodswaps-tab.js
│       ├── supplements-tab.js
│       ├── workout-tab.js
│       └── admin-tab.js
├── installer/
│   ├── install.command  # macOS double-click installer
│   └── INSTALL_GUIDE.md # Non-technical installation guide
├── VERSION              # Single source of truth for the version number
└── CHANGELOG.md
```

**Running locally without the installer:**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install fastapi uvicorn[standard] pydantic openpyxl python-multipart aiofiles
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Then open `http://localhost:8000` in your browser.

---

## Data & Privacy

All data is stored locally in `~/.bodybuilder/app/backend/bodybuilder.db` (SQLite). Nothing is sent to any server. The only network calls are:
- Fetching exercise images from Wikipedia (one-time, on demand via the image seed endpoint).
- SMTP email sending (only when you configure it and click **Send Program**).

**Backup:** copy `bodybuilder.db` somewhere safe.  
**Restore:** stop the app, replace the file, restart.

**Uninstall:**
```bash
rm -rf ~/.bodybuilder
rm -rf /Applications/BodyBuilder.app
rm -f ~/Desktop/BodyBuilder ~/Desktop/"Stop BodyBuilder.command"
```

---

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md) for a full version history.

---

*Built for coaches who care about their athletes.*
