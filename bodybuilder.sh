#!/usr/bin/env zsh
# BodyBuilder server management script
# Usage: source bodybuilder.sh   (functions available in shell)
# Or:    ./bodybuilder.sh start|stop|restart|status|logs

# Resolve the backend directory relative to this script — works from any location
BB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-${(%):-%x}}")" && pwd)/backend"
BB_PID="/tmp/bodybuilder.pid"
BB_LOG="/tmp/bodybuilder.log"

function bb-start() {
  if [ -f "$BB_PID" ] && kill -0 "$(cat $BB_PID)" 2>/dev/null; then
    echo "BodyBuilder is already running (PID $(cat $BB_PID))"
    echo "  Open: http://localhost:8000"
    return 1
  fi
  echo "Starting BodyBuilder..."
  (
    cd "$BB_DIR"
    source venv/bin/activate
    nohup uvicorn main:app --host 127.0.0.1 --port 8000 > "$BB_LOG" 2>&1 &
    echo $! > "$BB_PID"
  )
  sleep 1
  if kill -0 "$(cat $BB_PID)" 2>/dev/null; then
    echo "BodyBuilder started (PID $(cat $BB_PID))"
    echo "  Open: http://localhost:8000"
    echo "  Logs: tail -f $BB_LOG"
  else
    echo "Failed to start — check logs: $BB_LOG"
    return 1
  fi
}

function bb-stop() {
  if [ -f "$BB_PID" ] && kill -0 "$(cat $BB_PID)" 2>/dev/null; then
    kill "$(cat $BB_PID)"
    rm -f "$BB_PID"
    echo "BodyBuilder stopped"
  else
    local pid
    pid=$(pgrep -f "uvicorn main:app" 2>/dev/null | head -1)
    if [ -n "$pid" ]; then
      kill "$pid"
      rm -f "$BB_PID"
      echo "BodyBuilder stopped (PID $pid)"
    else
      echo "BodyBuilder is not running"
    fi
  fi
}

function bb-restart() {
  echo "Restarting BodyBuilder..."
  bb-stop
  sleep 1
  bb-start
}

function bb-status() {
  if [ -f "$BB_PID" ] && kill -0 "$(cat $BB_PID)" 2>/dev/null; then
    echo "BodyBuilder is running (PID $(cat $BB_PID)) — http://localhost:8000"
  else
    echo "BodyBuilder is not running"
  fi
}

function bb-logs() {
  if [ -f "$BB_LOG" ]; then
    tail -f "$BB_LOG"
  else
    echo "No log file found at $BB_LOG"
  fi
}

# Allow direct invocation: ./bodybuilder.sh start|stop|restart|status|logs
case "${1:-}" in
  start)   bb-start   ;;
  stop)    bb-stop    ;;
  restart) bb-restart ;;
  status)  bb-status  ;;
  logs)    bb-logs    ;;
  "")      ;;  # sourced — functions available in shell
  *)       echo "Usage: $0 {start|stop|restart|status|logs}" ;;
esac
