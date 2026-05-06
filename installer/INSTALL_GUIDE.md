# BodyBuilder — Installation Guide

**Version 1.1.3 · macOS**

---

## What You Need Before Starting

| Requirement | Details |
|---|---|
| Computer | Mac running macOS 11 (Big Sur) or newer |
| Internet | Required during installation only |
| Disk space | ~200 MB free |
| Python | Version 3.8 or newer (see Step 2 if unsure) |

> **Not sure if you have Python?** That's fine — Step 2 will walk you through it clearly.

---

## Step 1 — Download BodyBuilder to Your Mac

You only need to do this once. BodyBuilder is downloaded as a ZIP file — no special software required.

### 1a — Open the download page

1. Open your web browser (Safari, Chrome, or Firefox).
2. Go to the link your coach sent you. It will look something like:
   ```
   https://github.com/OWNER/bodyBuilder
   ```
   *(Your coach will give you the exact link.)*

### 1b — Download the ZIP file

1. On the GitHub page, look for the green **"Code"** button near the top right of the page.

   ![Code button location](https://docs.github.com/assets/cb-13128/mw-1440/images/help/repository/code-button.webp)

2. Click it. A small menu will appear.
3. Click **"Download ZIP"** at the bottom of that menu.

   > A file called **`bodyBuilder-main.zip`** (or similar) will be downloaded to your **Downloads** folder.

### 1c — Unzip and move the folder

1. Open your **Downloads** folder. You can find it in the Dock at the bottom of your screen, or open Finder and click **Downloads** in the left sidebar.
2. Find **`bodyBuilder-main.zip`** and **double-click** it. macOS will unzip it automatically and create a folder called **`bodyBuilder-main`**.
3. **Move this folder** somewhere permanent — for example, your **Documents** folder or **Desktop**. Do not leave it in Downloads, as you might accidentally delete it later.
   - To move it: click and drag the **`bodyBuilder-main`** folder to your chosen location.
4. You can rename the folder to **`bodyBuilder`** if you prefer — right-click it and choose **Rename**.

> **That's it for this step.** The folder you just moved is the BodyBuilder application. Keep it in that location — moving it later will require running the installer again.

---

## Step 2 — Check (or Install) Python

1. Press **Command + Space** on your keyboard to open Spotlight Search.
2. Type `Terminal` and press **Return**. A white or black window will open.
3. In that window, type exactly this and press **Return**:
   ```
   python3 --version
   ```
4. **If you see something like** `Python 3.10.5` (any number 3.8 or higher), Python is installed. Jump to **Step 3**.
5. **If you see** `command not found` or a version lower than 3.8:
   - Open your web browser and go to **https://www.python.org/downloads/**
   - Click the large yellow **"Download Python"** button
   - Open the downloaded `.pkg` file and follow the on-screen installer
   - When it finishes, close and re-open Terminal, then repeat step 3 above

---

## Step 3 — Run the Installer

1. Open the **`bodyBuilder`** folder you downloaded in Step 1.
2. Inside it, open the **`installer`** folder.
3. Find the file called **`install.command`**.
4. **Right-click** on `install.command` and choose **"Open"** from the menu.
   > ⚠️ You must right-click and choose Open the **first time only**. If you just double-click, macOS may block it — see [macOS blocked the installer](#macos-says-the-file-cant-be-opened) below.
5. A security dialog will appear asking if you're sure. Click **"Open"**.
6. A Terminal window opens and the installer begins. You will see progress messages.
7. When prompted **"Press Return to continue"**, press the **Return** key on your keyboard.
8. The installer will download the required packages. **This may take 1–2 minutes** — you will see text appearing as each package is installed.
9. When you see **"Installation complete!"**, the installer is finished.
10. You will be asked **"Launch BodyBuilder now?"** — type `Y` and press **Return** to open the app immediately, or type `N` to skip.

---

## Step 4 — Launch BodyBuilder

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

### First launch — no athletes yet?

That is normal. BodyBuilder opens on the **Athlete** tab. You have two options:

- **Create a new athlete** — click the athlete switcher (top right) and choose **Manage Athletes**, then create your first athlete.
- **Restore from a backup** — if you have a `.bb` backup file from a previous installation, click the **Admin** tab. The Backup & Restore panel will be shown automatically. Click **Restore from Backup**, select your `.bb` file, and the app will reload with all your previous data.

---

## Step 5 — Stop BodyBuilder

When you are done using BodyBuilder, **double-click `Stop BodyBuilder`** on your Desktop.

You will see a notification confirming it has stopped.

Alternatively, you can simply **restart your Mac** — BodyBuilder stops automatically.

---

## Step 6 — Updating to a New Version

When a new version of BodyBuilder is available your coach will send you a new download link. Follow these steps:

1. **Stop BodyBuilder** first if it is running (double-click `Stop BodyBuilder` on your Desktop).
2. Download the new ZIP file from the link your coach sends — same as Step 1 above.
3. Unzip it. You will get a new **`bodyBuilder-main`** folder.
4. **Delete** (or rename) your old `bodyBuilder` folder, then move the new one to the same location.
5. Open the new folder → open **`installer`** → right-click `install.command` → **Open**.
6. Follow the on-screen prompts as before.

The installer will update the app files and packages automatically. **Your data (athletes, meals, workouts) is preserved** — it lives in a separate location (`~/.bodybuilder/`) and is never deleted during updates.

---

## Troubleshooting

### "I can't find the download link or the GitHub page looks confusing"
**Symptom:** The GitHub page has a lot of buttons and files and it's not clear what to click.

**Fix:**
1. Make sure you are on the main page of the repository (the URL will end in `/bodyBuilder` or `/bodyBuilder-main`).
2. Look for the **green "Code" button** — it is near the top right, above the list of files.
3. Click it, then click **"Download ZIP"** — that is the only option you need. Ignore everything else on the page.
4. If you cannot find it, ask your coach to send you a **direct download link** instead.

---

### "The ZIP file downloaded but I can't find it"
**Symptom:** The download finished but there is no file on your Desktop or in Finder.

**Fix:**
1. Open **Finder** and click **Downloads** in the left sidebar.
2. Look for a file called **`bodyBuilder-main.zip`**.
3. If it's not there, check your browser's download history:
   - In **Safari**: click **View → Show Downloads** (or press **Command + Option + L**)
   - In **Chrome**: press **Command + J**
   - Click the file in the list to reveal it in Finder.

---

### "The folder is called `bodyBuilder-main` not `bodyBuilder`"
**Symptom:** After unzipping, the folder has `-main` at the end of its name.

**Fix:** This is normal — GitHub always adds `-main` to ZIP downloads. You can rename the folder by right-clicking it and choosing **Rename**, then removing `-main`. Or leave it as-is — it doesn't affect how the app works.

---

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
