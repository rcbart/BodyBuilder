#!/usr/bin/env zsh
# ─────────────────────────────────────────────────────────────────────────────
# BodyBuilder — macOS .app + .dmg builder
#
# Usage:
#   ./build.sh                 # build for current architecture only
#   ./build.sh --universal     # build universal2 (arm64 + x86_64 in one file)
#                              # requires a universal Python install
#   ./build.sh --all           # build arm64, x86_64, AND universal2
#                              # must run on a Mac with universal Python installed
#                              # (e.g. python.org installer — not Homebrew)
#   ./build.sh --clean         # remove build/ and dist/ before building
#
# Flags can be combined:  ./build.sh --all --clean
#
# Output (one or more of):
#   dist/BodyBuilder-<version>-arm64.dmg
#   dist/BodyBuilder-<version>-x86_64.dmg
#   dist/BodyBuilder-<version>-universal2.dmg
#
# Prerequisites (installed automatically if missing):
#   pip install pyinstaller
#   brew install create-dmg
#
# Architecture notes:
#   arm64     → Apple Silicon Macs (M1 / M2 / M3 / M4 and later)
#   x86_64    → Intel Macs (any Mac made before late 2020)
#   universal2 → runs natively on both; larger file (~2×)
#                requires Python built as universal2 (python.org installer)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Resolve script directory ──────────────────────────────────────────────────
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-${(%):-%x}}")" && pwd)"
cd "$REPO_DIR"

# ── Read version ──────────────────────────────────────────────────────────────
VERSION="$(cat VERSION | tr -d '[:space:]')"
HOST_ARCH="$(uname -m)"   # arm64 or x86_64

# ── Parse arguments ───────────────────────────────────────────────────────────
CLEAN=0
BUILD_ALL=0
BUILD_UNIVERSAL=0

for arg in "$@"; do
  case $arg in
    --clean)     CLEAN=1 ;;
    --universal) BUILD_UNIVERSAL=1 ;;
    --all)       BUILD_ALL=1 ;;
  esac
done

# --all implies universal2 plus both native slices
if [[ $BUILD_ALL -eq 1 ]]; then
  BUILD_UNIVERSAL=1
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  BodyBuilder v${VERSION} — macOS build        "
echo "║  Host: ${HOST_ARCH}                           "
if [[ $BUILD_ALL -eq 1 ]]; then
echo "║  Targets: arm64 + x86_64 + universal2        "
elif [[ $BUILD_UNIVERSAL -eq 1 ]]; then
echo "║  Target: universal2                           "
else
echo "║  Target: ${HOST_ARCH}                         "
fi
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Clean previous build ──────────────────────────────────────────────────────
if [[ $CLEAN -eq 1 ]]; then
  echo "→ Cleaning previous build..."
  rm -rf build dist BodyBuilder.spec
fi

mkdir -p dist

# ── Activate virtualenv ───────────────────────────────────────────────────────
echo "→ Activating virtualenv..."
source backend/venv/bin/activate

# ── Install / upgrade PyInstaller ────────────────────────────────────────────
echo "→ Ensuring PyInstaller is installed..."
pip install --quiet --upgrade pyinstaller

# ── Check create-dmg ─────────────────────────────────────────────────────────
if ! command -v create-dmg &>/dev/null; then
  echo "→ Installing create-dmg via Homebrew..."
  brew install create-dmg
fi

# ── Generate .icns icon ───────────────────────────────────────────────────────
# PyInstaller on macOS requires .icns — SVG is not accepted.
# We convert once and cache the result at frontend/BodyBuilder.icns.
ICNS_PATH="frontend/BodyBuilder.icns"
if [[ ! -f "$ICNS_PATH" ]]; then
  echo "→ Generating .icns app icon from frontend/favicon.svg..."

  # rsvg-convert renders the SVG to a high-res PNG cleanly
  if ! command -v rsvg-convert &>/dev/null; then
    echo "→ Installing librsvg (SVG → PNG conversion)..."
    brew install librsvg
  fi

  ICONSET_DIR="$(mktemp -d)/BodyBuilder.iconset"
  TMP_PNG="$(mktemp).png"
  mkdir -p "$ICONSET_DIR"

  rsvg-convert -w 1024 -h 1024 "frontend/favicon.svg" -o "$TMP_PNG"

  # macOS requires these exact filenames inside the .iconset folder
  for size in 16 32 128 256 512; do
    sips -z $size $size         "$TMP_PNG" --out "${ICONSET_DIR}/icon_${size}x${size}.png"     &>/dev/null
    sips -z $((size*2)) $((size*2)) "$TMP_PNG" --out "${ICONSET_DIR}/icon_${size}x${size}@2x.png" &>/dev/null
  done
  # 1024 px slot (512@2x)
  cp "$TMP_PNG" "${ICONSET_DIR}/icon_512x512@2x.png"

  iconutil -c icns "$ICONSET_DIR" -o "$ICNS_PATH"
  rm -f "$TMP_PNG"
  echo "→ Icon saved to ${ICNS_PATH}"
fi

# ── Hidden imports (uvicorn uses dynamic loading internally) ──────────────────
HIDDEN=(
  uvicorn.logging
  uvicorn.loops
  uvicorn.loops.auto
  uvicorn.protocols
  uvicorn.protocols.http
  uvicorn.protocols.http.auto
  uvicorn.protocols.websockets
  uvicorn.protocols.websockets.auto
  uvicorn.lifespan
  uvicorn.lifespan.on
  anyio._backends._asyncio
  anyio._backends._trio
  email.mime.text
  email.mime.multipart
)

HIDDEN_ARGS=()
for mod in "${HIDDEN[@]}"; do
  HIDDEN_ARGS+=(--hidden-import "$mod")
done

# ── Helper: run PyInstaller for a given target-arch label ────────────────────
# Usage: run_pyinstaller <arch_label>
#   arch_label: arm64 | x86_64 | universal2 | "" (native, no flag)
run_pyinstaller() {
  local arch_label="$1"
  # Use an array so zsh word-splits correctly (a plain string would be passed
  # as one token, e.g. "--target-arch arm64" instead of two separate args)
  local -a arch_args=()
  [[ -n "$arch_label" ]] && arch_args=(--target-arch "$arch_label")

  echo ""
  echo "── PyInstaller: ${arch_label:-${HOST_ARCH}} ──────────────────────────────────────────"

  # Each build needs a clean slate so arches don't contaminate each other
  rm -rf build BodyBuilder.spec

  pyinstaller \
    --name "BodyBuilder" \
    --windowed \
    --onedir \
    --clean \
    --noconfirm \
    "${arch_args[@]}" \
    --add-data "frontend:frontend" \
    --add-data "VERSION:." \
    --icon "$ICNS_PATH" \
    "${HIDDEN_ARGS[@]}" \
    app_launcher.py

  local app_path="dist/BodyBuilder.app"
  if [[ ! -d "$app_path" ]]; then
    echo "✗ ERROR: $app_path not found — PyInstaller may have failed."
    exit 1
  fi
  echo "→ PyInstaller done."
}

# ── Helper: wrap .app into a .dmg ────────────────────────────────────────────
# Usage: make_dmg <arch_label>
make_dmg() {
  local arch_label="$1"
  local dmg_name="BodyBuilder-${VERSION}-${arch_label}.dmg"
  local dmg_path="dist/${dmg_name}"
  local app_path="dist/BodyBuilder.app"

  echo "→ Building ${dmg_name}..."
  rm -f "$dmg_path"

  create-dmg \
    --volname "BodyBuilder ${VERSION}" \
    --volicon "$ICNS_PATH" \
    --window-pos 200 120 \
    --window-size 600 400 \
    --icon-size 100 \
    --icon "BodyBuilder.app" 150 180 \
    --hide-extension "BodyBuilder.app" \
    --app-drop-link 450 180 \
    --no-internet-enable \
    "$dmg_path" \
    "$app_path"

  echo "✓ ${dmg_path}"

  # Move the .app aside so the next build doesn't clobber it
  # (PyInstaller always writes to dist/BodyBuilder.app)
  local stash="dist/BodyBuilder-${arch_label}.app"
  mv "$app_path" "$stash"
}

# ─────────────────────────────────────────────────────────────────────────────
# ── Build loop ────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────

BUILT_DMGS=()

if [[ $BUILD_ALL -eq 1 ]]; then
  # ── arm64 ──────────────────────────────────────────────────────────────────
  run_pyinstaller "arm64"
  make_dmg "arm64"
  BUILT_DMGS+=("dist/BodyBuilder-${VERSION}-arm64.dmg")

  # ── x86_64 ─────────────────────────────────────────────────────────────────
  run_pyinstaller "x86_64"
  make_dmg "x86_64"
  BUILT_DMGS+=("dist/BodyBuilder-${VERSION}-x86_64.dmg")

  # ── universal2 ─────────────────────────────────────────────────────────────
  run_pyinstaller "universal2"
  make_dmg "universal2"
  BUILT_DMGS+=("dist/BodyBuilder-${VERSION}-universal2.dmg")

elif [[ $BUILD_UNIVERSAL -eq 1 ]]; then
  run_pyinstaller "universal2"
  make_dmg "universal2"
  BUILT_DMGS+=("dist/BodyBuilder-${VERSION}-universal2.dmg")

else
  # Native arch only (no --target-arch flag = fastest build)
  run_pyinstaller ""
  make_dmg "${HOST_ARCH}"
  BUILT_DMGS+=("dist/BodyBuilder-${VERSION}-${HOST_ARCH}.dmg")
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Summary ───────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Build complete! v${VERSION}                  "
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Output files:"
for dmg in "${BUILT_DMGS[@]}"; do
  echo "  → ${dmg}  ($(du -sh "$dmg" | cut -f1))"
done
echo ""
echo "Upload all to GitHub Release:"
echo ""
echo "  gh release create v${VERSION} \\"
for i in "${!BUILT_DMGS[@]}"; do
  sep="\\"
  [[ $i -eq $((${#BUILT_DMGS[@]} - 1)) ]] && sep=""
  echo "    ${BUILT_DMGS[$i]} ${sep}"
done
echo ""
echo "  Or upload individually:"
for dmg in "${BUILT_DMGS[@]}"; do
  echo "    gh release upload v${VERSION} ${dmg}"
done
echo ""
echo "First-launch note: macOS will block unsigned apps."
echo "Users must right-click the app → Open → Open (one-time only)."
echo "See installer/FAQ.md for the full Gatekeeper walkthrough."
