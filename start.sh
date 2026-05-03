#!/bin/bash
# BodyBuilder — Start Script
# Starts the Python FastAPI backend; open frontend/index.html in your browser

echo ""
echo "  💪 BodyBuilder"
echo "  ─────────────────────────────────────"
echo "  Backend API:  http://localhost:8000"
echo "  Frontend:     Open frontend/index.html in your browser"
echo "                OR visit http://localhost:8000"
echo "  API Docs:     http://localhost:8000/docs"
echo "  ─────────────────────────────────────"
echo ""

# Go to the backend directory
cd "$(dirname "$0")/backend"

# Install dependencies if not already installed
if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "Installing Python dependencies..."
  pip3 install -r requirements.txt
fi

# Start the backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
