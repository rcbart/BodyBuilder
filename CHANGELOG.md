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
