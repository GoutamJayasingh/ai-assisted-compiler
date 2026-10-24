# Presentation outline (10–12 minutes)

1. **Problem (1 min).** “Syntax error at line 4” — but the mistake is on line 3, and five different fixes all parse.
2. **Idea (1 min).** Many hypotheses, one real parser, visible evidence, and the honesty to abstain.
3. **Compiler (1.5 min).** MiniC; Flex lexer with exact spans; pure Bison parser with LAC (exact expected tokens), `%expect 0`, panic-mode recovery; arena AST with a canonical form.
4. **Repair pipeline (2 min).** Generate (window + layout + pairs) → validate twice (token stream and source round trip) → 13 evidence features → AST classes → hypothesis lanes → decision with τ.
5. **Live demo (4 min).** DEMO_SCRIPT.md: missing `;` → evidence → grouping → two errors → ambiguous operator → missing name → accept/undo.
6. **Evaluation (1.5 min).** 900 seeded cases, split by program; baselines incl. real CPCT+. Top-1 71.5% vs 55.2% vs ≈48%; wrong-confident 6.1% vs 28.5%.
7. **Negative results (0.5 min).** Stability evidence ≈ 0 effect; τ did not fully transfer (12% vs 10%); keyword deletions fool the model.
8. **Limits and future work (0.5 min).** Syntax only; synthetic data; real-student study; learned and calibrated weights.
