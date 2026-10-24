# Decision log

| # | Decision | Alternatives considered | Reason |
|---|---|---|---|
| D1 | Build everything in a new `parallax/` directory on `feature/parallax-syntax-repair` | rewrite the existing repository files | keeps unrelated work intact; clean architecture |
| D2 | Lexer produces a token **vector**; the parser reads from it | Flex feeding Bison directly | repair needs to parse edited token streams and to re-lex rebuilt source; this keeps lexer and parser independent and re-entrant |
| D3 | Bison `yacc.c` skeleton compiled as C++ | `lalr1.cc` with variants | `parse.error custom` + LAC + `yypcontext_expected_tokens` are mature in yacc.c; an arena makes variants unnecessary |
| D4 | `parse.lac full` | default (no LAC) | exact expected-token sets; otherwise default reductions corrupt the candidate vocabulary |
| D5 | Expression precedence as grammar levels; one `%precedence` pair for the dangling else; `%expect 0` | `%left/%right` declarations | precedence visible in the rules; any new conflict fails the build |
| D6 | Assignment is a statement | assignment expression | LALR(1) without tricks; `=`/`==` confusions become detectable |
| D7 | Arena-owned tagged AST | class hierarchy + `unique_ptr` children | no leaks under error recovery; generic walks for JSON, canonical form, diff |
| D8 | `YYINITDEPTH = YYMAXDEPTH = 5000` | Bison's trivially-copyable flags | yacc.c-as-C++ cannot relocate stacks with a custom location type (the 4-field default initialiser does not compile); found by the deep-nesting test |
| D9 | Byte offsets + code-point columns in the compiler; UTF-16 conversion in the UI | UTF-16 everywhere | the compiler works on bytes; one exact conversion point (`OffsetMap`) |
| D10 | Validate candidates twice (token stream, then source round trip) | token-level only | guarantees that a token-index edit lands at the intended source position |
| D11 | Progress criterion N = 3 tokens past the edit **and** past the original error | Burke–Fisher-style N only | otherwise an edit before the error that leaves it in place would be “accepted” |
| D12 | Cost-2 search only when no single edit works | always search pairs | iterative deepening on cost keeps the search small; the trade-off is documented |
| D13 | Linear, hand-set evidence weights | learned model | interpretability; small data; avoids pretending to have calibrated probabilities |
| D14 | Margin threshold τ selected on dev | fixed τ; probability calibration | an objective, reproducible rule; no calibration data to justify probabilities |
| D15 | Distance prior only for window/pair edits | for all edits | layout-generated edits are far away by design and have their own evidence (dev analysis showed missing-brace repairs were penalised) |
| D16 | Indentation-mismatch feature computed on the **repaired AST** | token-level indentation heuristics | measures whether the resulting block structure agrees with the layout |
| D17 | Arity checks in name evidence | none | `f(a b)`: `+` vs `,` tie on cost; arity resolves it (dev analysis) |
| D18 | Placeholders (`__hole`, `0`, `true`) are explicit and lower confidence | silently invent names | never pretend to know missing content |
| D19 | `UNSUPPORTED` tokens for C constructs | treat as invalid characters | “this is C, not MiniC” is a better message than an invented repair |
| D20 | Split the benchmark by program family | random split by case | avoids near-duplicate leakage |
| D21 | Freeze the model before the first test run (commit `03331c0`) | iterate on test | honest held-out estimate |
| D22 | Run the real CPCT+ via `nimbleparse` with an equivalent grammar and an identical token stream (one token per line) | cite CPCT+ numbers from the paper | a comparable measurement; replicate runs because of non-deterministic ties |
| D23 | CodeMirror 6 editor | Monaco | Monaco's default loader fetches from a CDN (the offline requirement); CodeMirror bundles cleanly and is light |
| D24 | Hand-written SVG charts | a chart library | small bundle; full control of accessibility and colours; palette checked with a colour validator |
| D25 | The backend serves the built UI | separate static server | one process and one port for demos |
| D26 | Per-event-loop semaphore in the backend runner | module-level semaphore | asyncio primitives bind to one loop; tests revealed a deadlock |
| D27 | Error catalog as executable data that generates its observed column | hand-written observed results | documentation cannot drift from behaviour |
| D28 | Persist the editor draft in browser storage | no persistence | a page refresh should not lose work; best effort only |
