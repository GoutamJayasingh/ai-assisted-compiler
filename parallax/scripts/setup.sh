#!/usr/bin/env bash
# One-time setup: Python and Node dependencies, then a full build.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m pip install -r backend/requirements.txt
(cd frontend && npm ci)
./scripts/build.sh
