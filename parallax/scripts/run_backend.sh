#!/usr/bin/env bash
# Starts the API (and serves frontend/dist if it has been built) on :8000.
set -euo pipefail
cd "$(dirname "$0")/../backend"
exec python3 -m uvicorn app.main:app --host 127.0.0.1 --port "${PORT:-8000}"
