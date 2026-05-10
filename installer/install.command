#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# BodyBuilder — macOS Installer
# Double-click this file to install.
# ─────────────────────────────────────────────────────────────────────────────

# Move to the directory this script lives in so all relative paths work
cd "$(dirname "$0")"

# ── Colours ───────────────────────────────────────────────────────────────────
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'
B='\033[0;34m'; C='\033[0;36m'; W='\033[1;37m'; N='\033[0m'

# ── Paths ─────────────────────────────────────────────────────────────────────
SOURCE_DIR="$(cd .. && pwd)"          # the bodyBuilder project root
INSTALL_DIR="$HOME/.bodybuilder"      # where the app lives after install
VENV_DIR="$INSTALL_DIR/venv"
APP_DIR="$INSTALL_DIR/app"
APP_BUNDLE="/Applications/BodyBuilder.app"
DESKTOP_STOP="$HOME/Desktop/Stop BodyBuilder.command"
VERSION="$(cat "$SOURCE_DIR/VERSION" 2>/dev/null || echo "1.1.0")"
PORT=8000

# ─────────────────────────────────────────────────────────────────────────────
header() {
  clear
  echo ""
  echo -e "${C}  ██████╗  ██████╗ ██████╗ ██╗   ██╗"
  echo -e "  ██╔══██╗██╔═══██╗██╔══██╗╚██╗ ██╔╝"
  echo -e "  ██████╔╝██║   ██║██║  ██║ ╚████╔╝ "
  echo -e "  ██╔══██╗██║   ██║██║  ██║  ╚██╔╝  "
  echo -e "  ██████╔╝╚██████╔╝██████╔╝   ██║   "
  echo -e "  ╚═════╝  ╚═════╝ ╚═════╝    ╚═╝   ${N}"
  echo ""
  echo -e "${W}  BodyBuilder v${VERSION} — macOS Installer${N}"
  echo -e "  ${B}──────────────────────────────────────${N}"
  echo ""
}

step()  { echo -e "${B}  ▶ ${W}$1${N}"; }
ok()    { echo -e "${G}  ✓ $1${N}"; }
warn()  { echo -e "${Y}  ⚠ $1${N}"; }
fail()  { echo -e "${R}  ✗ ERROR: $1${N}"; echo ""; }
die()   { fail "$1"; echo -e "${Y}  See INSTALL_GUIDE.md for help fixing this error.${N}"; echo ""; exit 1; }

# ─────────────────────────────────────────────────────────────────────────────
header

# ── 1. Check macOS ────────────────────────────────────────────────────────────
step "Checking system..."

OS=$(uname -s)
if [ "$OS" != "Darwin" ]; then
  die "This installer is for macOS only. Detected OS: $OS"
fi

MACOS_VER=$(sw_vers -productVersion 2>/dev/null)
ok "macOS $MACOS_VER detected"

# ── 2. Find Python 3.8+ ───────────────────────────────────────────────────────
PYTHON=""
for candidate in python3 python3.13 python3.12 python3.11 python3.10 python3.9 python3.8; do
  if command -v "$candidate" &>/dev/null; then
    PY_VER=$("$candidate" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null)
    PY_MAJOR=$(echo "$PY_VER" | cut -d. -f1)
    PY_MINOR=$(echo "$PY_VER" | cut -d. -f2)
    if [ "$PY_MAJOR" -ge 3 ] && [ "$PY_MINOR" -ge 8 ]; then
      PYTHON="$candidate"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  echo ""
  fail "Python 3.8 or newer is required but was not found."
  echo -e "  ${W}To install Python:${N}"
  echo -e "  1. Open your browser and go to: ${C}https://www.python.org/downloads/${N}"
  echo -e "  2. Click the yellow 'Download Python' button"
  echo -e "  3. Open the downloaded file and follow the installer"
  echo -e "  4. Once installed, double-click ${W}install.command${N} again"
  echo ""
  exit 1
fi

ok "Python $PY_VER found ($PYTHON)"

# ── 3. Check pip ──────────────────────────────────────────────────────────────
if ! "$PYTHON" -m pip --version &>/dev/null; then
  step "Installing pip..."
  "$PYTHON" -m ensurepip --upgrade &>/dev/null || \
    die "Could not install pip. See INSTALL_GUIDE.md → 'pip not found'."
fi
ok "pip is available"

# ── 4. Check source files ─────────────────────────────────────────────────────
if [ ! -f "$SOURCE_DIR/backend/main.py" ]; then
  die "Cannot find BodyBuilder source files at: $SOURCE_DIR\n  Make sure this installer is inside the BodyBuilder project folder."
fi
ok "Source files found at $SOURCE_DIR"

# ── 5. Check disk space (need ~200 MB) ────────────────────────────────────────
AVAIL_KB=$(df -k "$HOME" | tail -1 | awk '{print $4}')
NEED_KB=204800
if [ "$AVAIL_KB" -lt "$NEED_KB" ]; then
  AVAIL_MB=$((AVAIL_KB / 1024))
  die "Not enough disk space. Need ~200 MB, only ${AVAIL_MB} MB available."
fi
ok "Disk space OK"

echo ""
echo -e "${W}  Ready to install BodyBuilder to: ${C}$INSTALL_DIR${N}"
echo ""
read -p "  Press Return to continue, or Ctrl+C to cancel... " _
echo ""

# ── 6. Create install directory & copy app ────────────────────────────────────
step "Copying application files..."

rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"

# Copy backend and frontend (exclude venv, pycache, .DS_Store, .git)
rsync -a --exclude='venv/' --exclude='__pycache__/' --exclude='*.pyc' \
         --exclude='.DS_Store' --exclude='.git/' --exclude='exercise_images/' \
         --exclude='*.db' \
         "$SOURCE_DIR/backend/"  "$APP_DIR/backend/"
rsync -a --exclude='.DS_Store' \
         "$SOURCE_DIR/frontend/" "$APP_DIR/frontend/"
[ -f "$SOURCE_DIR/VERSION" ] && cp "$SOURCE_DIR/VERSION" "$APP_DIR/VERSION"

mkdir -p "$APP_DIR/backend/exercise_images"
ok "Files copied"

# ── 7. Create virtual environment ─────────────────────────────────────────────
step "Creating Python virtual environment..."

if [ -d "$VENV_DIR" ]; then
  warn "Existing environment found — removing and recreating"
  rm -rf "$VENV_DIR"
fi

"$PYTHON" -m venv "$VENV_DIR" || die "Failed to create virtual environment."
ok "Virtual environment created"

# ── 8. Install packages ───────────────────────────────────────────────────────
step "Installing packages (this may take 1–2 minutes)..."

PIP="$VENV_DIR/bin/pip"

"$PIP" install --upgrade pip --quiet 2>&1 | grep -v "^$" || true

PACKAGES=(
  "fastapi==0.115.0"
  "uvicorn[standard]==0.30.6"
  "pydantic==2.9.2"
  "openpyxl==3.1.5"
  "python-multipart"
  "aiofiles"
)

for pkg in "${PACKAGES[@]}"; do
  echo -e "    installing ${C}${pkg}${N}..."
  "$PIP" install "$pkg" --quiet 2>&1 | tail -1 || \
    die "Failed to install $pkg.\n  Check your internet connection and try again.\n  See INSTALL_GUIDE.md → 'Package installation failed'."
done

ok "All packages installed"

# ── 9. Create the launcher shell script ──────────────────────────────────────
step "Creating launcher..."

LAUNCHER="$INSTALL_DIR/launch.sh"
cat > "$LAUNCHER" << LAUNCH_EOF
#!/bin/bash
# BodyBuilder launcher — generated by installer

INSTALL_DIR="$INSTALL_DIR"
VENV_DIR="$VENV_DIR"
APP_DIR="$APP_DIR"
PORT=$PORT
PID_FILE="\$INSTALL_DIR/server.pid"
LOG_FILE="\$INSTALL_DIR/server.log"

# Check if already running
if [ -f "\$PID_FILE" ]; then
  OLD_PID=\$(cat "\$PID_FILE")
  if kill -0 "\$OLD_PID" 2>/dev/null; then
    echo "BodyBuilder is already running (PID \$OLD_PID)"
    open "http://localhost:\$PORT"
    exit 0
  else
    rm -f "\$PID_FILE"
  fi
fi

# Check if port is in use by something else
if lsof -Pi :"\$PORT" -sTCP:LISTEN -t &>/dev/null; then
  echo "Port \$PORT is already in use by another application."
  echo "BodyBuilder may already be running — opening browser..."
  open "http://localhost:\$PORT"
  exit 0
fi

# Start server
source "\$VENV_DIR/bin/activate"
cd "\$APP_DIR/backend"

nohup python -m uvicorn main:app --host 127.0.0.1 --port \$PORT \
  > "\$LOG_FILE" 2>&1 &

SERVER_PID=\$!
echo \$SERVER_PID > "\$PID_FILE"

# Wait for server to be ready (up to 15 seconds)
echo "Starting BodyBuilder..."
for i in \$(seq 1 30); do
  sleep 0.5
  if curl -s "http://localhost:\$PORT/api/version" &>/dev/null; then
    break
  fi
done

open "http://localhost:\$PORT"

# Close this Terminal window — the server keeps running in the background via nohup.
osascript -e 'tell application "Terminal" to close first window' 2>/dev/null &
LAUNCH_EOF

chmod +x "$LAUNCHER"
ok "Launcher created"

# ── 10. Create Stop script on Desktop ─────────────────────────────────────────
cat > "$DESKTOP_STOP" << STOP_EOF
#!/bin/bash
PID_FILE="$INSTALL_DIR/server.pid"
if [ -f "\$PID_FILE" ]; then
  PID=\$(cat "\$PID_FILE")
  if kill "\$PID" 2>/dev/null; then
    rm -f "\$PID_FILE"
    osascript -e 'display notification "BodyBuilder has been stopped." with title "BodyBuilder"' 2>/dev/null
    echo "BodyBuilder stopped."
  else
    echo "BodyBuilder was not running."
    rm -f "\$PID_FILE"
  fi
else
  # Try killing by port
  PID=\$(lsof -ti :$PORT 2>/dev/null)
  if [ -n "\$PID" ]; then
    kill "\$PID" 2>/dev/null
    echo "BodyBuilder stopped."
  else
    echo "BodyBuilder does not appear to be running."
  fi
fi
STOP_EOF
chmod +x "$DESKTOP_STOP"
ok "Stop script created on Desktop"

# ── 11. Build macOS .app bundle ───────────────────────────────────────────────
step "Creating BodyBuilder.app in Applications..."

rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

# Info.plist
cat > "$APP_BUNDLE/Contents/Info.plist" << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>  <string>BodyBuilder</string>
  <key>CFBundleIdentifier</key>  <string>com.bodybuilder.app</string>
  <key>CFBundleName</key>        <string>BodyBuilder</string>
  <key>CFBundleDisplayName</key> <string>BodyBuilder</string>
  <key>CFBundleVersion</key>     <string>${VERSION}</string>
  <key>CFBundleShortVersionString</key> <string>${VERSION}</string>
  <key>CFBundlePackageType</key> <string>APPL</string>
  <key>CFBundleSignature</key>   <string>????</string>
  <key>LSMinimumSystemVersion</key> <string>11.0</string>
  <key>NSHighResolutionCapable</key> <true/>
</dict>
</plist>
PLIST_EOF

# App executable
cat > "$APP_BUNDLE/Contents/MacOS/BodyBuilder" << APPEXEC_EOF
#!/bin/bash
bash "$LAUNCHER"
APPEXEC_EOF
chmod +x "$APP_BUNDLE/Contents/MacOS/BodyBuilder"

ok "BodyBuilder.app created in /Applications"

# ── 12. Create a Desktop alias ────────────────────────────────────────────────
osascript << AS_EOF 2>/dev/null
tell application "Finder"
  make alias file to POSIX file "$APP_BUNDLE" at POSIX file "$HOME/Desktop"
end tell
AS_EOF
ok "Shortcut added to Desktop"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${G}  ╔══════════════════════════════════════════╗"
echo -e "  ║   ✓  Installation complete!              ║"
echo -e "  ╚══════════════════════════════════════════╝${N}"
echo ""
echo -e "  ${W}How to use BodyBuilder:${N}"
echo -e "  • ${C}Start: ${N} Double-click ${W}BodyBuilder${N} on your Desktop or in Applications"
echo -e "  • ${C}Stop:  ${N} Double-click ${W}Stop BodyBuilder${N} on your Desktop"
echo -e "  • ${C}Access:${N} The app opens in your browser at http://localhost:${PORT}"
echo ""
echo -e "  ${Y}First launch takes 5–10 seconds while the server starts.${N}"
echo ""
echo -e "  ${W}Tip:${N} If you have a backup from a previous installation, open the"
echo -e "  ${W}Admin${N} tab after launch and use ${C}Restore from Backup${N} to reload your data."
echo ""

# Offer to launch now
read -p "  Launch BodyBuilder now? [Y/n] " yn
yn="${yn:-Y}"
if [[ "$yn" =~ ^[Yy] ]]; then
  bash "$LAUNCHER"
fi
echo ""
