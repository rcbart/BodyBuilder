#!/usr/bin/env python3
"""
seed_images.py — Fetch exercise images from Wikipedia's free REST API.

No API key needed. Uses the Wikipedia page-summary endpoint which returns
a ready-to-use thumbnail URL for each exercise page.

Usage:
    cd backend
    python seed_images.py           # skip already-cached images
    python seed_images.py --force   # re-download everything
"""

import json
import re
import sqlite3
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).parent
DB_PATH  = BASE_DIR / "bodybuilder.db"
IMG_DIR  = BASE_DIR / "exercise_images"
IMG_DIR.mkdir(exist_ok=True)

# ── Exercise → Wikipedia article title mapping ────────────────────────────────
# Use the exact Wikipedia article slug (underscores, case-sensitive first letter).
# Exercises that share a page use the same slug — that's fine.
WIKI_MAP = {
    # Chest
    "Barbell Bench Press":    "Bench_press",
    "Dumbbell Bench Press":   "Bench_press",
    "Incline Bench Press":    "Bench_press",
    "Decline Bench Press":    "Bench_press",
    "Push-Up":                "Push-up",
    "Cable Fly":              "Chest_fly",
    "Dumbbell Fly":           "Chest_fly",
    "Chest Dip":              "Dip_(exercise)",
    "Cable Crossover":        "Chest_fly",
    "Pec Deck":               "Chest_fly",
    # Back
    "Pull-Up":                "Pull-up_(exercise)",
    "Chin-Up":                "Chin-up",
    "Barbell Row":            "Bent-over_row",
    "Dumbbell Row":           "Bent-over_row",
    "Cable Row":              "Bent-over_row",
    "Lat Pulldown":           "Lat_pulldown",
    "T-Bar Row":              "Bent-over_row",
    "Face Pull":              "Bent-over_row",
    "Deadlift":               "Deadlift",
    "Rack Pull":              "Deadlift",
    # Shoulders
    "Barbell Overhead Press": "Overhead_press",
    "Dumbbell Overhead Press":"Overhead_press",
    "Lateral Raise":          "Lateral_raise",
    "Front Raise":            "Overhead_press",
    "Rear Delt Fly":          "Fly_(exercise)",
    "Cable Lateral Raise":    "Lateral_raise",
    "Upright Row":            "Upright_row",
    "Arnold Press":           "Arnold_press",
    "Shrug":                  "Shoulder_shrug",
    # Biceps
    "Barbell Curl":           "Bicep_curl",
    "Dumbbell Curl":          "Bicep_curl",
    "Hammer Curl":            "Hammer_curl",
    "Cable Curl":             "Bicep_curl",
    "Preacher Curl":          "Preacher_curl",
    "Incline Dumbbell Curl":  "Bicep_curl",
    "Concentration Curl":     "Concentration_curl",
    "Spider Curl":            "Bicep_curl",
    # Triceps
    "Close-Grip Bench Press": "Bench_press",
    "Tricep Pushdown":        "Pushdown_(exercise)",
    "Overhead Tricep Extension": "Triceps_extension",
    "Skull Crusher":          "Skull_crusher",
    "Dip":                    "Dip_(exercise)",
    "Cable Kickback":         "Triceps_extension",
    "Diamond Push-Up":        "Push-up",
    # Forearms
    "Wrist Curl":             "Wrist_curl",
    "Reverse Wrist Curl":     "Wrist_curl",
    "Farmer's Walk":          "Farmer_carry",
    "Pinch Grip Hold":        "Wrist_curl",
    # Quads
    "Barbell Squat":          "Squat_(exercise)",
    "Front Squat":            "Squat_(exercise)",
    "Leg Press":              "Leg_press",
    "Hack Squat":             "Hack_squat",
    "Bulgarian Split Squat":  "Bulgarian_split_squat",
    "Leg Extension":          "Leg_extension",
    "Lunge":                  "Lunge_(exercise)",
    "Step-Up":                "Squat_(exercise)",
    "Goblet Squat":           "Squat_(exercise)",
    # Hamstrings
    "Romanian Deadlift":      "Romanian_deadlift",
    "Leg Curl":               "Leg_curl",
    "Good Morning":           "Good-morning_(exercise)",
    "Glute-Ham Raise":        "Glute-ham_raise",
    "Nordic Hamstring Curl":  "Nordic_curl",
    "Stiff-Leg Deadlift":     "Romanian_deadlift",
    # Glutes
    "Hip Thrust":             "Hip_thrust",
    "Sumo Deadlift":          "Deadlift",
    "Glute Bridge":           "Glute_bridge",
    "Clamshell":              "Hip_thrust",
    "Abductor Machine":       "Leg_press",
    # Calves
    "Standing Calf Raise":    "Calf_raise",
    "Seated Calf Raise":      "Calf_raise",
    "Donkey Calf Raise":      "Calf_raise",
    "Single-Leg Calf Raise":  "Calf_raise",
    # Core
    "Plank":                  "Plank_(exercise)",
    "Cable Crunch":           "Crunch_(exercise)",
    "Hanging Leg Raise":      "Leg_raise",
    "Ab Rollout":             "Ab_wheel_rollout",
    "Side Plank":             "Plank_(exercise)",
    "Russian Twist":          "Russian_twist",
    "Crunch":                 "Crunch_(exercise)",
    "Sit-Up":                 "Sit-up",
    "Pallof Press":           "Plank_(exercise)",
    # Cardio
    "Treadmill Run":          "Treadmill",
    "Cycling":                "Cycling",
    "Rowing":                 "Rowing",
    "Jump Rope":              "Skipping_rope",
    "Stair Climber":          "Stair_climbing",
    "Sled Push":              "Sled_dog",
    "Battle Ropes":           "Battle_rope",
    # Full Body
    "Clean and Press":        "Clean_and_press",
    "Kettlebell Swing":       "Kettlebell",
    "Burpee":                 "Burpee_(exercise)",
    "Box Jump":               "Plyometrics",
    "Thruster":               "Overhead_press",
    "Turkish Get-Up":         "Turkish_get-up",
}

HEADERS = {
    "User-Agent": "BodyBuilderApp/1.0 (fitness tracker; contact: admin@example.com)",
    "Accept": "application/json",
}
TIMEOUT = 20
RETRIES = 3


# ─── HTTP helpers ─────────────────────────────────────────────────────────────

def fetch_json(url: str) -> dict:
    for attempt in range(1, RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                return json.loads(r.read())
        except Exception as exc:
            if attempt < RETRIES:
                print(f" (retry {attempt}: {exc})", end="", flush=True)
                time.sleep(attempt * 2)
            else:
                raise
    return {}


def download_bytes(url: str) -> bytes:
    for attempt in range(1, RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                return r.read()
        except Exception as exc:
            if attempt < RETRIES:
                time.sleep(attempt * 2)
            else:
                raise
    return b""


# ─── Wikipedia lookup ─────────────────────────────────────────────────────────

def wikipedia_thumbnail(wiki_title: str) -> str | None:
    """Return the thumbnail image URL for a Wikipedia article, or None."""
    url = (f"https://en.wikipedia.org/api/rest_v1/page/summary/"
           + urllib.parse.quote(wiki_title, safe=""))
    data = fetch_json(url)
    # Prefer 'originalimage' for better quality; fall back to 'thumbnail'
    img = data.get("originalimage") or data.get("thumbnail")
    return img.get("source") if img else None


# ─── Utilities ────────────────────────────────────────────────────────────────

def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    force = "--force" in sys.argv

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("""CREATE TABLE IF NOT EXISTS exercise_images (
        name TEXT PRIMARY KEY,
        image_path TEXT DEFAULT '',
        source TEXT DEFAULT 'wikipedia'
    )""")
    conn.commit()

    exercises = list(WIKI_MAP.items())
    total  = len(exercises)
    done   = 0
    errors = 0

    # Quick connectivity check
    print("Checking Wikipedia connectivity...", end=" ", flush=True)
    try:
        fetch_json("https://en.wikipedia.org/api/rest_v1/page/summary/Deadlift")
        print("OK\n")
    except Exception as exc:
        print(f"FAILED ({exc})")
        print("ERROR: Cannot reach Wikipedia. Check your internet connection.")
        sys.exit(1)

    print(f"Fetching images for {total} exercises...\n")

    # Deduplicate by wiki title so we only download each page once
    seen_titles: dict[str, str] = {}   # title -> local img_file

    for i, (name, wiki_title) in enumerate(exercises, 1):
        prefix = f"[{i:3}/{total}]"

        # Already cached?
        row = conn.execute(
            "SELECT image_path FROM exercise_images WHERE name=?", (name,)
        ).fetchone()
        already = row and row["image_path"] and (IMG_DIR / row["image_path"]).exists()
        if already and not force:
            print(f"{prefix} (cached)  {name}")
            done += 1
            continue

        slug      = slugify(name)
        img_file  = f"{slug}.jpg"
        save_path = IMG_DIR / img_file

        # Reuse already-downloaded file if same wiki page was fetched earlier
        if wiki_title in seen_titles and not force:
            src_file = seen_titles[wiki_title]
            src_path = IMG_DIR / src_file
            if src_path.exists():
                import shutil
                shutil.copy2(src_path, save_path)
                conn.execute(
                    "INSERT OR REPLACE INTO exercise_images (name, image_path, source)"
                    " VALUES (?, ?, 'wikipedia')",
                    (name, img_file)
                )
                conn.commit()
                print(f"{prefix} (reused)  {name}  [{wiki_title}]")
                done += 1
                continue

        print(f"{prefix} {name}  [{wiki_title}]...", end=" ", flush=True)

        try:
            img_url = wikipedia_thumbnail(wiki_title)
            if not img_url:
                print("no image")
                errors += 1
                time.sleep(0.3)
                continue

            data = download_bytes(img_url)
            if len(data) > 500:
                save_path.write_bytes(data)
                conn.execute(
                    "INSERT OR REPLACE INTO exercise_images (name, image_path, source)"
                    " VALUES (?, ?, 'wikipedia')",
                    (name, img_file)
                )
                conn.commit()
                seen_titles[wiki_title] = img_file
                kb = len(data) // 1024
                print(f"OK ({kb} KB)")
                done += 1
            else:
                print("SKIP (empty response)")
                errors += 1

        except Exception as exc:
            print(f"FAILED ({exc})")
            errors += 1

        time.sleep(0.3)

    conn.close()
    print(f"\n{'─'*45}")
    print(f"Done: {done} images saved, {errors} not found or failed")
    print(f"Images stored in: {IMG_DIR}")


if __name__ == "__main__":
    main()
