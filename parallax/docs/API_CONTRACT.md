# API contract

Base path `/api`. Every request and response body is JSON. The compiler JSON uses `schema_version: "1"`. Interactive OpenAPI docs: `http://127.0.0.1:8000/docs` (FastAPI).

## Envelope

Endpoints that run the compiler return:

```json
{
  "run_id": "hex uuid",
  "kind": "lex | parse | analyze | repair | compare | evaluate",
  "api_version": "1.0.0",
  "input_sha256": "sha256 of the source (or null)",
  "backend_ms": 17.3,
  "compiler_ms": 12.9,
  "data": { "...compiler document..." }
}
```

## Errors

Every failure has a non-2xx status and the body:

```json
{ "run_id": "…", "error": { "code": "…", "message": "…", "hint": "… or null", "details": [ … ] } }
```

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `INVALID_CASE_ID`, `INVALID_DOC_NAME` | malformed path parameter |
| 404 | `NOT_FOUND`, `STATE_NOT_FOUND`, `RESULTS_NOT_FOUND`, `DATASET_NOT_FOUND`, `CASE_NOT_FOUND`, `DOC_NOT_FOUND` | missing resource |
| 413 | `INPUT_TOO_LARGE` | source > 64 KB (characters, or bytes after UTF-8 encoding), or body > 1 MB |
| 422 | `MALFORMED_JSON` | body is not JSON |
| 422 | `INVALID_REQUEST` | schema violation (`details` lists fields) |
| 500 | `COMPILER_FAILURE` | compiler exited abnormally or wrote invalid JSON (not a user error) |
| 500 | `BACKEND_FAILURE` | unexpected backend exception (type only; no internals) |
| 503 | `COMPILER_UNAVAILABLE` | binary missing or not executable; `hint` gives the build command |
| 504 | `COMPILER_TIMEOUT` | compiler exceeded the timeout (default 15 s) and was killed |

**Invalid MiniC is not an error.** A syntax error is data: HTTP 200 with `parse.ok = false` and diagnostics. No error response ever contains absolute paths.

## Endpoints

### `GET /api/health`
`{status: "ok"|"degraded", api_version, compiler: {available, binary: "parallaxc", version}, hint}`

### `GET /api/capabilities`
Limits (`max_input_bytes`, `timeout_s`, `max_concurrency`, `max_nesting`), modes, repair options, `grammar_report_available`, `evaluation_results_available`, and `optional_baselines.cpctplus = {available, reason, tool?, tested_version?}`.

### `GET /api/examples`
`{examples: [{id, title, category, description, why, expected_status, source}], note}` — the bundled programs from `examples/`.

### `POST /api/lex`
Request `{source: string}`. Data:

```json
{ "schema_version": "1", "mode": "lex",
  "input": {"bytes", "lines", "sha", "crlf_line_breaks", "tabs", "non_ascii_bytes", "final_newline"},
  "tokens": [{"index", "kind", "category", "lexeme", "start", "end", "value?", "message?"}],
  "comments": [{"kind": "line|block", "start", "end"}],
  "eof": {"offset", "line", "column"},
  "lexical_errors": [{"index", "kind", "lexeme", "message", "start", "end"}],
  "timing_ms": {"lex"} }
```

A position is `{offset (UTF-8 bytes, 0-based), line (1-based), column (1-based, code points)}`; `end` is exclusive.

### `POST /api/parse` and `POST /api/analyze`
Request `{source, trace?: bool}` (`trace` only for `/parse`). Data = the lex fields plus:

```json
"parse": {
  "ok", "accepted", "resource_limit",
  "diagnostics": [{"token_index", "unexpected", "unexpected_lexeme", "expected": ["SEMI", …],
                   "expected_spelling": [";", …], "parser_state", "message", "bison_message", "start", "end"}],
  "ast": AstNode | null, "recovered_ast": AstNode | null,
  "ast_hash?", "ast_nodes?", "ast_depth?", "ast_text?", "name_warnings?",
  "trace?": [string], "trace_truncated?": bool },
"parser_state_info": {"number", "items": [{"rule", "lhs", "rhs"}], "actions": [{"on", "action"}], "actions_truncated"} | null,
"grammar_report_available": bool
```

`AstNode = {kind, type?, name?, op?, value?, array?, span: {start, end, tokens: "b..e"}, children: AstNode[]}`

### `POST /api/repair`
Request:

```json
{ "source": "…",
  "options": { "strategy": "parallax|least-cost", "grouping": true, "stability": true,
               "abstention": true, "layout": true, "tau": 1.5, "max_parses": 30000, "max_depth": 4 } }
```

All options are optional. When `tau` is omitted, the backend uses the τ selected on the dev split by the last evaluation run (`tau_source: "dev-split selection"`), or 1.0 if there are no results. Data = the parse fields plus `repair`:

| Field | Content |
|---|---|
| `config` | effective engine settings |
| `error_site` | `{token_index, token, kind, start, end, expected[], parser_state, message}` or null |
| `stages[]` | `{name, status: ran\|budget-exhausted\|truncated, ms, detail}` |
| `counts` | `{generated, single_edit, two_edit, accepted, classes, by_outcome{}}` |
| `candidates[]` | ranked accepted candidates (≤ 40): `id, rank, class_id, outcome, reason, summary, cost, score, local_score, valid, roundtrip_ok, progress, edits[], source, ast_hash, next_error, residual_diagnostics[], name_warnings[], evidence[{name, group, value, weight, contribution, explanation}], ast?` (AST for the top 8) |
| `rejected[]` | deterministic sample (≤ 40): `id, outcome, reason, summary, cost, edits[], next_error` |
| `classes[]` | `{id, ast_hash, complete_ast, size, best_score, min_cost, representative, members[]}` |
| `hypotheses` | `{truncated, leaves[{id, root_class, valid, stop_reason, total_cost, score_sum, steps[], source}], stability[{token_index, token, at, hypotheses_with, hypotheses_total, stable}]}` |
| `decision` | `{status, summary, reasons[], margin (null = single class), tau, recommended_leaf, plans[{leaf, root_class, valid, total_cost, summary, source, edits[], tokens[], ast_hash?, ast? (first plan)}]}` |
| `budget` | `{parser_invocations, max_parser_invocations, elapsed_ms, time_limit_ms, exhausted}` |

`Edit = {op: insert|delete|replace, kind?, text?, placeholder?, removed_kind?, removed_text?, stream_pos, anchor_token, at: Position, cost, generator, support}`

`decision.status` ∈ `NO_REPAIR_NEEDED, RECOMMENDED, MULTIPLE_PLAUSIBLE, LOW_CONFIDENCE, NO_SAFE_REPAIR, BUDGET_EXHAUSTED, UNSUPPORTED_CONSTRUCT` (see REPAIR_ALGORITHM.md §8). Compiler failures surface as HTTP 500/503/504, never as a status inside a 200.

### `POST /api/repair/compare`
Request `{before, after}`. Data `{before: {ok, ast, ast_hash, diagnostics[]}, after: {…}, comparable, equivalent, changes[{change: added|removed|changed|replaced, path, before, after, detail, before_span, after_span}], rule}`.

### `GET /api/grammar`, `GET /api/grammar/state/{n}`
The grammar rules section (`grammar_source`), the lexer rules section (`lexer_source`), the rule list and the number of states from `parser.output`; one state's items and actions.

### `GET /api/evaluation/results`
`{summary (evaluation/results/summary.json), report_markdown, provenance: {file, generated_utc, git_commit, kind: "stored results of a full experiment run"}}`

### `GET /api/evaluation/case/{id}`
One benchmark case (`id` must match `^[a-z0-9_]+-\d{3}$`).

### `POST /api/evaluate`
Request `{split: "dev"|"test", limit: 5..120, seed}`. Runs systems A, C, F and P live on a seeded sample. Data `{kind: "live evaluation", n, seed, tau, systems[], metrics, seconds, case_ids[]}`.

### `GET /api/docs`, `GET /api/docs/{NAME}`
The Markdown documents in `docs/` and the README (`NAME` must match `^[A-Z0-9_]+$`).

## Compiler CLI (the contract underneath)

```
parallaxc lex|analyze|parse|repair|tree|version [--file PATH] [--trace]
          [--strategy parallax|least-cost] [--no-grouping] [--no-stability]
          [--no-abstention] [--no-layout] [--tau X] [--max-parses N]
          [--time-limit-ms X] [--max-depth N] [--lane-roots N] [--max-leaves N]
          [--window N] [--max-edits 1|2]
```

Exit 0 means a document was produced (including for invalid MiniC); 2 = usage error (JSON `error.code = "USAGE"`); 3 = input too large.

## Security notes

The backend uses argument arrays (no shell), passes source on stdin (no temporary files), enforces per-call timeouts and kills the process on expiry, and bounds concurrency, input size and body size. Path parameters are validated with strict regular expressions; static files are served only from inside `frontend/dist`. CORS defaults to local dev origins (`PARALLAX_CORS`).
