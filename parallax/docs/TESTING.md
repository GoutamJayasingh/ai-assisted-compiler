# Testing

## One command

```bash
cd parallax
./scripts/test_all.sh                    # compiler, backend, evaluation, frontend; E2E reported as SKIPPED
PARALLAX_E2E=1 ./scripts/test_all.sh     # + Playwright E2E (needs ./scripts/run_backend.sh running)
```

The script prints `PASS` / `FAIL` / `SKIPPED` for each layer and exits non-zero on any failure. A skipped layer is never reported as passed.

## Layers

| Layer | Command | Count | What it covers |
|---|---|---|---|
| Compiler unit tests (C++) | `ctest --test-dir compiler/build` (runs `parallax_tests` and a `parallaxc version` smoke test) | 66 test functions | lexer (20), parser/AST/names (22), repair engine (24) |
| Backend API (pytest) | `cd backend && python3 -m pytest` | 32 | every endpoint, schemas, error codes, timeouts, crashes, missing compiler, concurrency, grammar report, docs path safety, live evaluation |
| Evaluation + error catalog (pytest) | `python3 -m pytest evaluation/tests` | 71 (10 metric/dataset + 61 catalog cases) | metric definitions, Wilson/bootstrap, τ rule, split by family, dataset reproducibility, every catalog expectation |
| Frontend unit (vitest) | `cd frontend && npx vitest run` | 24 | positions, diff, lexer-rule lookup, API client errors and aborts, navigation, accept/undo, stale responses, evaluation rendering; fixtures are **real captured backend responses** |
| Frontend typecheck | `cd frontend && npx tsc -b` | — | strict TypeScript |
| End-to-end (Playwright) | `cd frontend && node tests/e2e/run-e2e.mjs` | 12 checks | real compiler + backend + built UI: sample loading, RECOMMENDED repair, accept/confirm/undo, refresh persistence, token highlighting with the Flex rule, LR items, abstention on an ambiguous case, hypothesis stability, AST compare, evaluation page, guided demo, no page errors |

## Latest recorded outcome

Run on 2026-10-24 (Linux, g++ 13.3, Bison 3.8.2, Flex 2.6.4, Python 3.13.17, Node 22.22, Chromium via the preinstalled Playwright):

| Layer | Passed | Failed | Skipped |
|---|---|---|---|
| C++ (`parallax_tests`) | 66 | 0 | 0 |
| ctest entries | 2 | 0 | 0 |
| Backend API | 32 | 0 | 0 |
| Evaluation + catalog | 71 | 0 | 0 |
| Frontend unit | 24 | 0 | 0 |
| End-to-end | 12 | 0 | 0 |

**Not implemented:** a fuzzing campaign, cross-browser E2E (Chromium only), Windows-native testing, tests on macOS.

## Regression tests from bugs found during development

| Bug | Regression test |
|---|---|
| Stop-at-first parsing could report a second diagnostic after error recovery shifted `error ;` | `parser_panic_mode_recovers_multiple_errors` |
| yacc.c compiled as C++ could not grow its stack, so nesting failed at depth 200 | `parser_deep_nesting_hits_resource_limit_without_crashing` |
| asyncio semaphore bound to one event loop deadlocked concurrent requests in tests | `test_concurrent_requests_do_not_interfere` |
| dataset generator glued tokens when deleting (`f(x` → `fx`) | `test_glue_detection`, `test_dataset_generation_is_reproducible` |
| `true`/`false` insertions were not counted as invented content | `repair_missing_identifier_abstains_with_low_confidence`, catalog S10 |
| repaired text spelled `while ( x` after inserting `(` | catalog S04 |
| diff paired the wrong lines for inline highlighting | covered by `lineDiff` tests and visual check |
| mobile topbar overflow (horizontal scroll at 390 px) | checked with Playwright screenshots (scrollWidth = viewport) |

## Performance and robustness

- Benchmark: 900 cases × 6 Parallax configurations + diagnostics + 2 CPCT+ replicates in about 28 s on 4 CPUs. Per case, Parallax averages 306 parser invocations and about 10 ms of engine time (p95 about 28 ms).
- Pathological input: 6000 nested parentheses reach the parser stack limit and are reported; 64 KB inputs are accepted; larger inputs are rejected with 413.
- Determinism: the C++ test `repair_is_deterministic` compares two full JSON reports (timings stripped). A full evaluation re-run reproduced every Parallax metric exactly.
