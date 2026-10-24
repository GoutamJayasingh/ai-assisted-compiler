#!/usr/bin/env bash
# Regenerates the benchmark and re-runs every system (CPCT+ if nimbleparse is installed).
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PATH:$HOME/.cargo/bin"
python3 -m evaluation.generators.generate_dataset
python3 -m evaluation.experiments.run_experiments "$@"
