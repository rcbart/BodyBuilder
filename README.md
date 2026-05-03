# 💪 BodyBuilder — Installation Guide

Welcome! This guide will walk you through getting the BodyBuilder application running on your computer, step by step. No technical experience is required.

---

## What You'll Need

- A Mac or Windows computer
- An internet connection (only for the initial setup)
- About 10 minutes

---

## Step 1 — Install Python

Python is the programming language that powers the BodyBuilder backend. You only need to install it once.

### On a Mac

1. Open your **Terminal** app.
   - Click the magnifying glass (🔍) in the top-right corner of your screen
   - Type `Terminal` and press **Enter**
2. Type the following and press **Enter**:
   ```
   python3 --version
   ```
3. If you see something like `Python 3.11.x`, Python is already installed — skip to **Step 2**.
4. If you get an error, go to **https://www.python.org/downloads/** and click the big yellow **Download Python** button. Open the downloaded file and follow the installer.

### On Windows

1. Open your **Command Prompt**.
   - Press the **Windows key + R**, type `cmd`, and press **Enter**
2. Type the following and press **Enter**:
   ```
   python --version
   ```
3. If you see `Python 3.x.x`, Python is already installed — skip to **Step 2**.
4. If you get an error, go to **https://www.python.org/downloads/** and click the big yellow **Download Python** button.
   - **Important:** During installation, check the box that says **"Add Python to PATH"** before clicking Install.

---

## Step 2 — Install the App's Dependencies

The app needs a few extra software packages to run. This step downloads and installs them automatically.

### On a Mac

1. Open **Terminal** (if it's not already open).
2. Type the following command and press **Enter** *(copy and paste it exactly)*:
   ```
   cd ~/Desktop
   ```
3. Now navigate to the BodyBuilder folder. If you placed it on your Desktop, type:
   ```
   cd BodyBuilder/backend
   ```
   *(If the folder is somewhere else, adjust the path accordingly)*
4. Type the following and press **Enter**:
   ```
   pip3 install -r requirements.txt
   ```
5. Wait for the installation to finish. You'll see a lot of text scrolling — this is normal. It's done when you see your cursor again.

### On Windows

1. Open **Command Prompt**.
2. Navigate to the BodyBuilder backend folder:
   ```
   cd Desktop\BodyBuilder\backend
   ```
3. Run:
   ```
   pip install -r requirements.txt
   ```
4. Wait for the installation to finish.

---

## Step 3 — Start the Application

### On a Mac

1. In **Terminal**, navigate to the BodyBuilder folder:
   ```
   cd ~/Desktop/BodyBuilder
   ```
2. Run the start script:
   ```
   bash start.sh
   ```
3. You'll see something like:
   ```
   💪 BodyBuilder
   Backend API:  http://localhost:8000
   ```
   **Leave this window open** — closing it will stop the app.

### On Windows

1. In **Command Prompt**, navigate to the BodyBuilder folder:
   ```
   cd Desktop\BodyBuilder\backend
   ```
2. Run:
   ```
   python main.py
   ```
3. Leave the Command Prompt window open.

---

## Step 4 — Open the App in Your Browser

1. Open your web browser (Chrome, Safari, Firefox, or Edge).
2. In the address bar at the top, type:
   ```
   http://localhost:8000
   ```
   and press **Enter**.
3. The BodyBuilder app will open! 🎉

> **Alternatively**, you can double-click the file `frontend/index.html` to open it directly in your browser.

---

## Step 5 — Using the App

### Managing Athletes
- When you first open the app, click **"+ New Athlete"** to create your first athlete profile.
- You can manage multiple athletes by clicking the **athlete name** in the top header to switch between them, or open the **Manage Athletes** menu to add, edit, or remove athletes.
- All athlete data is saved automatically to a database on your computer and will be there every time you restart the app.

### Athlete Settings Tab
- Fill in the athlete's personal details: name, email, date of birth, height, weight, sex, and body fat %.
- The app automatically calculates the **Resting Metabolic Rate (RMR)** using three scientific equations and averages them.
- Set the athlete's **Activity Level** (1–5), **Phase** (Cut / Bulk / Maintain / Prep), and **Daily Caloric Deficit**.
- Click **Program Details** to set program start/end dates and payment status.
- Click **Daily Calories** to see the total calorie breakdown and customize calories for each activity level.
- Press **Save Settings** when done.

### Calendar Tab
- Click any day on the calendar to open the day detail panel.
- Record the athlete's **steps**, **aerobic exercise** type and duration, and **workout notes**.
- Add **events** (appointments, check-ins, etc.) with a time and description.
- Navigate between months, weeks, or years using the arrows at the top.
- Workout sessions from an active Workout Plan will appear automatically on the correct calendar days.

### Meal Plan Tab
- Enter **target** and **actual** values for each macro nutrient (protein, carbs, fat, fiber, sodium, potassium).
- The progress bars show how close actual intake is to the target.
- The header shows the athlete's RMR and daily calorie target.

### Nutrition Plan Tab
- Build a food database for the athlete.
- Click **+ Add Food** to enter a food item with its full nutritional breakdown.
- Search or filter by category to find existing foods.
- Edit or delete foods using the pencil and trash icons.

### Workout Plan Tab
- Click **+ New Plan** to create a workout plan for the athlete.
- Set the plan **title**, **start date**, **end date**, and any plan-level notes.
- Once created, click the plan to expand it and add **workout sessions** by day of the week.
- Each session can target specific muscle groups and include notes.
- Within each session, add **exercises** with sets, reps, and weights.
- Each set can be marked as **Warm Up**, **Main**, or **Drop Set**.

### Administration Tab
- **Email Setup**: Enter your SMTP server details to enable email sending.
  - For Gmail, use `smtp.gmail.com` on port `587` with your Gmail address.
  - You must use a **Gmail App Password** (not your regular password). Create one at: `myaccount.google.com/apppasswords`
- **Send Program**: Send the athlete's complete program as an Excel file to their email address.
- **Export to Excel**: Click **Download Excel** to save a `.xlsx` file locally. This file can be opened in Google Sheets by going to **File → Import** in Google Sheets and uploading the file.

### Version Management
- Click the version number (e.g., `v1.0.0`) in the top-right corner to set a new version number before committing a change to the program.

---

## Stopping the App

- Go back to the Terminal / Command Prompt window where the app is running.
- Press **Ctrl + C** to stop it.
- Your data is saved automatically and will be there next time you start the app.

---

## Troubleshooting

**"Port 8000 already in use"**
- The app is already running in another window, or something else is using that port.
- Close other Terminal windows and try again, or restart your computer.

**"Module not found" error**
- Go back to Step 2 and run the `pip install -r requirements.txt` command again.

**The page shows an error or won't load**
- Make sure the Terminal / Command Prompt window is still open and running.
- Try refreshing the browser page (press **F5** or **Cmd+R**).

**Email won't send**
- Double-check your SMTP settings in the Administration tab.
- For Gmail, make sure you're using an App Password, not your regular password.
- Make sure your internet connection is active.

---

## Your Data

All data (athletes, workouts, meal plans, calendar entries, etc.) is stored in a file called `bodybuilder.db` inside the `backend` folder. This file is automatically created the first time you run the app.

- **To back up your data**: copy the `bodybuilder.db` file somewhere safe.
- **To restore a backup**: replace the `bodybuilder.db` file with your backup copy (while the app is not running).

---

*BodyBuilder — built for coaches who care.*
