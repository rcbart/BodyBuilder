"""
BodyBuilder — macOS App Launcher
---------------------------------
Entry point for the PyInstaller-built .app bundle.

Responsibilities:
  1. Detect whether we're running from a bundle or from source
  2. Create a persistent data directory in ~/Library/Application Support/BodyBuilder/
     so the database and exercise images survive app updates
  3. Set environment variables that main.py reads instead of its default
     relative paths (BB_DATA_DIR, BB_FRONTEND_DIR, BB_VERSION_FILE)
  4. Open the browser to localhost:8000 after the server is ready
  5. Start uvicorn — this call blocks, keeping the process alive
"""

import os
import sys
import threading
import time
import webbrowser
from pathlib import Path

# ── 1. Bundle vs source detection ────────────────────────────────────────────
# sys.frozen is set by PyInstaller; sys._MEIPASS is the temp dir where
# bundled files are extracted at runtime.
FROZEN     = getattr(sys, "frozen", False)
BUNDLE_DIR = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))

# ── 2. Persistent user data directory ────────────────────────────────────────
# The bundle itself is read-only and gets replaced on every update.
# The database and cached exercise images must live outside the bundle.
DATA_DIR = Path.home() / "Library" / "Application Support" / "BodyBuilder"
DATA_DIR.mkdir(parents=True, exist_ok=True)
(DATA_DIR / "exercise_images").mkdir(exist_ok=True)

# ── 3. Tell main.py where everything lives ───────────────────────────────────
os.environ["BB_DATA_DIR"]     = str(DATA_DIR)
os.environ["BB_FRONTEND_DIR"] = str(BUNDLE_DIR / "frontend")
os.environ["BB_VERSION_FILE"] = str(BUNDLE_DIR / "VERSION")

# ── 4. Make backend importable ───────────────────────────────────────────────
BACKEND_DIR = str(BUNDLE_DIR / "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# ── 5. Open browser once the server is accepting connections ─────────────────
def _open_browser():
    """Wait briefly, then open the app in the default browser."""
    import socket
    deadline = time.time() + 10
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", 8000), timeout=0.5):
                break
        except OSError:
            time.sleep(0.25)
    webbrowser.open("http://localhost:8000")

threading.Thread(target=_open_browser, daemon=True).start()

# ── 6. Import app (causes PyInstaller to bundle all of main.py's deps) ───────
import main as _bodybuilder  # noqa: E402  — intentionally after path setup

# ── 7. Start the server (blocks until the process is killed) ─────────────────
import uvicorn  # noqa: E402

uvicorn.run(
    _bodybuilder.app,
    host="127.0.0.1",
    port=8000,
    log_level="warning",
)
