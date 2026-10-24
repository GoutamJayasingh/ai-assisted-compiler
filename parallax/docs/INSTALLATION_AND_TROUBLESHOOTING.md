# Installation and troubleshooting

## 1. Linux (Ubuntu/Debian; the tested platform)

```bash
sudo apt-get update
sudo apt-get install -y g++ cmake bison flex python3 python3-pip nodejs npm
# Node ≥ 18 is required; if your distribution ships an older one, install Node 22 via nvm or NodeSource.

git clone <repo> && cd <repo>
git checkout feature/parallax-syntax-repair
cd parallax
./scripts/setup.sh          # pip install, npm ci, cmake build, vite build
./scripts/run_backend.sh    # http://127.0.0.1:8000
```

Use a virtual environment if your system Python is externally managed:
`python3 -m venv .venv && . .venv/bin/activate && pip install -r backend/requirements.txt`.

## 2. macOS

```bash
xcode-select --install
brew install cmake bison flex python node
export PATH="$(brew --prefix bison)/bin:$(brew --prefix flex)/bin:$PATH"   # Apple's bison is 2.3 — too old
cd parallax && ./scripts/setup.sh
```

Not tested by the authors (see TESTING.md); the code uses only portable C++17 and POSIX.

## 3. Windows

Use **WSL2 with Ubuntu** and follow the Linux steps. A native MSVC build has not been attempted: the Flex output uses `unistd.h` unless `%option nounistd` is added.

## 4. Optional: CPCT+ baseline

```bash
curl https://sh.rustup.rs -sSf | sh       # or your distribution's rustup/cargo
cargo install nimbleparse                 # tested: nimbleparse 0.15.0
export PATH="$HOME/.cargo/bin:$PATH"
./scripts/run_evaluation.sh               # now includes system G
```

Without it, everything else works. The capabilities endpoint and the evaluation report state that CPCT+ was not run, and why.

## 5. Manual build steps

```bash
cmake -S compiler -B compiler/build -DCMAKE_BUILD_TYPE=Release
cmake --build compiler/build -j
ctest --test-dir compiler/build
(cd frontend && npm ci && npm run build)
```

## 6. Configuration (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `PARALLAX_COMPILER` | `compiler/build/parallaxc` | compiler binary used by the backend |
| `PARALLAX_PARSER_REPORT` | `compiler/build/parser.output` | Bison report for LR state views |
| `PARALLAX_RESULTS` | `evaluation/results` | stored evaluation results |
| `PARALLAX_TIMEOUT_S` | 15 | per-call compiler timeout |
| `PARALLAX_MAX_CONCURRENCY` | 4 | concurrent compiler processes |
| `PARALLAX_CORS` | localhost dev origins | allowed browser origins |
| `PARALLAXC` | as above | binary used by the evaluation scripts |
| `PARALLAX_API` | `http://127.0.0.1:8000` | Vite dev-proxy target |
| `PARALLAX_URL` | `http://localhost:8000` | E2E target |

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `minic.y: error: %define variable 'parse.error' requires keyword values` or `unrecognized: custom` | Bison < 3.6 | install Bison ≥ 3.6 (macOS: Homebrew; put it first on `PATH`) |
| `Could NOT find BISON (missing: BISON_EXECUTABLE)` / `FLEX` | not installed or not on `PATH` | install; `cmake -DBISON_EXECUTABLE=/path/to/bison …` |
| `conflicts: … expected 0` at build | someone edited the grammar | resolve the conflict; `bison -Wcounterexamples` shows examples |
| UI: “Backend not reachable” | API not running / wrong port | `./scripts/run_backend.sh`; in dev, check the Vite proxy target |
| HTTP 503 `COMPILER_UNAVAILABLE` | binary not built or not executable | build the compiler; check `PARALLAX_COMPILER` |
| HTTP 504 `COMPILER_TIMEOUT` | very large or pathological input | smaller input; raise `PARALLAX_TIMEOUT_S` |
| Parser view: “Bison's report was not found” | `parser.output` missing | rebuild with CMake (it generates the report) |
| Evaluation page: “No stored evaluation results” | `summary.json` missing | `./scripts/run_evaluation.sh` |
| `npm ci` fails behind a proxy | npm proxy settings | `npm config set proxy …` / `https-proxy …` |
| `pip` refuses (PEP 668 “externally managed”) | system Python | use a virtual environment |
| `ModuleNotFoundError: evaluation` | wrong working directory | run `python -m evaluation…` from `parallax/` |
| Playwright cannot find a browser | a different Playwright version was installed | use the preinstalled one or `npx playwright install chromium` |
| Port 8000 busy | another server | `PORT=8001 ./scripts/run_backend.sh` and `PARALLAX_API=http://127.0.0.1:8001 npm run dev` |
