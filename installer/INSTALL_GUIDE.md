# BodyBuilder — Installation Guide

**Version 1.1.0 · macOS**

---

## What You Need Before Starting

| Requirement | Details |
|---|---|
| Computer | Mac running macOS 11 (Big Sur) or newer |
| Internet | Required during installation only |
| Disk space | ~200 MB free |
| Python | Version 3.8 or newer (see Step 1 if unsure) |

> **Not sure if you have Python?** Skip to **Step 1** — it will tell you clearly.

---

## Step 1 — Check (or Install) Python

1. Press **Command + Space** on your keyboard to open Spotlight Search.
2. Type `Terminal` and press **Return**. A white or black window will open.
3. In that window, type exactly this and press **Return**:
   ```
   python3 --version
   ```
4. **If you see something like** `Python 3.10.5` (any number 3.8 or higher), Python is installed. Jump to **Step 2**.
5. **If you see** `command not found` or a version lower than 3.8:
   - Open your web browser and go to **https://www.python.org/downloads/**
   - Click the large yellow **"Download Python"** button
   - Open the downloaded `.pkg` file and follow the on-screen installer
   - When it finishes, close and re-open Terminal, then repeat step 3 above

---

## Step 2 — Run the Installer

1. Open the **`installer`** folder (the same folder this guide is in).
2. Find the file called **`install.command`**.
3. **Right-click** on `install.command` and choose **"Open"** from the menu.
   > ⚠️ You must right-click and choose Open the **first time only**. If you just double-click, macOS may block it — see [macOS blocked the installer](#macos-says-the-file-cant-be-opened) below.
4. A security dialog will appear asking if you're sure. Click **"Open"**.
5. A Terminal window opens and the installer begins. You will see progress messages.
6. When prompted **"Press Return to continue"**, press the **Return** key on your keyboard.
7. The installer will download the required packages. **This may take 1–2 minutes** — you will see text appearing as each package is installed.
8. When you see **"Installation complete!"**, the installer is finished.
9. You will be asked **"Launch BodyBuilder now?"** — type `Y` and press **Return** to open the app immediately, or type `N` to skip.

---

## Step 3 — Launch BodyBuilder

After installation there are **two ways to start BodyBuilder**:

### Option A — Desktop shortcut (easiest)
Look for **BodyBuilder** on your Desktop. Double-click it.

### Option B — Applications folder
Open Finder, click **Applications** in the left sidebar, and double-click **BodyBuilder**.

**What happens when you launch:**
- A brief Terminal window appears while the server starts (5–10 seconds)
- Your web browser opens automatically to `http://localhost:8000`
- The app is ready to use

> The Terminal window can be **minimised** or left in the background — do not close it while using the app.

---

## Step 4 — Stop BodyBuilder

When you are done using BodyBuilder, **double-click `Stop BodyBuilder`** on your Desktop.

You will see a notification confirming it has stopped.

Alternatively, you can simply **restart your Mac** — BodyBuilder stops automatically.

---

## Step 5 — Updating to a New Version

When a new version of BodyBuilder is available:

1. Replace the `bodyBuilder` project folder with the new version.
2. Open the new `installer` folder.
3. **Stop BodyBuilder** first if it is running.
4. Right-click `install.command` → Open, and run it again.

The installer will update the app files and packages automatically. **Your data (athletes, meals, workouts) is preserved** — it lives in `~/.bodybuilder/app/backend/bodybuilder.db` and is never deleted during updates.

---

## Troubleshooting

### macOS says the file can't be opened
**Symptom:** A dialog says *"install.command cannot be opened because it is from an unidentified developer"* or *"Apple cannot check it for malicious software"*.

**Fix:**
1. Find `install.command` in Finder.
2. **Right-click** (or Control-click) on it.
3. Choose **"Open"** from the menu — not double-click.
4. In the dialog that appears, click **"Open"**.

This only needs to be done once. The app itself does not trigger this warning after installation.

---

### "python3 not found" or "command not found"
**Symptom:** The installer prints an error about Python not being found.

**Fix:**
1. Go to **https://www.python.org/downloads/**
2. Click **"Download Python 3.x.x"** (the big yellow button)
3. Open the downloaded file and complete the installer
4. **Close Terminal completely**, then re-open it and run the installer again

---

### "Package installation failed" or "Could not connect"
**Symptom:** The installer stops while installing packages and shows a network error.

**Fix:**
1. Check that your Mac is connected to the internet (try loading a webpage in your browser)
2. If you use a corporate VPN, try disconnecting it temporarily
3. If you use a proxy, see [Using a proxy](#using-a-proxy)
4. Run the installer again — it will continue from where it left off

---

### "Not enough disk space"
**Symptom:** The installer says it needs ~200 MB but your disk is full.

**Fix:**
1. Open the Apple menu → **About This Mac** → **Storage**
2. Click **"Manage"** to see what is using space
3. Empty the Trash, remove large unused files, or move files to an external drive
4. Run the installer again once you have freed up space

---

### Port 8000 is already in use
**Symptom:** The app launches but the browser shows an error, or you see a message about port 8000 being in use.

**Fix:**
1. Check if BodyBuilder is already running — look for `Stop BodyBuilder` on your Desktop and run it.
2. If that doesn't help, restart your Mac to clear all running services.
3. If another application on your Mac uses port 8000 permanently, contact support.

---

### Browser shows "This site can't be reached" or a blank page
**Symptom:** The browser opens but shows an error instead of the BodyBuilder app.

**Fix:**
1. Wait 15 seconds and refresh the page — the server may still be starting.
2. Make sure the Terminal window that appeared when you launched the app is **still open** (do not close it).
3. Try typing `http://localhost:8000` directly into your browser address bar.
4. If it still fails, stop and restart BodyBuilder.

---

### BodyBuilder stopped working after a Mac update
**Symptom:** BodyBuilder used to work but after a macOS update it no longer opens.

**Fix:**
Run the installer again. macOS updates occasionally change system Python paths. The installer detects this and reconfigures everything.

---

### App opens but shows an error about the database
**Symptom:** The app loads but shows a red error banner about being unable to load data.

**Fix:**
1. Make sure only **one copy** of BodyBuilder is running.
2. Check that the folder `~/.bodybuilder/app/backend/` exists and is not read-only:
   - Open Terminal and type: `ls ~/.bodybuilder/app/backend/`
   - You should see `bodybuilder.db` and `main.py` listed
3. If the folder is missing, run the installer again.

---

### Using a proxy
If your network routes traffic through a proxy server, pip (the package installer) needs to know about it.

Before running `install.command`, open Terminal and run:
```bash
export https_proxy=http://YOUR_PROXY_ADDRESS:PORT
export http_proxy=http://YOUR_PROXY_ADDRESS:PORT
```
Then run `install.command` from the same Terminal window by typing:
```bash
bash ~/path/to/installer/install.command
```

---

## File Locations After Installation

| Item | Location |
|---|---|
| Application files | `~/.bodybuilder/app/` |
| Python environment | `~/.bodybuilder/venv/` |
| Database (your data) | `~/.bodybuilder/app/backend/bodybuilder.db` |
| Exercise images | `~/.bodybuilder/app/backend/exercise_images/` |
| Server log | `~/.bodybuilder/server.log` |
| macOS app | `/Applications/BodyBuilder.app` |
| Desktop shortcut | `~/Desktop/BodyBuilder` |
| Stop shortcut | `~/Desktop/Stop BodyBuilder.command` |

---

## Uninstalling

To completely remove BodyBuilder:

1. **Stop BodyBuilder** if it is running (double-click `Stop BodyBuilder` on Desktop).
2. Open Terminal and run these three commands one at a time:
   ```bash
   rm -rf ~/.bodybuilder
   rm -rf /Applications/BodyBuilder.app
   rm -f ~/Desktop/BodyBuilder ~/Desktop/"Stop BodyBuilder.command"
   ```
3. That's it — BodyBuilder is completely removed.

> ⚠️ This will also delete your data (athletes, meal plans, workouts). **Back up `~/.bodybuilder/app/backend/bodybuilder.db`** before uninstalling if you want to keep your data.

---

## Getting Help

If you encounter a problem not covered in this guide:

1. Open `~/.bodybuilder/server.log` in TextEdit — it contains detailed error messages that can help diagnose the problem.
2. Take a screenshot of any error message you see.
3. Note the macOS version (Apple menu → About This Mac) and the BodyBuilder version shown in the top-right corner of the app.
