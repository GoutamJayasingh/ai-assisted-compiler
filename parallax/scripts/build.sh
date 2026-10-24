#!/usr/bin/env bash
# Builds the compiler (Flex/Bison/C++) and the frontend production bundle.
set -euo pipefail
cd "$(dirname "$0")/.."
cmake -S compiler -B compiler/build -DCMAKE_BUILD_TYPE=Release
cmake --build compiler/build -j"$(nproc 2>/dev/null || echo 2)"
if [ -d frontend/node_modules ]; then
  (cd frontend && npm run build)
else
  echo "frontend/node_modules missing: run 'cd frontend && npm ci' to build the UI" >&2
fi
