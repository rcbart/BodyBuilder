# BodyBuilder — Frequently Asked Questions

**Version 1.2.2 · macOS**

This guide covers the most common problems you might run into and exactly how to fix them — no technical experience required.

---

## Starting the App

---

### macOS says "BodyBuilder cannot be opened because it is from an unidentified developer"

**What it looks like:** A dialog appears saying something like *"BodyBuilder cannot be opened because it is from an unidentified developer"* or *"Apple cannot check it for malicious software."*

**What it means:** macOS requires apps sold through the Mac App Store to carry a paid Apple developer certificate. BodyBuilder is distributed directly (not through the App Store), so macOS shows this warning the very first time you open it. The app is safe — this is a one-time security prompt, not an infection warning.

**How to fix it (one-time only):**

1. Open **Finder** and go to your **Applications** folder, or wherever you saved the `BodyBuilder.dmg` and copied the app.
2. Find **BodyBuilder.app**.
3. **Right-click** it (or hold **Control** and click once).
4. Choose **"Open"** from the menu that appears — **do not double-click**.
5. A new dialog appears asking if you're sure. Click **"Open"**.

BodyBuilder will launch normally. You only need to do this once — after that, double-clicking works like any other app.

> **If the "Open" option doesn't appear in the menu:** Go to **System Settings → Privacy & Security**, scroll down, and look for a message about BodyBuilder being blocked. Click **"Open Anyway"**, then enter your Mac password if prompted.

---

### The app won't open / I see "address already in use" in the Terminal

**What it looks like:**
```
ERROR: [Errno 48] error while attempting to bind on address ('127.0.0.1', 8000): address already in use
```

**What it means:** BodyBuilder is already running in the background (or a previous session didn't close cleanly). Two copies can't run at the same time on the same port.

**How to fix it:**

1. Open **Terminal** (search for it in Spotlight with `Cmd+Space`).
2. Type the following and press **Return**:
   ```
   lsof -ti :8000 | xargs kill -9
   ```
3. Wait 2 seconds, then start BodyBuilder again normally (double-click `bodybuilder.sh` or run `python main.py`).

---

### Terminal says "command not found: python" or "No such file or directory"

**What it means:** Python isn't installed, or the Terminal can't find it.

**How to fix it:**

1. Try typing `python3 main.py` instead of `python main.py`.
2. If that also fails, Python needs to be installed. Visit [python.org/downloads](https://python.org/downloads), download the latest version, and run the installer. Then try again.

---

### I see a long list of errors starting with "ModuleNotFoundError"

**What it looks like:**
```
ModuleNotFoundError: No module named 'fastapi'
```

**What it means:** The required background software (libraries) isn't installed yet.

**How to fix it:**

1. Open **Terminal**.
2. Navigate to the BodyBuilder folder:
   ```
   cd /path/to/bodyBuilder/backend
   ```
   (Replace `/path/to/bodyBuilder` with the actual location — right-click the `backend` folder, hold **Option**, and click "Copy as Pathname" to get the exact path.)
3. Run:
   ```
   pip install -r requirements.txt
   ```
4. Wait for it to finish, then start the app again.

---

### The Terminal window says "Application startup complete" but the browser shows nothing

**What it means:** The server is running but the browser isn't pointed at it yet.

**How to fix it:**

Open your browser and go to exactly this address:
```
http://localhost:8000
```

Make sure you're using `http://` (not `https://`) and the number `8000` at the end.

---

## The Browser / Interface

---

### The page looks outdated or is missing features I expect to see

**What it means:** Your browser is showing a cached (saved) old version of the app instead of the updated one.

**How to fix it:**

Press **Cmd + Shift + R** (hold all three keys at once) while the BodyBuilder tab is open. This forces the browser to reload everything fresh from the server.

---

### The Admin tab is completely blank

**What it means:** This was a bug in versions before v1.1.3. It is fixed in current versions.

**How to fix it:**

1. Press **Cmd + Shift + R** to force a fresh reload.
2. If the tab is still blank, stop the server (`Ctrl+C` in Terminal), then restart it and reload the browser.

---

### Everything looks fine but nothing responds when I click buttons

**What it means:** The background server has stopped running.

**How to fix it:**

1. Check the Terminal window — if the server crashed, you'll see an error message there.
2. Restart the server (double-click `bodybuilder.sh`, or in Terminal: `python main.py` from the `backend` folder).
3. Press **Cmd + Shift + R** in the browser.

---

## Athletes

---

### I open the app and there are no athletes / it says "No Athlete Selected"

**What it means:** No athlete profiles exist yet in the database, or the database file is new/empty.

**How to fix it:**

- To start fresh: click **Create Athlete** and fill in the form.
- To restore from a backup: click the **Admin** tab, then **Restore from Backup**, and select your `.bb` backup file.

---

### I deleted an athlete by accident

**What it means:** Athlete deletions are permanent — there is no undo. All workouts, meals, calendar entries, and settings for that athlete are gone.

**How to fix it:**

If you made a backup beforehand, go to **Admin → Restore from Backup** and select it. This will restore all athletes (and their data) from that backup. Note that any changes made *after* the backup was created will be lost.

If there is no backup, the data cannot be recovered. Going forward, use **Admin → Back Up Now** regularly.

---

## Backup & Restore

---

### "Backup file is corrupt — checksum does not match"

**What it means:** The app checks that a backup file hasn't been accidentally changed or damaged since it was created. This error means the check failed.

**Most common causes:**

- The backup was created with a version of BodyBuilder older than v1.1.4. These files can still be restored — the checksum check is skipped automatically for them.
- The `.bb` file was opened and re-saved by another app (such as a text editor), which can change invisible formatting.
- The file was corrupted during transfer (e.g. emailed, copied to a USB drive).

**How to fix it:**

1. Make sure you are running BodyBuilder **v1.1.4 or newer** (visible in the top-right corner of the app). If not, update first.
2. Press **Cmd + Shift + R** in the browser to make sure the app is fully up to date.
3. Create a **fresh backup** using **Admin → Back Up Now**, then try restoring that new file to confirm the feature is working.
4. If you're trying to restore an older `.bb` file and getting this error, try again after updating — v1.1.4 automatically skips the checksum check for legacy files.

---

### The restore appears to work but I don't see my data

**What it means:** The data was restored but the app is showing a stale/cached view.

**How to fix it:**

After a successful restore the app reloads automatically. If data still looks wrong:

1. Press **Cmd + Shift + R** to force a full browser reload.
2. Check the athlete switcher (top-right) — the restored athletes may be there but a different one is selected.

---

### I can't find the `.bb` backup file I saved

**What it means:** When you click "Back Up Now", the browser's save dialog opens. If you dismissed it or clicked Cancel by accident, no file was saved.

**How to fix it:**

1. Check your **Downloads** folder first — if you used the auto-download fallback (Safari), the file lands there automatically.
2. If it's not there, the save was cancelled. Go to **Admin → Back Up Now** and save it again — make a note of where you save it.

---

### "Incompatible file type — please select a .bb backup file"

**What it means:** You selected the wrong file. Only files ending in `.bb` are accepted.

**How to fix it:**

Look for the backup file you saved. It will have a name like `bb-backup-2026-05-06T14-30-00.bb`. Make sure you're not accidentally selecting a `.zip`, `.json`, or other file.

---

## Email & Sending Plans

---

### Sending the program by email fails / "SMTP error"

**What it means:** The email settings under **Admin → Email Settings** are incorrect, or your email provider is blocking the connection.

**How to fix it:**

1. Go to **Admin → Email Settings** and double-check the host, port, username, and password.
2. Common settings:
   - **Gmail:** host `smtp.gmail.com`, port `587`, TLS on. You must use an **App Password** (not your regular Gmail password) — generate one at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
   - **Outlook / Hotmail:** host `smtp-mail.outlook.com`, port `587`, TLS on.
3. Use the **Test Email** button to confirm settings work before sending a program.

---

## Data & Privacy

---

### Where is my data stored?

All data is stored locally on this Mac in:
```
~/Library/Application Support/BodyBuilder/
```
This folder contains your database (`bodybuilder.db`) and any cached exercise images. It is never deleted when you update the app. Nothing is sent to the internet — no cloud account is required.

---

### How do I move BodyBuilder to a new Mac?

1. On the old Mac, go to **Admin → Back Up Now** and save the `.bb` file.
2. Install BodyBuilder on the new Mac following the Install Guide.
3. On the new Mac, open the app, go to **Admin → Restore from Backup**, and select the `.bb` file.

All athletes, workouts, meal plans, and settings will be restored exactly as they were.

---

### How do I completely uninstall BodyBuilder?

1. Quit BodyBuilder if it is running.
2. Open **Finder → Applications** and drag **BodyBuilder** to the Trash.
3. To also remove your data, open **Terminal** and run:
   ```
   rm -rf ~/Library/Application\ Support/BodyBuilder
   ```
   > ⚠️ This permanently deletes all your athletes, workouts, and meal plans. Back up first via **Admin → Back Up Now** if you want to keep your data.

---

## Still stuck?

If your problem isn't covered here, the most useful information to share when asking for help is:

- The exact error message you see (a screenshot or copy-paste of the Terminal output)
- The version number shown in the top-right corner of the app
- What you were doing when the problem happened
