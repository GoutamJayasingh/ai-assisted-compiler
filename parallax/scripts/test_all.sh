#!/usr/bin/env bash
# Runs every test layer and prints a summary. Exits non-zero on any failure.
# Layers that cannot run (missing tool) are reported as SKIPPED, not passed.
set -uo pipefail
cd "$(dirname "$0")/.."
declare -a SUMMARY
status=0
run() {
  local name="$1"; shift
  echo "==> $name"
  if "$@"; then SUMMARY+=("PASS     $name"); else SUMMARY+=("FAIL     $name"); status=1; fi
}
skip() { SUMMARY+=("SKIPPED  $1 ($2)"); }

run "compiler build" cmake --build compiler/build -j2
run "compiler unit tests (ctest)" ctest --test-dir compiler/build --output-on-failure
run "backend API tests (pytest)" bash -c "cd backend && python3 -m pytest -q"
run "evaluation tests (pytest)" python3 -m pytest -q evaluation/tests
if [ -d frontend/node_modules ]; then
  run "frontend typecheck" bash -c "cd frontend && npx tsc -b"
  run "frontend unit tests (vitest)" bash -c "cd frontend && npx vitest run"
else
  skip "frontend tests" "frontend/node_modules missing"
fi
if [ "${PARALLAX_E2E:-0}" = "1" ]; then
  run "end-to-end (playwright)" bash -c "cd frontend && npm run build && node tests/e2e/run-e2e.mjs"
else
  skip "end-to-end" "set PARALLAX_E2E=1 with the backend running on :8000"
fi
echo
printf '%s\n' "${SUMMARY[@]}"
exit $status
