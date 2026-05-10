## v1.2.0 — May 10, 2026

### Workout UX, Athlete Units, Exercise Library & Plan Export

**`frontend/js/workout-tab.js`**
- Exercise dialog: rep range column removed from the sets table (header, input, and plan-view display)
- Exercise dialog: weight and reps columns now use `1fr` each so they expand to fill available width
- Exercise dialog: new sets now open fully expanded by default; existing sets also pre-expanded when editing
- Exercise dialog: added ✕ close button to dialog title bar
- Exercise dialog: cardio type changed from a single `<select>` to a multi-select chip UI — multiple activity types can be selected and are stored as a comma-separated string
- Exercise dialog: intensifiers textarea removed; set notes label changes to "SET NOTES / INTENSIFIER" when set type is I
- Exercise dialog: default tempo changed from blank to `3-1-0-1`; "Default Tempo" label renamed to "Tempo"
- Exercise dialog: exercise library expanded from ~90 to 250+ exercises across all muscle groups
- Exercise dialog: library picker replaced from a button grid to a grouped `<select>` dropdown with `<optgroup>` per muscle group, filterable by name and muscle group
- Workout plan view: rep range column removed from the sets table in the exercise list
- Workout plan view: tempo column now falls back to `3-1-0-1` instead of `—` when no per-set or exercise tempo is set
- Workout plan view: first plan now auto-expanded on load
- Workout plan view: added "Save Plan" Excel export button per plan, triggering `GET /api/athletes/{id}/workout-plans/{id}/export-xlsx`

**`frontend/js/athlete-tab.js`**
- `AthleteFormDialog` (create/edit): added Metric / Imperial units toggle in the dialog title bar
- Height field switches between a single cm input (metric) and paired ft + in inputs (imperial)
- Weight field label and value convert between kg and lbs based on selected units; stored internally as kg
- `units` included in save payload so the workout planner immediately uses the correct unit system

**`backend/main.py`**
- `WorkoutPlanModel`: added `warmup_instructions` field (max 2000 chars, validated) with schema migration (`ALTER TABLE` on startup if column absent)
- `WorkoutExerciseModel`: added `warmup_instructions` field (max 1000 chars); included in INSERT and UPDATE queries
- `WorkoutExerciseModel`: `cardio_type` max length raised from 100 to 500 chars to accommodate multi-select comma-joined strings
- Added `_build_workbook()` helper and `GET /api/athletes/{athlete_id}/workout-plans/{plan_id}/export-xlsx` endpoint — generates a formatted `.xlsx` file with plan metadata, warm-up instructions, and a session-by-session exercise breakdown including sets, reps, weight, RIR, tempo, and notes

**`VERSION`**
- Bumped `1.1.4` → `1.2.0`

---

## v1.1.4 — May 6, 2026

### Backup & Restore — Checksum fix

**`backend/main.py`**
- Removed server-side SHA-256 re-verification on `POST /api/restore`. The checksum is now verified entirely client-side in JavaScript before the request is sent, eliminating all Python/JS serialisation differences as a source of false failures.
- Updated `_checksum()` helper to use `ensure_ascii=False` so non-ASCII characters (accented names, special characters) are not escaped differently between Python and JavaScript.
- `GET /api/backup` now returns `"checksum": ""` as a placeholder; the real checksum is written by the browser before saving the file.

**`frontend/js/admin-tab.js`**
- Added `canonicalJSON()` — recursively serialises an object with alphabetically sorted keys and no extra whitespace, matching Python's `json.dumps(sort_keys=True, separators=(',',':'))`.
- Added `sha256hex()` — computes a SHA-256 hex digest using the browser's built-in Web Crypto API (`crypto.subtle`).
- `handleBackup`: after receiving data from the server, re-computes the checksum client-side from the JavaScript representation of the data and overwrites the server placeholder before writing the file. This means the stored checksum always matches what the browser actually wrote, regardless of Python float serialisation quirks.
- `handleRestore`: verifies the checksum client-side immediately after reading the file and before sending anything to the server. Files created before v1.1.4 (with an empty checksum field) are accepted without verification so that existing backups remain fully restorable.

**`frontend/index.html`**
- Cache-busting query strings bumped to `?v=15`.

**`VERSION`**
- Bumped `1.1.3` → `1.1.4`

---

## v1.1.3 — May 5, 2026

### Backup & Restore

**`backend/main.py`**
- Added `import hashlib` and `Request` to FastAPI imports
- Added `BACKUP_TABLES` constant — ordered list of all 15 application tables (parents before children)
- Added `GET /api/backup` endpoint — serialises all table rows to JSON, computes SHA256 checksum of the data section, returns `{format, app_version, created_at, checksum, data}`
- Added `POST /api/restore` endpoint — validates `format` field ("bodybuilder-backup"), recomputes and compares SHA256 checksum, clears all tables (FK constraints disabled during wipe), inserts rows back in schema order with column-whitelist guard against schema drift

**`frontend/js/admin-tab.js`**
- Added `BackupRestoreSection` component with:
  - **Back Up Now** button — calls `GET /api/backup`, uses `showSaveFilePicker()` (Chrome/Edge) with auto-download fallback for Safari; filename format `bb-backup-YYYY-MM-DDTHH-MM-SS.bb`
  - **Restore from Backup** button — hidden `<input type="file" accept=".bb">` triggered by a styled label; validates `.bb` extension, parses JSON, posts to `/api/restore`, reloads app on success
  - Warning banner reminding users that restore replaces all current data
  - Close (×) button in the card header — dismisses the panel in both the empty-state view and the normal admin view; dismissed panel is replaced by a small "Backup & Restore" button to reopen it
- `AdminTab` now renders `BackupRestoreSection` at the top of the normal admin view (dismissible)
- Added **empty-state screen**: when no athletes exist, the full tab is replaced with a centred empty-state message and `BackupRestoreSection` as the primary action, making it easy to restore into a fresh installation
- Fixed `catch {}` optional-catch-binding syntax → `catch (_e)` for Babel Standalone compatibility; the bare `catch {}` was silently preventing the entire script from loading, causing the Admin tab to render blank
- Fixed `AdminTab` rendering when `athleteId` is `null` — `loadMultipliers` effect is now guarded with `if (athleteId)` to prevent a spurious API call to `/athletes/null/activity-calories`

**`frontend/js/app.js`**
- Content area gate changed from `athleteId ? … : <EmptyState>` to `(athleteId || tab === "admin") ? … : <EmptyState>` so the Admin tab renders even when no athlete is selected
- Generic empty state now includes a **Restore Backup** shortcut button that switches directly to the Admin tab
- `key` prop on the content `<main>` uses `athleteId ?? "no-athlete"` so React correctly re-mounts when switching between the no-athlete and with-athlete states

**`frontend/js/icons.js`**
- Added `upload` and `alert-triangle` icons used by the backup/restore UI

**`frontend/index.html`**
- Cache-busting query strings bumped: `?v=6` → `?v=7` (backup feature), then `?v=8` (Babel fix), `?v=9` (close button), `?v=10` (final)

**`installer/INSTALL_GUIDE.md`**
- Bumped version header to 1.1.3
- Added note in Step 4 (Launch) about using the Admin tab to restore a backup on a fresh installation

**`VERSION`**
- Bumped `1.1.2` → `1.1.3`

---

## v1.1.2 — May 5, 2026

### Repository & Documentation

**`.gitignore`**
- Resolved merge conflict between HEAD (`.env` only) and `origin/main` (comprehensive Python template)
- Added `*.code-workspace`, `*.db`, `.DS_Store`, `backend/venv/`, and all standard Python tooling entries
- Added explicit `DOCKER-COMPLETE.code-workspace` entry

**`README.md`**
- Resolved merge conflict; rewrote the file to reflect the current v1.1.1 feature set
- Replaced the old Windows / `requirements.txt` install flow with the macOS installer approach
- Added feature table with tab icons matching the app, project structure tree, development quick-start, and data/privacy section
- Removed all personal references and local machine paths

**`installer/INSTALL_GUIDE.md`**
- Bumped version header to 1.1.2
- Added new **Step 1 — Download BodyBuilder to Your Mac** covering the full GitHub ZIP download flow for non-technical users: opening the repo page, finding the green Code button, downloading the ZIP, unzipping, and placing the folder in a permanent location
- Renumbered all subsequent steps (previously Steps 1–5 are now Steps 2–6)
- Updated the **Updating** section to include the re-download step as part of the upgrade flow
- Added three new troubleshooting entries: GitHub page navigation confusion, ZIP file not found after download, and the `-main` suffix on the unzipped folder name

**`bodybuilder.sh`**
- Removed hardcoded `/Volumes/CODE/bodyBuilder/backend` path
- Replaced with a self-resolving path relative to the script's own location — works correctly regardless of where the project folder is placed
- Removed emoji characters from output messages for terminal compatibility
- Added direct invocation support: `./bodybuilder.sh start|stop|restart|status|logs`

---

## v1.1.1 — May 5, 2026

### Security & Validation

**`backend/main.py`** — Comprehensive input validation hardening
- **Critical fix:** `WorkoutExerciseModel.sets_json` validator now correctly handles cardio sets. Previously any exercise saved with cardio mode would fail with a 422 error because the validator rejected cardio-specific keys (`cardio_type`, `duration_hours`, `duration_minutes`, `rpe`, `hr_min`, `hr_max`). Validator now branches on the presence of `cardio_type` and applies the appropriate allowed-key set and field-level range checks per branch.
- `AthleteModel`: added validators for `name` (max 100 chars, XSS pattern check), `workout_time` (must be AM or PM), and `workout_days` (each item must be a valid weekday name)
- `ProgramModel`: added ISO date format validation (`YYYY-MM-DD` or empty) for `start_date` and `end_date`
- `CalDayModel`: added `aerobic_type` (max 100 chars) and `workout_notes` (max 1000 chars) validators
- `EventModel`: added `date` required ISO format check, `description` max 1000 chars, `event_time` must match `HH:MM` pattern or be empty
- `SupplementModel`: added `dosage` max 80 chars validator
- `FoodModel`: added non-negative range validation for all nutrient fields (protein, carbs, fat, fiber, calories 0–9999; sodium, potassium 0–99999 mg), `serving_size` max 50 chars, `category` enum check, food name max 200 chars
- `MealPlanModel`: added range validation for all macro targets and actuals (macros 0–9999 g; minerals 0–99999 mg)
- `MealItemModel`: added validation for `food_name` (max 200 chars), `serving_size` (max 50 chars), `quantity` (0–9999), `weight_g` (0–99999 g), all nutrient fields non-negative
- `WorkoutPlanModel`: added `notes` max 2000 chars and ISO date validation for `start_date`/`end_date`
- `WorkoutSessionModel`: added `session_notes` max 2000 chars validator; `session_title` now returns `""` instead of `None`
- `FoodSwapModel`: `source_name`/`swap_name` now also checked for XSS injection patterns
- `WorkoutExerciseModel.image_url`: now accepts `/exercise-images/` local paths (served by the app's static file mount) in addition to `http://`/`https://` URLs
- Added `_valid_date_or_empty()` helper used across multiple models for consistent ISO date validation
- Added `_require_date_str()` helper used in calendar day endpoints to validate path parameter format before executing any DB query

**`frontend/js/validation.js`**
- `safeUrl` rule now also accepts `/exercise-images/` paths so locally-cached exercise images pass frontend validation

**`frontend/js/workout-tab.js`**
- `validateCardio()` now validates that total duration is greater than 0, that `hr_min` and `hr_max` are in range (0–300 bpm), and uses explicit null checks before comparing HR values

**`frontend/index.html`**
- Bumped all `?v=5` cache-busting query strings to `?v=6`

**`VERSION`**
- Bumped `1.1.0` → `1.1.1`

---

## v1.1.0 — May 5, 2026

### Backend

**`backend/main.py`**
- Added `exercise_images` table, `/exercise-images/` static file mount, and three new endpoints:
  - `GET /api/exercise-image?name=` — look up cached local image for an exercise
  - `POST /api/exercise-images/seed` — trigger background image fetch from Wikipedia
  - `GET /api/exercise-images/seed/status` — check seeding progress
- Added full CRUD for food swaps: `GET/POST/PUT/DELETE /api/athletes/{id}/food-swaps`
- Added `POST /api/workout-sessions/{id}/clone` to copy a session as a template
- Added `GET /api/athletes/{id}/workout-sessions/all` for the template picker
- Added rest day calorie target (`RMR × 1.0 − deficit`) to meal plan response
- Expanded `source_type` validator to accept all 7 food categories (protein, carb, fat, vegetable, fruit, dairy, supplement)

**`backend/seed_images.py`** *(new)*
- Standalone script that fetches exercise images from Wikipedia's REST API and caches them locally in `backend/exercise_images/`
- Run once with `python seed_images.py`; supports `--force` to re-download all images

---

### Frontend

**Workout Tab — `frontend/js/workout-tab.js`**
- Added Strength / Cardio toggle on the exercise dialog
  - Cardio mode shows: activity type dropdown (16 options), duration (hours + minutes), RPE selector (1–10, colour-coded with labels), heart rate range inputs with 5 zone presets (Z1 Recovery → Z5 Max)
  - Strength mode unchanged: sets, reps, weight, RIR, tempo, intensifiers
- Auto-fetch exercise images when picking from the library; displayed full-width with Change / Remove overlay; manual URL entry collapsed by default
- Added session template picker — load any saved session as a starting point when creating a new session
- Cardio exercises display a summary row (type badge, duration, RPE, HR zone) instead of a sets table

**Meal Plan Tab — `frontend/js/mealplan-tab.js`**
- Added calorie budget bar showing consumed vs daily target with over-budget warning banner
- Added 3-tile info banner: RMR / Training Day calories / Rest Day calories
- Redesigned macro targets table with auto-computed "From Meals" column sourced from food item entries
- Custom foods now auto-added to the food list on save and highlighted in the picker

**Food Swaps Tab — `frontend/js/foodswaps-tab.js`**
- Full rebuild with category filtering, swap pair UI, and inline editing

**App shell — `frontend/js/app.js`**
- Added light / dark mode toggle persisted to `localStorage`
- Theme applied via `data-theme` attribute on `<html>` driving CSS custom properties

**Styles — `frontend/css/style.css`**
- Added complete `[data-theme="light"]` variable block and direct surface overrides
- Added `.theme-toggle` button styles
- Added smooth `transition` on `body` for theme switching

**Icons — `frontend/js/icons.js`**
- Added: `sun`, `moon`, `activity`, `repeat`, `refresh_ccw`, `copy`, `leaf`, `droplet`, `zap`

**Other**
- Added SVG dumbbell favicon (`frontend/favicon.svg`)
- Added `<link>` favicon tags to `frontend/index.html`
- All JS and CSS files loaded with `?v=5` cache-busting query strings
