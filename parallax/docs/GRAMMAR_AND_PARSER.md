# Grammar and parser

Source: [`compiler/grammar/minic.y`](../compiler/grammar/minic.y). Generated with GNU Bison 3.8.2 (≥ 3.6 required), using the `yacc.c` skeleton compiled as C++17.

## Configuration and why

| Directive | Reason |
|---|---|
| `%define api.pure full` + `%param {ParseCtx* ctx}` | re-entrant: all state is per call; repair runs thousands of parses |
| `%locations` with `api.location.type {PxLoc}` | a location is a half-open token-index range `[b, e)`; AST spans are derived from token positions |
| `%define parse.lac full` | **exact** expected-token sets at an error, even with default reductions and LALR state merging (see the Bison manual, “LAC”); the repair engine depends on this |
| `%define parse.error custom` | structured diagnostics via `yyreport_syntax_error`: offending token, expected kinds, LR state |
| `%define parse.trace` + `YYFPRINTF` hook | Bison's own debug trace is captured in-process (bounded) for the UI's “parse progression” |
| `%expect 0` | any new conflict is a build error |
| `YYMAXDEPTH 5000`, `YYINITDEPTH YYMAXDEPTH` | bounded nesting. When yacc.c output is compiled as C++ with a custom location type, the skeleton cannot relocate its stacks, so without this the effective limit would silently be 200 (found by a test; see DECISION_LOG) |

## Grammar structure

97 rules, 168 LR states (numbers read from Bison's report `compiler/build/parser.output`, which the backend parses for the UI). The design:

- **Expression precedence through grammar levels** (`or_expr → and_expr → eq_expr → rel_expr → add_expr → mul_expr → unary → postfix → primary`). Precedence is visible in the rules themselves instead of being hidden in `%left` declarations.
- **One precedence pair** (`LOWER_THAN_ELSE` < `else`) resolves the dangling else.
- **Assignment is a statement** (`assignment: lvalue '=' expr`). LALR(1) separates `x = …` from expression statements by the lookahead `=` after an identifier or index.
- `function` is written separately for `var_type` and `void` to avoid a reduce conflict between `var_type` and `ret_type`.
- Lists (parameters, arguments, declarators, statements) accumulate children into an arena-owned node.

## Error handling: two modes

| Mode | How | Used for |
|---|---|---|
| **Stop at first** | after the first report the lexer adapter returns EOF and later reports are suppressed | candidate validation (fast, exact first error) |
| **Panic-mode recovery** | `error` productions: `stmt: error ';'`, `ext_decl: error ';' \| error '}'` | Baseline B and residual-error counts |

Panic mode follows standard Bison behaviour: pop states until one can shift `error`, discard tokens until a synchronising token (`;` or `}`) can follow, then require three successful shifts before reporting again. Later diagnostics may be cascades; the UI says so.

## Diagnostics

A `SyntaxDiagnostic` holds:

- `token_index`: the lookahead token (the stream length for EOF);
- `unexpected`: its kind;
- `expected`: the exact set from `yypcontext_expected_tokens` (LAC);
- `state`: the LR state on top of the stack (`*yyctx->yyssp`), which the backend maps to its items in `parser.output`;
- `message`: Bison's own text (`unexpected identifier`); `serialize.cpp` builds the friendlier `unexpected identifier 'x'; expected ';' or ','` (expected kinds are listed when there are at most 5).

### Expected tokens at any position

`expected_at(tokens, pos)` parses `tokens[0, pos)` and injects an invalid token at `pos` (`ctx->probe`). The resulting error report gives the exact set of kinds the parser accepts there. The repair engine uses this probe to propose only grammatical insertions and replacements at positions *before* the detection point.

## Bison's state report in the UI

`backend/app/grammar.py` parses `parser.output`: the rule list, and for each state its items (dotted rules) and actions. For an error in state *s*, the parser view shows the items of *s*, i.e. which rules the parser was in the middle of and how far each had matched. The rules and states are read from the build artefact, not maintained by hand.

## Resource limits

- Nesting deeper than 5000 stack entries → Bison calls `yyerror("memory exhausted")`; this is reported as a `resource_limit` diagnostic, not a crash (test `parser_deep_nesting_hits_resource_limit_without_crashing`: 6000 parentheses fail cleanly, 2000 succeed).
- Input size is limited to 64 KB by the CLI and the API.

## Known grammar properties

- No unresolved conflicts (`%expect 0`; build fails otherwise).
- The language is LALR(1) as written. The only precedence-resolved conflict is the dangling else.
- `break`/`continue` are accepted anywhere a statement is; restricting them to loops would be a semantic check.

## Tests

`compiler/tests/test_parser.cpp` (22 tests): valid and invalid fixtures with exact expected error positions, precedence and associativity (checked via canonical AST equality), parentheses and formatting invariance, the dangling else, `for` clauses, declarations and arrays, invalid assignment targets, exact expected tokens, the `expected_at` probe, panic-mode multi-error recovery, truncated inputs, the nesting limit, the bounded trace, re-entrancy across 32 concurrent threads, AST spans, and name resolution.
