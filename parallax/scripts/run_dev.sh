#!/usr/bin/env bash
# Development mode: API on :8000 and Vite dev server (hot reload) on :5173.
set -euo pipefail
cd "$(dirname "$0")/.."
(cd backend && python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload) &
API=$!
trap 'kill $API' EXIT
cd frontend && npm run dev
