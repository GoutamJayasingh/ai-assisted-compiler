#!/usr/bin/env bash
# Captures real backend responses used as frontend unit-test fixtures.
# Requires the backend running on :8000.
set -euo pipefail
cd "$(dirname "$0")/.."
out=frontend/tests/unit/fixtures
for ex in 02_missing_semicolon 07_ambiguous_operator; do
  python3 -c "import json,sys;print(json.dumps({'source':open('examples/$ex.mc').read()}))" |
    curl -sf localhost:8000/api/repair -H 'content-type: application/json' -d @- > "$out/repair_$ex.json"
done
curl -sf localhost:8000/api/examples > "$out/examples.json"
curl -sf localhost:8000/api/health > "$out/health.json"
echo "fixtures written to $out"
