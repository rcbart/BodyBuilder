"""
BodyBuilder API — FastAPI + SQLite backend
Multi-athlete support, workout plans, meal plans, calendar, xlsx export, email
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, field_validator
from typing import Optional, List
import sqlite3
import json
import io
import os
import smtplib
import tempfile
from pathlib import Path
from datetime import date, datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

app = FastAPI(title="BodyBuilder API")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent
DB_PATH = str(BASE_DIR / "bodybuilder.db")
FRONTEND_DIR = BASE_DIR.parent / "frontend"


# ─── DB Helpers ───────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _col_exists(conn, table, col):
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(r["name"] == col for r in rows)


def _table_exists(conn, table):
    r = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone()
    return r is not None


def init_db():
    conn = get_db()
    c = conn.cursor()

    # ── version ──
    c.execute("""CREATE TABLE IF NOT EXISTS version (
        id INTEGER PRIMARY KEY DEFAULT 1,
        major INTEGER DEFAULT 1, minor INTEGER DEFAULT 0, tiny INTEGER DEFAULT 0, notes TEXT DEFAULT ''
    )""")
    c.execute("INSERT OR IGNORE INTO version (id) VALUES (1)")

    # ── athletes (multi-athlete) ──
    c.execute("""CREATE TABLE IF NOT EXISTS athletes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT DEFAULT '',
        email TEXT DEFAULT '',
        birthdate TEXT DEFAULT '',
        height_cm REAL DEFAULT 175,
        weight_kg REAL DEFAULT 75,
        body_fat_pct REAL DEFAULT 0,
        sex TEXT DEFAULT 'male',
        activity_level INTEGER DEFAULT 1,
        workout_days_per_week INTEGER DEFAULT 3,
        workout_days TEXT DEFAULT '[]',
        workout_time TEXT DEFAULT 'AM',
        phase TEXT DEFAULT 'maintain',
        deficit REAL DEFAULT 0
    )""")

    # ── Migrate old single-athlete table if present ──
    if _table_exists(conn, "athlete") and conn.execute("SELECT COUNT(*) FROM athletes").fetchone()[0] == 0:
        old = conn.execute("SELECT * FROM athlete WHERE id=1").fetchone()
        if old:
            d = dict(old)
            c.execute("""INSERT INTO athletes (id, name, email, birthdate, height_cm, weight_kg, body_fat_pct,
                sex, activity_level, workout_days_per_week, workout_days, workout_time, phase, deficit)
                VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (d.get("name",""), d.get("email",""), d.get("birthdate",""), d.get("height_cm",175),
                 d.get("weight_kg",75), d.get("body_fat_pct",0), d.get("sex","male"),
                 d.get("activity_level",1), d.get("workout_days_per_week",3), d.get("workout_days","[]"),
                 d.get("workout_time","AM"), d.get("phase","maintain"), d.get("deficit",0)))

    # ── programs ──
    c.execute("""CREATE TABLE IF NOT EXISTS programs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        athlete_id INTEGER NOT NULL DEFAULT 1,
        start_date TEXT DEFAULT '',
        end_date TEXT DEFAULT '',
        payment_processed INTEGER DEFAULT 0,
        FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
    )""")
    # Migrate old program table
    if _table_exists(conn, "program") and conn.execute("SELECT COUNT(*) FROM programs").fetchone()[0] == 0:
        old = conn.execute("SELECT * FROM program WHERE id=1").fetchone()
        if old:
            d = dict(old)
            c.execute("INSERT INTO programs (athlete_id, start_date, end_date, payment_processed) VALUES (1,?,?,?)",
                      (d.get("start_date",""), d.get("end_date",""), d.get("payment_processed",0)))

    # ── activity_calories ──
    c.execute("""CREATE TABLE IF NOT EXISTS activity_calories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        athlete_id INTEGER NOT NULL DEFAULT 1,
        level INTEGER NOT NULL,
        additional_calories REAL DEFAULT 0,
        UNIQUE(athlete_id, level),
        FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
    )""")
    # Will be populated per-athlete on first access

    # ── calendar_days ──
    c.execute("""CREATE TABLE IF NOT EXISTS calendar_days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        athlete_id INTEGER NOT NULL DEFAULT 1,
        date TEXT NOT NULL,
        steps INTEGER DEFAULT 0,
        aerobic_type TEXT DEFAULT '',
        aerobic_duration INTEGER DEFAULT 0,
        workout_notes TEXT DEFAULT '',
        UNIQUE(athlete_id, date),
        FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
    )""")
    # Migrate old calendar_days (no athlete_id)
    if _table_exists(conn, "calendar_days") and not _col_exists(conn, "calendar_days", "athlete_id"):
        pass  # old table is pre-migration; new table is created above with new name logic
    # (Since we create a new table with UNIQUE constraint, old data stays in old table)

    # ── calendar_events ──
    c.execute("""CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        athlete_id INTEGER NOT NULL DEFAULT 1,
        date TEXT NOT NULL,
        title TEXT DEFAULT '',
        description TEXT DEFAULT '',
        event_time TEXT DEFAULT '',
        FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
    )""")

    # ── meal_plans ──
    c.execute("""CREATE TABLE IF NOT EXISTS meal_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        athlete_id INTEGER NOT NULL DEFAULT 1 UNIQUE,
        protein_target REAL DEFAULT 150, carbs_target REAL DEFAULT 200,
        fat_target REAL DEFAULT 65, fiber_target REAL DEFAULT 25,
        sodium_target REAL DEFAULT 2300, potassium_target REAL DEFAULT 3500,
        protein_actual REAL DEFAULT 0, carbs_actual REAL DEFAULT 0,
        fat_actual REAL DEFAULT 0, fiber_actual REAL DEFAULT 0,
        sodium_actual REAL DEFAULT 0, potassium_actual REAL DEFAULT 0,
        FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
    )""")

    # ── nutrition_foods ──
    c.execute("""CREATE TABLE IF NOT EXISTS nutrition_foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        athlete_id INTEGER NOT NULL DEFAULT 1,
        name TEXT DEFAULT '', protein REAL DEFAULT 0, carbs REAL DEFAULT 0,
        fat REAL DEFAULT 0, fiber REAL DEFAULT 0, sodium REAL DEFAULT 0,
        potassium REAL DEFAULT 0, calories REAL DEFAULT 0,
        serving_size TEXT DEFAULT '100g', category TEXT DEFAULT 'general',
        FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
    )""")

    # ── workout_plans ──
    c.execute("""CREATE TABLE IF NOT EXISTS workout_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        athlete_id INTEGER NOT NULL DEFAULT 1,
        title TEXT DEFAULT '',
        start_date TEXT DEFAULT '',
        end_date TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
    )""")

    # ── workout_sessions (one per day-of-week within a plan) ──
    c.execute("""CREATE TABLE IF NOT EXISTS workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER NOT NULL,
        day_of_week TEXT DEFAULT 'Monday',
        session_title TEXT DEFAULT '',
        muscle_groups TEXT DEFAULT '[]',
        session_notes TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
    )""")

    # ── workout_exercises ──
    c.execute("""CREATE TABLE IF NOT EXISTS workout_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        name TEXT DEFAULT '',
        set_type TEXT DEFAULT 'main',
        sets_json TEXT DEFAULT '[]',
        exercise_notes TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
    )""")

    # ── smtp_settings ──
    c.execute("""CREATE TABLE IF NOT EXISTS smtp_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        host TEXT DEFAULT 'smtp.gmail.com', port INTEGER DEFAULT 587,
        username TEXT DEFAULT '', password TEXT DEFAULT '',
        from_name TEXT DEFAULT 'BodyBuilder Coach', use_tls INTEGER DEFAULT 1
    )""")
    c.execute("INSERT OR IGNORE INTO smtp_settings (id) VALUES (1)")

    conn.commit()
    conn.close()


def ensure_athlete_defaults(athlete_id: int):
    """Ensure activity_calories and meal_plan rows exist for this athlete."""
    conn = get_db()
    for level, cal in [(1,200),(2,400),(3,600),(4,800),(5,1000)]:
        conn.execute("INSERT OR IGNORE INTO activity_calories (athlete_id, level, additional_calories) VALUES (?,?,?)",
                     (athlete_id, level, cal))
    conn.execute("INSERT OR IGNORE INTO meal_plans (athlete_id) VALUES (?)", (athlete_id,))
    conn.commit()
    conn.close()


init_db()


# ─── RMR Calculations ─────────────────────────────────────────────────────────

def compute_age(birthdate: str) -> int:
    if not birthdate:
        return 30
    try:
        y, m, d = birthdate.split("-")
        bd = date(int(y), int(m), int(d))
        today = date.today()
        return today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
    except Exception:
        return 30


def calculate_rmr(weight_kg, height_cm, birthdate, sex, body_fat_pct):
    age = compute_age(birthdate)
    wk = max(float(weight_kg or 1), 1)
    hc = max(float(height_cm or 1), 1)
    s = (sex or "male").lower()
    mifflin = (10*wk)+(6.25*hc)-(5*age)+(5 if s=="male" else -161)
    harris = (88.362+(13.397*wk)+(4.799*hc)-(5.677*age)) if s=="male" else (447.593+(9.247*wk)+(3.098*hc)-(4.330*age))
    bf = float(body_fat_pct or 0)
    lbm = wk*(1-bf/100) if bf>0 else ((0.407*wk+0.267*hc-19.2) if s=="male" else (0.252*wk+0.473*hc-48.3))
    katch = 370+(21.6*lbm)
    avg = (mifflin+harris+katch)/3
    return {"mifflin":round(mifflin,1),"harris":round(harris,1),"katch":round(katch,1),
            "average":round(avg,1),"age":age,"lbm_kg":round(lbm,1)}


def athlete_row_to_dict(row):
    d = dict(row)
    d["workout_days"] = json.loads(d.get("workout_days") or "[]")
    rmr = calculate_rmr(d["weight_kg"], d["height_cm"], d["birthdate"], d["sex"], d["body_fat_pct"])
    d.update(rmr)
    return d


def next_weekday_on_or_after(start: date, day_name: str) -> date:
    """Return the first date >= start that falls on the given day_name (e.g. 'Monday')."""
    days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    target_dow = days.index(day_name) if day_name in days else 0
    current_dow = start.weekday()  # 0=Monday
    delta = (target_dow - current_dow) % 7
    return start + timedelta(days=delta)


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class AthleteModel(BaseModel):
    name: Optional[str] = ""
    email: Optional[str] = ""
    birthdate: Optional[str] = ""
    height_cm: Optional[float] = 175
    weight_kg: Optional[float] = 75
    body_fat_pct: Optional[float] = 0
    sex: Optional[str] = "male"
    activity_level: Optional[int] = 1
    workout_days_per_week: Optional[int] = 3
    workout_days: Optional[List[str]] = []
    workout_time: Optional[str] = "AM"
    phase: Optional[str] = "maintain"
    deficit: Optional[float] = 0

    @field_validator("email")
    @classmethod
    def email_v(cls, v):
        if v and len(v) > 0 and "@" not in v: raise ValueError("Invalid email")
        if v and len(v) > 200: raise ValueError("Email too long")
        return v
    @field_validator("height_cm")
    @classmethod
    def height_v(cls, v):
        if v is not None and (v<50 or v>300): raise ValueError("Height must be 50–300 cm")
        return v
    @field_validator("weight_kg")
    @classmethod
    def weight_v(cls, v):
        if v is not None and (v<10 or v>500): raise ValueError("Weight must be 10–500 kg")
        return v
    @field_validator("body_fat_pct")
    @classmethod
    def bf_v(cls, v):
        if v is not None and (v<0 or v>70): raise ValueError("Body fat 0–70%")
        return v
    @field_validator("activity_level")
    @classmethod
    def al_v(cls, v):
        if v is not None and (v<1 or v>5): raise ValueError("Activity level 1–5")
        return v
    @field_validator("workout_days_per_week")
    @classmethod
    def wd_v(cls, v):
        if v is not None and (v<0 or v>7): raise ValueError("0–7 days")
        return v
    @field_validator("sex")
    @classmethod
    def sex_v(cls, v):
        if v not in ("male","female"): raise ValueError("male or female")
        return v
    @field_validator("phase")
    @classmethod
    def phase_v(cls, v):
        if v not in ("cut","bulk","maintain","prep"): raise ValueError("cut/bulk/maintain/prep")
        return v
    @field_validator("deficit")
    @classmethod
    def def_v(cls, v):
        if v is not None and (v<0 or v>2000): raise ValueError("0–2000 kcal")
        return v


class ProgramModel(BaseModel):
    start_date: Optional[str] = ""
    end_date: Optional[str] = ""
    payment_processed: Optional[bool] = False


class ActivityCalModel(BaseModel):
    additional_calories: float
    @field_validator("additional_calories")
    @classmethod
    def cal_v(cls, v):
        if v<0 or v>5000: raise ValueError("0–5000")
        return v


class CalDayModel(BaseModel):
    steps: Optional[int] = 0
    aerobic_type: Optional[str] = ""
    aerobic_duration: Optional[int] = 0
    workout_notes: Optional[str] = ""
    @field_validator("steps")
    @classmethod
    def steps_v(cls, v):
        if v is not None and (v<0 or v>100000): raise ValueError("0–100,000")
        return v
    @field_validator("aerobic_duration")
    @classmethod
    def dur_v(cls, v):
        if v is not None and (v<0 or v>600): raise ValueError("0–600 min")
        return v


class EventModel(BaseModel):
    date: str
    title: Optional[str] = ""
    description: Optional[str] = ""
    event_time: Optional[str] = ""
    @field_validator("title")
    @classmethod
    def title_v(cls, v):
        if not v or not v.strip(): raise ValueError("Title required")
        if len(v)>100: raise ValueError("Max 100 chars")
        return v.strip()


class MealPlanModel(BaseModel):
    protein_target: Optional[float] = 150
    carbs_target: Optional[float] = 200
    fat_target: Optional[float] = 65
    fiber_target: Optional[float] = 25
    sodium_target: Optional[float] = 2300
    potassium_target: Optional[float] = 3500
    protein_actual: Optional[float] = 0
    carbs_actual: Optional[float] = 0
    fat_actual: Optional[float] = 0
    fiber_actual: Optional[float] = 0
    sodium_actual: Optional[float] = 0
    potassium_actual: Optional[float] = 0


class FoodModel(BaseModel):
    name: str
    protein: Optional[float] = 0
    carbs: Optional[float] = 0
    fat: Optional[float] = 0
    fiber: Optional[float] = 0
    sodium: Optional[float] = 0
    potassium: Optional[float] = 0
    calories: Optional[float] = 0
    serving_size: Optional[str] = "100g"
    category: Optional[str] = "general"
    @field_validator("name")
    @classmethod
    def name_v(cls, v):
        if not v or not v.strip(): raise ValueError("Name required")
        return v.strip()


class VersionModel(BaseModel):
    major: int
    minor: int
    tiny: int
    notes: Optional[str] = ""
    @field_validator("major","minor","tiny")
    @classmethod
    def ver_v(cls, v):
        if v<0 or v>999: raise ValueError("0–999")
        return v


class SmtpModel(BaseModel):
    host: Optional[str] = "smtp.gmail.com"
    port: Optional[int] = 587
    username: Optional[str] = ""
    password: Optional[str] = ""
    from_name: Optional[str] = "BodyBuilder Coach"
    use_tls: Optional[bool] = True
    @field_validator("port")
    @classmethod
    def port_v(cls, v):
        if v is not None and (v<1 or v>65535): raise ValueError("1–65535")
        return v
    @field_validator("host")
    @classmethod
    def host_v(cls, v):
        if not v or not v.strip(): raise ValueError("Host required")
        return v.strip()


class SendProgramModel(BaseModel):
    athlete_id: int
    to_email: Optional[str] = ""
    subject: Optional[str] = "Your BodyBuilder Program"
    message: Optional[str] = ""
    @field_validator("to_email")
    @classmethod
    def email_v(cls, v):
        if not v or "@" not in v: raise ValueError("Valid email required")
        return v.strip()
    @field_validator("subject")
    @classmethod
    def subj_v(cls, v):
        if not v or not v.strip(): raise ValueError("Subject required")
        if len(v)>200: raise ValueError("Max 200 chars")
        return v.strip()


class WorkoutPlanModel(BaseModel):
    athlete_id: int
    title: str
    start_date: Optional[str] = ""
    end_date: Optional[str] = ""
    notes: Optional[str] = ""
    sort_order: Optional[int] = 0
    @field_validator("title")
    @classmethod
    def title_v(cls, v):
        if not v or not v.strip(): raise ValueError("Title required")
        if len(v)>100: raise ValueError("Max 100 chars")
        return v.strip()


class WorkoutSessionModel(BaseModel):
    plan_id: int
    day_of_week: str
    session_title: Optional[str] = ""
    muscle_groups: Optional[List[str]] = []
    session_notes: Optional[str] = ""
    sort_order: Optional[int] = 0
    @field_validator("day_of_week")
    @classmethod
    def dow_v(cls, v):
        valid = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
        if v not in valid: raise ValueError(f"Must be one of: {', '.join(valid)}")
        return v
    @field_validator("session_title")
    @classmethod
    def title_v(cls, v):
        if v and len(v)>100: raise ValueError("Max 100 chars")
        return v


class WorkoutExerciseModel(BaseModel):
    session_id: int
    name: str
    set_type: Optional[str] = "main"
    sets_json: Optional[List[dict]] = []
    exercise_notes: Optional[str] = ""
    sort_order: Optional[int] = 0
    @field_validator("name")
    @classmethod
    def name_v(cls, v):
        if not v or not v.strip(): raise ValueError("Exercise name required")
        if len(v)>100: raise ValueError("Max 100 chars")
        return v.strip()
    @field_validator("set_type")
    @classmethod
    def type_v(cls, v):
        if v not in ("warm_up","main","drop_set"): raise ValueError("warm_up/main/drop_set")
        return v


# ─── Version ──────────────────────────────────────────────────────────────────

@app.get("/api/version")
def get_version():
    conn = get_db()
    row = conn.execute("SELECT * FROM version WHERE id=1").fetchone()
    conn.close()
    return dict(row) if row else {"major":1,"minor":0,"tiny":0,"notes":""}

@app.put("/api/version")
def update_version(body: VersionModel):
    conn = get_db()
    conn.execute("UPDATE version SET major=?,minor=?,tiny=?,notes=? WHERE id=1",
                 (body.major,body.minor,body.tiny,body.notes))
    conn.commit(); conn.close()
    return get_version()


# ─── Athletes ─────────────────────────────────────────────────────────────────

@app.get("/api/athletes")
def list_athletes():
    conn = get_db()
    rows = conn.execute("SELECT * FROM athletes ORDER BY name").fetchall()
    conn.close()
    return [athlete_row_to_dict(r) for r in rows]

@app.post("/api/athletes")
def create_athlete(body: AthleteModel):
    conn = get_db()
    cur = conn.execute("""INSERT INTO athletes
        (name,email,birthdate,height_cm,weight_kg,body_fat_pct,sex,activity_level,
         workout_days_per_week,workout_days,workout_time,phase,deficit)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (body.name,body.email,body.birthdate,body.height_cm,body.weight_kg,body.body_fat_pct,
         body.sex,body.activity_level,body.workout_days_per_week,json.dumps(body.workout_days),
         body.workout_time,body.phase,body.deficit))
    new_id = cur.lastrowid
    conn.commit(); conn.close()
    ensure_athlete_defaults(new_id)
    return get_athlete(new_id)

@app.get("/api/athletes/{athlete_id}")
def get_athlete(athlete_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM athletes WHERE id=?", (athlete_id,)).fetchone()
    conn.close()
    if not row: raise HTTPException(404, "Athlete not found")
    return athlete_row_to_dict(row)

@app.put("/api/athletes/{athlete_id}")
def update_athlete(athlete_id: int, body: AthleteModel):
    conn = get_db()
    if not conn.execute("SELECT id FROM athletes WHERE id=?", (athlete_id,)).fetchone():
        conn.close(); raise HTTPException(404)
    conn.execute("""UPDATE athletes SET name=?,email=?,birthdate=?,height_cm=?,weight_kg=?,
        body_fat_pct=?,sex=?,activity_level=?,workout_days_per_week=?,workout_days=?,
        workout_time=?,phase=?,deficit=? WHERE id=?""",
        (body.name,body.email,body.birthdate,body.height_cm,body.weight_kg,body.body_fat_pct,
         body.sex,body.activity_level,body.workout_days_per_week,json.dumps(body.workout_days),
         body.workout_time,body.phase,body.deficit,athlete_id))
    conn.commit(); conn.close()
    return get_athlete(athlete_id)

@app.delete("/api/athletes/{athlete_id}")
def delete_athlete(athlete_id: int):
    conn = get_db()
    conn.execute("DELETE FROM athletes WHERE id=?", (athlete_id,))
    conn.commit(); conn.close()
    return {"deleted": athlete_id}


# ─── Program ──────────────────────────────────────────────────────────────────

@app.get("/api/athletes/{athlete_id}/program")
def get_program(athlete_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM programs WHERE athlete_id=?", (athlete_id,)).fetchone()
    conn.close()
    if not row:
        return {"athlete_id":athlete_id,"start_date":"","end_date":"","payment_processed":False}
    d = dict(row); d["payment_processed"] = bool(d["payment_processed"])
    return d

@app.put("/api/athletes/{athlete_id}/program")
def update_program(athlete_id: int, body: ProgramModel):
    conn = get_db()
    existing = conn.execute("SELECT id FROM programs WHERE athlete_id=?", (athlete_id,)).fetchone()
    if existing:
        conn.execute("UPDATE programs SET start_date=?,end_date=?,payment_processed=? WHERE athlete_id=?",
                     (body.start_date,body.end_date,int(body.payment_processed),athlete_id))
    else:
        conn.execute("INSERT INTO programs (athlete_id,start_date,end_date,payment_processed) VALUES (?,?,?,?)",
                     (athlete_id,body.start_date,body.end_date,int(body.payment_processed)))
    conn.commit(); conn.close()
    return get_program(athlete_id)


# ─── Activity Calories ────────────────────────────────────────────────────────

@app.get("/api/athletes/{athlete_id}/activity-calories")
def get_activity_calories(athlete_id: int):
    ensure_athlete_defaults(athlete_id)
    conn = get_db()
    rows = conn.execute("SELECT * FROM activity_calories WHERE athlete_id=? ORDER BY level", (athlete_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.put("/api/athletes/{athlete_id}/activity-calories/{level}")
def update_activity_calories(athlete_id: int, level: int, body: ActivityCalModel):
    if level<1 or level>5: raise HTTPException(400, "Level 1–5")
    conn = get_db()
    conn.execute("INSERT INTO activity_calories (athlete_id,level,additional_calories) VALUES (?,?,?) ON CONFLICT(athlete_id,level) DO UPDATE SET additional_calories=excluded.additional_calories",
                 (athlete_id,level,body.additional_calories))
    conn.commit(); conn.close()
    return get_activity_calories(athlete_id)

@app.get("/api/athletes/{athlete_id}/daily-calories")
def get_daily_calories(athlete_id: int):
    ath = get_athlete(athlete_id)
    rmr = ath["average"]
    level = ath["activity_level"]
    deficit = ath["deficit"]
    conn = get_db()
    ac = conn.execute("SELECT additional_calories FROM activity_calories WHERE athlete_id=? AND level=?",
                      (athlete_id,level)).fetchone()
    conn.close()
    additional = ac["additional_calories"] if ac else 0
    total = max(0, rmr+additional-deficit)
    return {"rmr":round(rmr,1),"activity_level":level,"additional_calories":round(additional,1),
            "deficit":round(deficit,1),"total_calories":round(total,1),"phase":ath["phase"],"name":ath["name"]}


# ─── Calendar ─────────────────────────────────────────────────────────────────

def _get_plan_sessions_for_month(athlete_id: int, year: int, month: int, conn):
    """Return dict of date→[session summaries] for all active plans in this month."""
    first = date(year, month, 1)
    last_day = (date(year, month+1, 1) - timedelta(days=1)) if month < 12 else date(year, 12, 31)
    plans = conn.execute("""SELECT * FROM workout_plans WHERE athlete_id=?
        AND (start_date='' OR start_date <= ?)
        AND (end_date='' OR end_date >= ?)""",
        (athlete_id, str(last_day), str(first))).fetchall()
    result = {}
    for plan in plans:
        p = dict(plan)
        p_start = date.fromisoformat(p["start_date"]) if p["start_date"] else first
        p_end = date.fromisoformat(p["end_date"]) if p["end_date"] else last_day
        sessions = conn.execute("SELECT * FROM workout_sessions WHERE plan_id=?", (p["id"],)).fetchall()
        for sess in sessions:
            s = dict(sess)
            first_occ = next_weekday_on_or_after(max(p_start, first), s["day_of_week"])
            cur = first_occ
            while cur <= min(p_end, last_day):
                ds = str(cur)
                if ds not in result: result[ds] = []
                result[ds].append({"plan_title": p["title"], "session_title": s["session_title"],
                                   "muscle_groups": json.loads(s.get("muscle_groups") or "[]"),
                                   "session_id": s["id"], "plan_id": p["id"]})
                cur += timedelta(days=7)
    return result

@app.get("/api/athletes/{athlete_id}/calendar/month")
def get_calendar_month(athlete_id: int, year: int, month: int):
    if year<1900 or year>2200: raise HTTPException(400, "Invalid year")
    if month<1 or month>12: raise HTTPException(400, "Invalid month")
    conn = get_db()
    prefix = f"{year:04d}-{month:02d}"
    days = conn.execute("SELECT * FROM calendar_days WHERE athlete_id=? AND date LIKE ?",
                        (athlete_id, f"{prefix}%")).fetchall()
    events = conn.execute("SELECT * FROM calendar_events WHERE athlete_id=? AND date LIKE ? ORDER BY event_time",
                          (athlete_id, f"{prefix}%")).fetchall()
    plan_sessions = _get_plan_sessions_for_month(athlete_id, year, month, conn)
    conn.close()
    return {"days":{r["date"]:dict(r) for r in days},
            "events":[dict(e) for e in events],
            "plan_sessions": plan_sessions}

@app.get("/api/athletes/{athlete_id}/calendar/day/{date_str}")
def get_calendar_day(athlete_id: int, date_str: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM calendar_days WHERE athlete_id=? AND date=?",
                       (athlete_id, date_str)).fetchone()
    events = conn.execute("SELECT * FROM calendar_events WHERE athlete_id=? AND date=? ORDER BY event_time",
                          (athlete_id, date_str)).fetchall()
    conn.close()
    day = dict(row) if row else {"athlete_id":athlete_id,"date":date_str,"steps":0,
                                  "aerobic_type":"","aerobic_duration":0,"workout_notes":""}
    return {"day":day,"events":[dict(e) for e in events]}

@app.put("/api/athletes/{athlete_id}/calendar/day/{date_str}")
def update_calendar_day(athlete_id: int, date_str: str, body: CalDayModel):
    conn = get_db()
    conn.execute("""INSERT INTO calendar_days (athlete_id,date,steps,aerobic_type,aerobic_duration,workout_notes)
        VALUES (?,?,?,?,?,?)
        ON CONFLICT(athlete_id,date) DO UPDATE SET steps=excluded.steps,
        aerobic_type=excluded.aerobic_type,aerobic_duration=excluded.aerobic_duration,
        workout_notes=excluded.workout_notes""",
        (athlete_id,date_str,body.steps,body.aerobic_type,body.aerobic_duration,body.workout_notes))
    conn.commit(); conn.close()
    return get_calendar_day(athlete_id, date_str)

@app.post("/api/athletes/{athlete_id}/calendar/events")
def create_event(athlete_id: int, body: EventModel):
    conn = get_db()
    cur = conn.execute("INSERT INTO calendar_events (athlete_id,date,title,description,event_time) VALUES (?,?,?,?,?)",
                       (athlete_id,body.date,body.title,body.description,body.event_time))
    eid = cur.lastrowid; conn.commit()
    row = conn.execute("SELECT * FROM calendar_events WHERE id=?", (eid,)).fetchone()
    conn.close(); return dict(row)

@app.put("/api/athletes/{athlete_id}/calendar/events/{event_id}")
def update_event(athlete_id: int, event_id: int, body: EventModel):
    conn = get_db()
    if not conn.execute("SELECT id FROM calendar_events WHERE id=? AND athlete_id=?", (event_id,athlete_id)).fetchone():
        conn.close(); raise HTTPException(404)
    conn.execute("UPDATE calendar_events SET date=?,title=?,description=?,event_time=? WHERE id=?",
                 (body.date,body.title,body.description,body.event_time,event_id))
    conn.commit()
    row = conn.execute("SELECT * FROM calendar_events WHERE id=?", (event_id,)).fetchone()
    conn.close(); return dict(row)

@app.delete("/api/athletes/{athlete_id}/calendar/events/{event_id}")
def delete_event(athlete_id: int, event_id: int):
    conn = get_db()
    conn.execute("DELETE FROM calendar_events WHERE id=? AND athlete_id=?", (event_id,athlete_id))
    conn.commit(); conn.close()
    return {"deleted": event_id}


# ─── Meal Plan ────────────────────────────────────────────────────────────────

@app.get("/api/athletes/{athlete_id}/meal-plan")
def get_meal_plan(athlete_id: int):
    ensure_athlete_defaults(athlete_id)
    conn = get_db()
    row = dict(conn.execute("SELECT * FROM meal_plans WHERE athlete_id=?", (athlete_id,)).fetchone())
    conn.close()
    dc = get_daily_calories(athlete_id)
    row["rmr"] = dc["rmr"]; row["daily_calorie_intake"] = dc["total_calories"]
    return row

@app.put("/api/athletes/{athlete_id}/meal-plan")
def update_meal_plan(athlete_id: int, body: MealPlanModel):
    ensure_athlete_defaults(athlete_id)
    conn = get_db()
    conn.execute("""UPDATE meal_plans SET protein_target=?,carbs_target=?,fat_target=?,fiber_target=?,
        sodium_target=?,potassium_target=?,protein_actual=?,carbs_actual=?,fat_actual=?,fiber_actual=?,
        sodium_actual=?,potassium_actual=? WHERE athlete_id=?""",
        (body.protein_target,body.carbs_target,body.fat_target,body.fiber_target,body.sodium_target,
         body.potassium_target,body.protein_actual,body.carbs_actual,body.fat_actual,body.fiber_actual,
         body.sodium_actual,body.potassium_actual,athlete_id))
    conn.commit(); conn.close()
    return get_meal_plan(athlete_id)


# ─── Foods ────────────────────────────────────────────────────────────────────

@app.get("/api/athletes/{athlete_id}/foods")
def get_foods(athlete_id: int, category: Optional[str] = None):
    conn = get_db()
    if category:
        rows = conn.execute("SELECT * FROM nutrition_foods WHERE athlete_id=? AND category=? ORDER BY name",
                            (athlete_id,category)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM nutrition_foods WHERE athlete_id=? ORDER BY name",
                            (athlete_id,)).fetchall()
    conn.close(); return [dict(r) for r in rows]

@app.post("/api/athletes/{athlete_id}/foods")
def create_food(athlete_id: int, body: FoodModel):
    conn = get_db()
    cur = conn.execute("""INSERT INTO nutrition_foods
        (athlete_id,name,protein,carbs,fat,fiber,sodium,potassium,calories,serving_size,category)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (athlete_id,body.name,body.protein,body.carbs,body.fat,body.fiber,
         body.sodium,body.potassium,body.calories,body.serving_size,body.category))
    fid = cur.lastrowid; conn.commit()
    row = conn.execute("SELECT * FROM nutrition_foods WHERE id=?", (fid,)).fetchone()
    conn.close(); return dict(row)

@app.put("/api/athletes/{athlete_id}/foods/{food_id}")
def update_food(athlete_id: int, food_id: int, body: FoodModel):
    conn = get_db()
    conn.execute("""UPDATE nutrition_foods SET name=?,protein=?,carbs=?,fat=?,fiber=?,sodium=?,
        potassium=?,calories=?,serving_size=?,category=? WHERE id=? AND athlete_id=?""",
        (body.name,body.protein,body.carbs,body.fat,body.fiber,body.sodium,body.potassium,
         body.calories,body.serving_size,body.category,food_id,athlete_id))
    conn.commit()
    row = conn.execute("SELECT * FROM nutrition_foods WHERE id=?", (food_id,)).fetchone()
    conn.close()
    if not row: raise HTTPException(404)
    return dict(row)

@app.delete("/api/athletes/{athlete_id}/foods/{food_id}")
def delete_food(athlete_id: int, food_id: int):
    conn = get_db()
    conn.execute("DELETE FROM nutrition_foods WHERE id=? AND athlete_id=?", (food_id,athlete_id))
    conn.commit(); conn.close()
    return {"deleted": food_id}


# ─── Workout Plans ────────────────────────────────────────────────────────────

def _load_plan(conn, plan_id):
    row = conn.execute("SELECT * FROM workout_plans WHERE id=?", (plan_id,)).fetchone()
    if not row: raise HTTPException(404, "Plan not found")
    plan = dict(row)
    sessions = conn.execute("SELECT * FROM workout_sessions WHERE plan_id=? ORDER BY sort_order, day_of_week",
                            (plan_id,)).fetchall()
    plan["sessions"] = []
    for sess in sessions:
        s = dict(sess)
        s["muscle_groups"] = json.loads(s.get("muscle_groups") or "[]")
        exs = conn.execute("SELECT * FROM workout_exercises WHERE session_id=? ORDER BY sort_order",
                           (s["id"],)).fetchall()
        s["exercises"] = []
        for ex in exs:
            e = dict(ex)
            e["sets_json"] = json.loads(e.get("sets_json") or "[]")
            s["exercises"].append(e)
        plan["sessions"].append(s)
    return plan

@app.get("/api/athletes/{athlete_id}/workout-plans")
def list_workout_plans(athlete_id: int):
    conn = get_db()
    rows = conn.execute("SELECT id FROM workout_plans WHERE athlete_id=? ORDER BY sort_order, title",
                        (athlete_id,)).fetchall()
    result = [_load_plan(conn, r["id"]) for r in rows]
    conn.close(); return result

@app.post("/api/athletes/{athlete_id}/workout-plans")
def create_workout_plan(athlete_id: int, body: WorkoutPlanModel):
    conn = get_db()
    cur = conn.execute("""INSERT INTO workout_plans (athlete_id,title,start_date,end_date,notes,sort_order)
        VALUES (?,?,?,?,?,?)""",
        (athlete_id,body.title,body.start_date,body.end_date,body.notes,body.sort_order))
    pid = cur.lastrowid; conn.commit()
    result = _load_plan(conn, pid); conn.close(); return result

@app.put("/api/athletes/{athlete_id}/workout-plans/{plan_id}")
def update_workout_plan(athlete_id: int, plan_id: int, body: WorkoutPlanModel):
    conn = get_db()
    conn.execute("""UPDATE workout_plans SET title=?,start_date=?,end_date=?,notes=?,sort_order=?
        WHERE id=? AND athlete_id=?""",
        (body.title,body.start_date,body.end_date,body.notes,body.sort_order,plan_id,athlete_id))
    conn.commit()
    result = _load_plan(conn, plan_id); conn.close(); return result

@app.delete("/api/athletes/{athlete_id}/workout-plans/{plan_id}")
def delete_workout_plan(athlete_id: int, plan_id: int):
    conn = get_db()
    conn.execute("DELETE FROM workout_plans WHERE id=? AND athlete_id=?", (plan_id,athlete_id))
    conn.commit(); conn.close()
    return {"deleted": plan_id}


# ─── Workout Sessions ─────────────────────────────────────────────────────────

@app.post("/api/workout-sessions")
def create_session(body: WorkoutSessionModel):
    conn = get_db()
    cur = conn.execute("""INSERT INTO workout_sessions (plan_id,day_of_week,session_title,muscle_groups,session_notes,sort_order)
        VALUES (?,?,?,?,?,?)""",
        (body.plan_id,body.day_of_week,body.session_title,json.dumps(body.muscle_groups),
         body.session_notes,body.sort_order))
    sid = cur.lastrowid; conn.commit()
    row = conn.execute("SELECT * FROM workout_sessions WHERE id=?", (sid,)).fetchone()
    s = dict(row); s["muscle_groups"] = json.loads(s.get("muscle_groups") or "[]")
    s["exercises"] = []; conn.close(); return s

@app.put("/api/workout-sessions/{session_id}")
def update_session(session_id: int, body: WorkoutSessionModel):
    conn = get_db()
    conn.execute("""UPDATE workout_sessions SET plan_id=?,day_of_week=?,session_title=?,muscle_groups=?,
        session_notes=?,sort_order=? WHERE id=?""",
        (body.plan_id,body.day_of_week,body.session_title,json.dumps(body.muscle_groups),
         body.session_notes,body.sort_order,session_id))
    conn.commit()
    row = conn.execute("SELECT * FROM workout_sessions WHERE id=?", (session_id,)).fetchone()
    s = dict(row); s["muscle_groups"] = json.loads(s.get("muscle_groups") or "[]")
    exs = conn.execute("SELECT * FROM workout_exercises WHERE session_id=? ORDER BY sort_order", (session_id,)).fetchall()
    s["exercises"] = [{**dict(e),"sets_json":json.loads(e.get("sets_json") or "[]")} for e in exs]
    conn.close(); return s

@app.delete("/api/workout-sessions/{session_id}")
def delete_session(session_id: int):
    conn = get_db()
    conn.execute("DELETE FROM workout_sessions WHERE id=?", (session_id,))
    conn.commit(); conn.close()
    return {"deleted": session_id}


# ─── Workout Exercises ────────────────────────────────────────────────────────

@app.post("/api/workout-exercises")
def create_exercise(body: WorkoutExerciseModel):
    conn = get_db()
    cur = conn.execute("""INSERT INTO workout_exercises (session_id,name,set_type,sets_json,exercise_notes,sort_order)
        VALUES (?,?,?,?,?,?)""",
        (body.session_id,body.name,body.set_type,json.dumps(body.sets_json),body.exercise_notes,body.sort_order))
    eid = cur.lastrowid; conn.commit()
    row = conn.execute("SELECT * FROM workout_exercises WHERE id=?", (eid,)).fetchone()
    e = dict(row); e["sets_json"] = json.loads(e.get("sets_json") or "[]")
    conn.close(); return e

@app.put("/api/workout-exercises/{exercise_id}")
def update_exercise(exercise_id: int, body: WorkoutExerciseModel):
    conn = get_db()
    conn.execute("""UPDATE workout_exercises SET session_id=?,name=?,set_type=?,sets_json=?,exercise_notes=?,sort_order=?
        WHERE id=?""",
        (body.session_id,body.name,body.set_type,json.dumps(body.sets_json),body.exercise_notes,body.sort_order,exercise_id))
    conn.commit()
    row = conn.execute("SELECT * FROM workout_exercises WHERE id=?", (exercise_id,)).fetchone()
    e = dict(row); e["sets_json"] = json.loads(e.get("sets_json") or "[]")
    conn.close(); return e

@app.delete("/api/workout-exercises/{exercise_id}")
def delete_exercise(exercise_id: int):
    conn = get_db()
    conn.execute("DELETE FROM workout_exercises WHERE id=?", (exercise_id,))
    conn.commit(); conn.close()
    return {"deleted": exercise_id}


# ─── SMTP ─────────────────────────────────────────────────────────────────────

@app.get("/api/admin/smtp")
def get_smtp():
    conn = get_db()
    row = dict(conn.execute("SELECT * FROM smtp_settings WHERE id=1").fetchone())
    conn.close()
    row["use_tls"] = bool(row["use_tls"])
    row["password"] = "••••••••" if row["password"] else ""
    return row

@app.put("/api/admin/smtp")
def update_smtp(body: SmtpModel):
    conn = get_db()
    existing = dict(conn.execute("SELECT password FROM smtp_settings WHERE id=1").fetchone())
    pw = body.password if (body.password and body.password != "••••••••") else existing["password"]
    conn.execute("UPDATE smtp_settings SET host=?,port=?,username=?,password=?,from_name=?,use_tls=? WHERE id=1",
                 (body.host,body.port,body.username,pw,body.from_name,int(body.use_tls)))
    conn.commit(); conn.close()
    return get_smtp()

@app.post("/api/admin/test-smtp")
def test_smtp():
    conn = get_db()
    cfg = dict(conn.execute("SELECT * FROM smtp_settings WHERE id=1").fetchone())
    conn.close()
    if not cfg["username"] or not cfg["password"]: raise HTTPException(400, "SMTP credentials not configured")
    try:
        if cfg["use_tls"]:
            s = smtplib.SMTP(cfg["host"], cfg["port"], timeout=10); s.starttls()
        else:
            s = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=10)
        s.login(cfg["username"], cfg["password"]); s.quit()
        return {"success":True,"message":"SMTP connection successful!"}
    except Exception as e:
        raise HTTPException(400, f"Connection failed: {e}")


# ─── Excel Export ─────────────────────────────────────────────────────────────

def _build_workbook(athlete_id: int):
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter
    except ImportError:
        raise HTTPException(500, "openpyxl not installed. Run: pip install openpyxl")

    conn = get_db()
    ath = athlete_row_to_dict(conn.execute("SELECT * FROM athletes WHERE id=?", (athlete_id,)).fetchone())
    prog_row = conn.execute("SELECT * FROM programs WHERE athlete_id=?", (athlete_id,)).fetchone()
    prog = dict(prog_row) if prog_row else {}
    mp_row = conn.execute("SELECT * FROM meal_plans WHERE athlete_id=?", (athlete_id,)).fetchone()
    mp = dict(mp_row) if mp_row else {}
    foods = [dict(r) for r in conn.execute("SELECT * FROM nutrition_foods WHERE athlete_id=? ORDER BY name", (athlete_id,)).fetchall()]
    plan_ids = conn.execute("SELECT id FROM workout_plans WHERE athlete_id=? ORDER BY sort_order, title", (athlete_id,)).fetchall()
    plans = [_load_plan(conn, r["id"]) for r in plan_ids]
    dc_row = conn.execute("SELECT additional_calories FROM activity_calories WHERE athlete_id=? AND level=?",
                          (athlete_id, ath["activity_level"])).fetchone()
    conn.close()
    additional_cal = dc_row["additional_calories"] if dc_row else 0
    total_cal = max(0, ath["average"] + additional_cal - ath["deficit"])

    wb = Workbook()

    # Colour palette
    HDR_FILL  = PatternFill("solid", fgColor="1A1D27")
    SUBHDR    = PatternFill("solid", fgColor="2E3349")
    ACCENT    = PatternFill("solid", fgColor="4F8EF7")
    GREEN_F   = PatternFill("solid", fgColor="2ECC71")
    WHITE_F   = PatternFill("solid", fgColor="FFFFFF")
    HDR_FONT  = Font(bold=True, color="FFFFFF", size=11)
    SUBF      = Font(bold=True, color="FFFFFF", size=10)
    BODY_FONT = Font(color="1A1D27", size=10)
    BOLD_BODY = Font(bold=True, color="1A1D27", size=10)
    thin      = Side(style="thin", color="CCCCCC")
    BORDER    = Border(left=thin, right=thin, top=thin, bottom=thin)
    CENTER    = Alignment(horizontal="center", vertical="center")
    LEFT      = Alignment(horizontal="left", vertical="center")

    def set_hdr(ws, row, col, val, fill=HDR_FILL, font=HDR_FONT):
        c = ws.cell(row=row, column=col, value=val)
        c.fill = fill; c.font = font; c.alignment = CENTER; c.border = BORDER

    def set_cell(ws, row, col, val, bold=False, fill=None, align=LEFT):
        c = ws.cell(row=row, column=col, value=val)
        c.font = BOLD_BODY if bold else BODY_FONT
        if fill: c.fill = fill
        c.alignment = align; c.border = BORDER

    def auto_width(ws, extra=4):
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                try: max_len = max(max_len, len(str(cell.value or "")))
                except: pass
            ws.column_dimensions[col_letter].width = min(max_len + extra, 60)

    # ── Sheet 1: Athlete Profile ──
    ws = wb.active; ws.title = "Athlete Profile"
    ws.row_dimensions[1].height = 28
    ws.merge_cells("A1:D1")
    c = ws["A1"]; c.value = f"💪 BodyBuilder — {ath['name']}"; c.font = Font(bold=True, color="FFFFFF", size=14)
    c.fill = ACCENT; c.alignment = CENTER

    headers = ["Field", "Value", "Field", "Value"]
    for i, h in enumerate(headers, 1): set_hdr(ws, 2, i, h, SUBHDR, SUBF)

    rows = [
        ("Name", ath["name"], "Email", ath["email"]),
        ("Date of Birth", ath["birthdate"], "Age", ath["age"]),
        ("Sex", ath["sex"].title(), "Phase", ath["phase"].title()),
        ("Height (cm)", ath["height_cm"], "Weight (kg)", ath["weight_kg"]),
        ("Body Fat %", ath.get("body_fat_pct",0), "LBM (kg)", ath["lbm_kg"]),
        ("Activity Level", ath["activity_level"], "Workout Days/Week", ath["workout_days_per_week"]),
        ("Workout Time", ath["workout_time"], "Workout Days", ", ".join(ath["workout_days"])),
        ("", "", "", ""),
        ("RMR — Mifflin-St Jeor", ath["mifflin"], "RMR — Harris-Benedict", ath["harris"]),
        ("RMR — Katch-McArdle", ath["katch"], "RMR Average (used)", ath["average"]),
        ("Additional Cal (Activity)", additional_cal, "Caloric Deficit", ath["deficit"]),
        ("", "", "", ""),
        ("TOTAL DAILY CALORIES", total_cal, "Program Phase", ath["phase"].upper()),
    ]
    for ri, row in enumerate(rows, 3):
        for ci, val in enumerate(row, 1):
            bold = ri == len(rows)+2 and ci in (1,2)
            fill = GREEN_F if (ri == len(rows)+2 and ci in (1,2)) else None
            set_cell(ws, ri, ci, val, bold=bold, fill=fill)

    auto_width(ws)

    # ── Sheet 2: Program Details ──
    ws2 = wb.create_sheet("Program Details")
    for i, h in enumerate(["Field", "Value"], 1): set_hdr(ws2, 1, i, h, SUBHDR, SUBF)
    prog_rows = [
        ("Program Start Date", prog.get("start_date","")),
        ("Program End Date", prog.get("end_date","")),
        ("Payment Processed", "Yes" if prog.get("payment_processed") else "No"),
    ]
    for ri, (k, v) in enumerate(prog_rows, 2):
        set_cell(ws2, ri, 1, k, bold=True); set_cell(ws2, ri, 2, v)
    auto_width(ws2)

    # ── Sheet 3: Meal Plan ──
    ws3 = wb.create_sheet("Meal Plan")
    ws3.row_dimensions[1].height = 24
    ws3.merge_cells("A1:E1")
    c = ws3["A1"]; c.value = "Meal Plan & Macro Targets"
    c.font = HDR_FONT; c.fill = ACCENT; c.alignment = CENTER

    for ci, h in enumerate(["Nutrient", "Unit", "Target", "Actual", "% of Target"], 1):
        set_hdr(ws3, 2, ci, h, SUBHDR, SUBF)

    macro_defs = [
        ("Protein", "g", "protein"), ("Carbohydrates", "g", "carbs"), ("Fat", "g", "fat"),
        ("Fiber", "g", "fiber"), ("Sodium", "mg", "sodium"), ("Potassium", "mg", "potassium"),
    ]
    for ri, (lbl, unit, key) in enumerate(macro_defs, 3):
        tgt = mp.get(f"{key}_target", 0); act = mp.get(f"{key}_actual", 0)
        pct = f"{round((act/tgt)*100)}%" if tgt else "N/A"
        set_cell(ws3, ri, 1, lbl, bold=True); set_cell(ws3, ri, 2, unit)
        set_cell(ws3, ri, 3, tgt); set_cell(ws3, ri, 4, act); set_cell(ws3, ri, 5, pct)

    tgt_cal = (mp.get("protein_target",0)*4 + mp.get("carbs_target",0)*4 + mp.get("fat_target",0)*9)
    act_cal = (mp.get("protein_actual",0)*4 + mp.get("carbs_actual",0)*4 + mp.get("fat_actual",0)*9)
    ri = len(macro_defs) + 3
    for ci, val in enumerate(["Calories (calc.)", "kcal", round(tgt_cal,1), round(act_cal,1),
                               f"{round((act_cal/tgt_cal)*100)}%" if tgt_cal else "N/A"], 1):
        set_cell(ws3, ri, ci, val, bold=True, fill=GREEN_F)
    # Header info
    ri += 2
    for k, v in [("Athlete", ath["name"]), ("RMR", f"{ath['average']} kcal/day"),
                  ("Daily Calorie Target", f"{total_cal} kcal/day")]:
        set_cell(ws3, ri, 1, k, bold=True); set_cell(ws3, ri, 2, v); ri += 1
    auto_width(ws3)

    # ── Sheet 4: Nutrition Database ──
    ws4 = wb.create_sheet("Nutrition Database")
    if foods:
        hdrs = ["Name","Category","Serving","Calories","Protein (g)","Carbs (g)","Fat (g)","Fiber (g)","Sodium (mg)","Potassium (mg)"]
        for ci, h in enumerate(hdrs, 1): set_hdr(ws4, 1, ci, h, SUBHDR, SUBF)
        for ri, f in enumerate(foods, 2):
            for ci, val in enumerate([f["name"],f["category"],f["serving_size"],f["calories"],
                                       f["protein"],f["carbs"],f["fat"],f["fiber"],f["sodium"],f["potassium"]], 1):
                set_cell(ws4, ri, ci, val)
    else:
        ws4["A1"] = "No foods in nutrition database"
    auto_width(ws4)

    # ── Sheets 5+: One sheet per workout plan ──
    DOW = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    for pi, plan in enumerate(plans):
        sheet_name = f"Workout - {plan['title']}"[:31]
        wsw = wb.create_sheet(sheet_name)
        wsw.row_dimensions[1].height = 26
        wsw.merge_cells("A1:F1")
        c = wsw["A1"]; c.value = f"Workout Plan: {plan['title']}"
        c.font = HDR_FONT; c.fill = ACCENT; c.alignment = CENTER

        # Plan metadata
        meta = [("Start Date", plan.get("start_date","")), ("End Date", plan.get("end_date","")),
                ("Athlete", ath["name"]), ("Notes", plan.get("notes",""))]
        for ri, (k, v) in enumerate(meta, 2):
            set_cell(wsw, ri, 1, k, bold=True); wsw.merge_cells(f"B{ri}:F{ri}")
            set_cell(wsw, ri, 2, v)

        # Sessions grouped by day of week
        cur_row = len(meta) + 3
        sessions_by_dow = {d: [s for s in plan["sessions"] if s["day_of_week"]==d] for d in DOW}

        for day in DOW:
            day_sessions = sessions_by_dow.get(day, [])
            if not day_sessions: continue

            # Day header
            wsw.merge_cells(f"A{cur_row}:F{cur_row}")
            c = wsw.cell(row=cur_row, column=1, value=f"📅 {day}")
            c.font = Font(bold=True, color="FFFFFF", size=11); c.fill = SUBHDR; c.alignment = LEFT
            cur_row += 1

            for sess in day_sessions:
                # Session header
                wsw.merge_cells(f"A{cur_row}:F{cur_row}")
                title = sess.get("session_title") or sess.get("day_of_week","")
                muscles = ", ".join(sess.get("muscle_groups",[]))
                c = wsw.cell(row=cur_row, column=1, value=f"{title} — {muscles}" if muscles else title)
                c.font = Font(bold=True, color="1A1D27", size=10); c.fill = PatternFill("solid", fgColor="E8EAF0")
                c.alignment = LEFT; cur_row += 1

                if sess.get("session_notes"):
                    wsw.merge_cells(f"A{cur_row}:F{cur_row}")
                    set_cell(wsw, cur_row, 1, f"Notes: {sess['session_notes']}")
                    cur_row += 1

                if sess.get("exercises"):
                    for ci, h in enumerate(["Exercise","Set Type","Set #","Weight (kg)","Reps","Notes"], 1):
                        set_hdr(wsw, cur_row, ci, h, SUBHDR, SUBF)
                    cur_row += 1
                    for ex in sess["exercises"]:
                        sets = ex.get("sets_json",[])
                        if not sets: sets = [{}]
                        for si, s in enumerate(sets):
                            if si == 0:
                                set_cell(wsw, cur_row, 1, ex["name"], bold=True)
                                set_cell(wsw, cur_row, 2, ex["set_type"].replace("_"," ").title())
                                set_cell(wsw, cur_row, 6, ex.get("exercise_notes",""))
                            else:
                                set_cell(wsw, cur_row, 1, ""); set_cell(wsw, cur_row, 2, "")
                                set_cell(wsw, cur_row, 6, "")
                            set_cell(wsw, cur_row, 3, s.get("set_number", si+1))
                            set_cell(wsw, cur_row, 4, s.get("weight", 0))
                            set_cell(wsw, cur_row, 5, s.get("reps", 0))
                            cur_row += 1

                cur_row += 1  # space between sessions

        auto_width(wsw)

    return wb


@app.get("/api/athletes/{athlete_id}/export-xlsx")
def export_xlsx(athlete_id: int):
    wb = _build_workbook(athlete_id)
    ath = get_athlete(athlete_id)
    safe_name = "".join(c for c in ath["name"] if c.isalnum() or c in " _-").strip() or "athlete"
    filename = f"BodyBuilder_{safe_name}.xlsx"
    buf = io.BytesIO()
    wb.save(buf); buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.post("/api/admin/send-program")
def send_program(body: SendProgramModel):
    conn = get_db()
    cfg = dict(conn.execute("SELECT * FROM smtp_settings WHERE id=1").fetchone())
    conn.close()
    if not cfg["username"] or not cfg["password"]:
        raise HTTPException(400, "SMTP credentials not configured")
    ath = get_athlete(body.athlete_id)
    wb = _build_workbook(body.athlete_id)
    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    safe_name = "".join(c for c in ath["name"] if c.isalnum() or c in " _-").strip() or "athlete"
    filename = f"BodyBuilder_{safe_name}.xlsx"
    msg = MIMEMultipart()
    msg["From"] = f"{cfg['from_name']} <{cfg['username']}>"
    msg["To"] = body.to_email
    msg["Subject"] = body.subject
    body_text = body.message or f"Hi,\n\nPlease find your BodyBuilder program attached as an Excel file.\n\nYou can open it in Google Sheets via File → Import.\n\nBest regards,\n{cfg['from_name']}"
    msg.attach(MIMEText(body_text, "plain"))
    part = MIMEBase("application","octet-stream"); part.set_payload(buf.read())
    encoders.encode_base64(part)
    part.add_header("Content-Disposition", "attachment", filename=filename)
    msg.attach(part)
    try:
        if cfg["use_tls"]:
            s = smtplib.SMTP(cfg["host"], cfg["port"], timeout=15); s.starttls()
        else:
            s = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=15)
        s.login(cfg["username"], cfg["password"]); s.sendmail(cfg["username"], body.to_email, msg.as_string()); s.quit()
        return {"success":True,"message":f"Program sent to {body.to_email}"}
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(400, "SMTP authentication failed. Check username/password (use App Password for Gmail).")
    except Exception as e:
        raise HTTPException(500, f"Failed to send email: {e}")


# ─── Frontend ─────────────────────────────────────────────────────────────────

@app.get("/")
def serve_frontend():
    index = FRONTEND_DIR / "index.html"
    if index.exists(): return FileResponse(str(index))
    return {"message": "BodyBuilder API running. Open frontend/index.html in your browser."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
