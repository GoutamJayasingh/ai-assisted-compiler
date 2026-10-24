"""Executable error catalog.

Each case states an expected behaviour. `python -m evaluation.catalog.catalog`
runs every case through parallaxc and writes the OBSERVED behaviour into
docs/ERROR_CATALOG_RESULTS.md; evaluation/tests/test_catalog.py asserts the
expectations. Nothing in the observed column is written by hand.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from evaluation.lib import compiler  # noqa: E402

M = "int main() {\n%s\n}\n"

# (id, group, description, source, expectation)
# expectation keys:
#   lex_error: substring expected in a lexical error message
#   error_at: "L:C" of the first syntax diagnostic
#   status: set of acceptable decision statuses
#   plan_contains: substring expected in the top plan source
#   valid: True if the program must parse
CASES = [
    # ---------------------------------------------------------------- lexical
    ("L01", "lexical", "illegal character", M % "  int x = 5 @ 3;", {"lex_error": "invalid character '@'"}),
    ("L02", "lexical", "unterminated block comment", "int x; /* open", {"lex_error": "unterminated block comment"}),
    ("L03", "lexical", "unterminated character literal", M % "  char c = 'a;", {"lex_error": "unterminated character literal"}),
    ("L04", "lexical", "malformed numeric literal", M % "  int x = 12abc;", {"lex_error": "digits immediately followed by letters"}),
    ("L05", "lexical", "malformed exponent", M % "  float f = 1.5e+;", {"lex_error": "malformed exponent"}),
    ("L06", "lexical", "invalid escape sequence", M % "  char c = '\\q';", {"lex_error": "invalid escape"}),
    ("L07", "lexical", "two decimal points", M % "  float f = 1.2.3;", {"lex_error": "more than one decimal point"}),
    ("L08", "lexical", "integer out of range", M % "  int x = 99999999999;", {"lex_error": "out of range"}),
    ("L09", "lexical", "keyword/identifier boundary", M % "  int intx = 1;\n  return intx;", {"valid": True}),
    ("L10", "lexical", "multi-character operators", M % "  bool b = 1 <= 2 && 3 != 4 || !(5 >= 6);\n  return 0;", {"valid": True}),
    ("L11", "lexical", "tabs and CRLF line endings", "int main() {\r\n\tint x = 1;\r\n\treturn x;\r\n}\r\n", {"valid": True}),
    ("L12", "lexical", "missing final newline", "int main() { return 0; }", {"valid": True}),
    ("L13", "lexical", "empty input", "", {"valid": True, "status": {"NO_REPAIR_NEEDED"}}),
    ("L14", "lexical", "Unicode inside comments", "// h\u00e9llo \u03bb\nint main() { return 0; }\n", {"valid": True}),
    ("L15", "lexical", "unusually long identifier (256 chars)", M % ("  int " + "a" * 256 + " = 1;"), {"lex_error": "longer than 255"}),
    ("L16", "lexical", "unsupported C construct (++)", M % "  int i = 0;\n  i++;", {"status": {"UNSUPPORTED_CONSTRUCT"}}),
    # ---------------------------------------------------------------- syntax
    ("S01", "syntax", "missing semicolon", M % "  int x = 1\n  x = 2;", {"error_at": "3:3", "status": {"RECOMMENDED"}, "plan_contains": "int x = 1;"}),
    ("S02", "syntax", "extra semicolon at top level", "int main() { return 0; };\n", {"error_at": "1:25", "status": {"RECOMMENDED"}}),
    ("S03", "syntax", "missing closing parenthesis", M % "  int x = 0;\n  if (x > 0 {\n    x = 1;\n  }", {"status": {"RECOMMENDED"}, "plan_contains": "if (x > 0) {"}),
    ("S04", "syntax", "missing opening parenthesis", M % "  int x = 0;\n  while x < 3) {\n    x = x + 1;\n  }", {"status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE"}, "plan_contains": "while (x < 3)"}),
    ("S05", "syntax", "extra closing parenthesis", M % "  int x = (1 + 2));", {"status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE"}, "plan_contains": "(1 + 2);"}),
    ("S06", "syntax", "missing closing brace at EOF", "int main() {\n  int x = 0;\n", {"error_at": "3:1", "status": {"RECOMMENDED"}}),
    ("S07", "syntax", "extra closing brace", "int main() {\n  return 0;\n}\n}\n", {"error_at": "4:1", "status": {"RECOMMENDED"}}),
    ("S08", "syntax", "missing comma in call", "int add(int a, int b) { return a + b; }\nint main() { return add(1 2); }\n", {"plan_contains": "add(1, 2)"}),
    ("S09", "syntax", "misplaced comma", M % "  int x = 1,;", {"status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE", "LOW_CONFIDENCE"}}),
    ("S10", "syntax", "missing operand", M % "  int x = 1 + ;", {"status": {"MULTIPLE_PLAUSIBLE", "LOW_CONFIDENCE"}}),
    ("S11", "syntax", "unexpected binary operator", M % "  int x = * 2;", {"status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE", "LOW_CONFIDENCE"}}),
    ("S12", "syntax", "malformed unary expression", M % "  int x = - ;", {"status": {"MULTIPLE_PLAUSIBLE", "LOW_CONFIDENCE"}}),
    ("S13", "syntax", "assignment in invalid context", M % "  int x = 0;\n  if (x = 1) { x = 2; }", {"status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE"}}),
    ("S14", "syntax", "assignment to a literal", M % "  1 = 2;", {"error_at": "2:5"}),
    ("S15", "syntax", "missing identifier in declaration", M % "  int = 5;", {"status": {"LOW_CONFIDENCE"}}),
    ("S16", "syntax", "duplicate delimiters", M % "  int x = ((1);", {"status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE"}}),
    ("S17", "syntax", "incomplete function declaration", "int main(\n", {"status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE", "LOW_CONFIDENCE"}}),
    ("S18", "syntax", "incomplete function call", M % "  f(1, 2;", {"status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE"}}),
    ("S19", "syntax", "malformed argument list", M % "  f(1,, 2);", {"status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE", "LOW_CONFIDENCE"}}),
    ("S20", "syntax", "incomplete conditional", M % "  int x = 0;\n  if (x > 0)\n", {"status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE", "LOW_CONFIDENCE"}}),
    ("S21", "syntax", "malformed for header", M % "  for (int i = 0; i < 3, i = i + 1) { }", {"error_at": "2:24", "status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE"}}),
    ("S22", "syntax", "incomplete return statement", M % "  return", {"status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE"}}),
    ("S23", "syntax", "malformed declaration (array without size)", M % "  int a[];", {"status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE", "LOW_CONFIDENCE"}}),
    ("S24", "syntax", "unexpected keyword", M % "  int x = while;", {"status": {"MULTIPLE_PLAUSIBLE", "LOW_CONFIDENCE"}}),
    ("S25", "syntax", "statement at top level (invalid order)", "x = 1;\nint main() { return 0; }\n", {"error_at": "1:1"}),
    ("S26", "syntax", "error at the beginning", "{ int main() { return 0; }\n", {"error_at": "1:1"}),
    ("S27", "syntax", "error in nested blocks", M % "  if (1) {\n    while (1) {\n      x = 1\n    }\n  }", {"status": {"RECOMMENDED"}, "plan_contains": "x = 1;"}),
    ("S28", "syntax", "two errors (missing ; and missing ))", "int f(int a, int b) {\n  int s = a + b\n  if (s > 10 {\n    s = 10;\n  }\n  return s;\n}\n", {"status": {"RECOMMENDED"}, "plan_contains": "if (s > 10) {"}),
    ("S29", "syntax", "cascading errors under panic mode", M % "  int x = (1 + ;\n  int y = 2", {"status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE", "LOW_CONFIDENCE"}}),
    ("S30", "syntax", "valid but unusual expressions", M % "  int x = - - 1;\n  bool b = !!true;\n  int y = ((((x))));\n  return x % 3 * -y;", {"valid": True}),
    ("S31", "syntax", "empty blocks and empty statements", M % "  { }\n  ;\n  while (false) { }\n  for (;;) { break; }", {"valid": True}),
    ("S32", "syntax", "dangling else", M % "  int x = 0;\n  if (x) if (x) x = 1; else x = 2;", {"valid": True}),
        # Needs >= 3 inserted tokens at one site: outside the cost-2 search bound
    # (documented limitation), so the honest outcome is NO_SAFE_REPAIR.
    ("S33", "syntax", "EOF inside an expression (needs 3+ insertions)", M % "  int x = (1 +", {"status": {"NO_SAFE_REPAIR"}}),
    ("S34", "syntax", "EOF inside an argument list (needs 3+ insertions)", "int main() { f(1, ", {"status": {"NO_SAFE_REPAIR"}}),
    ("S35", "syntax", "excessive nesting (6000 parentheses)", "int main() { return " + "(" * 6000 + "1" + ")" * 6000 + "; }", {"resource_limit": True}),
    # ---------------------------------------------------------------- repair-specific
    ("R01", "repair", "obvious single-token insertion", M % "  int x = 1\n  return x;", {"status": {"RECOMMENDED"}}),
    ("R02", "repair", "obvious deletion", M % "  int x = 1;;;\n  return x +;", {"status": {"MULTIPLE_PLAUSIBLE", "LOW_CONFIDENCE", "RECOMMENDED"}}),
    ("R03", "repair", "substitution candidate", M % "  int x = 1:\n  return x;", {"status": {"RECOMMENDED", "MULTIPLE_PLAUSIBLE", "UNSUPPORTED_CONSTRUCT"}}),
    ("R04", "repair", "several plausible repairs (missing operator)", M % "  int a = 1;\n  int b = 2;\n  int c = a b;\n  return c;", {"status": {"MULTIPLE_PLAUSIBLE"}}),
    ("R05", "repair", "structurally equivalent candidates grouped", M % "  int a = 1;\n  int b = (a + 2;\n  return b;", {"status": {"RECOMMENDED"}, "classes_lt_candidates": True}),
    ("R06", "repair", "abstention despite a parser-valid candidate", M % "  int = 5;\n  return 0;", {"status": {"LOW_CONFIDENCE"}, "has_valid_candidate": True}),
    ("R07", "repair", "search budget exhausted", M % "  int x = 1\n  x = x + 2;", {"args": ["--max-parses", "10"], "budget_exhausted": True}),
    ("R08", "repair", "missing open brace (indentation evidence)", "int main() {\n  int i = 0;\n  while (i < 10)\n    i = i + 1;\n    print(i);\n  }\n  return 0;\n}\n", {"plan_contains": "while (i < 10) {"}),
    ("R09", "repair", "repair that only defers the error is rejected", M % "  return ((1);", {"has_outcome": "defers-error"}),
    ("R10", "repair", "duplicate candidates are collapsed", M % "  return ((1);", {"duplicates": True}),
]


def run_case(case) -> dict:
    cid, group, desc, src, exp = case
    doc = compiler.run("repair", src, exp.get("args", []))
    obs: dict = {"id": cid}
    if "_failure" in doc:
        obs["failure"] = doc["_failure"]
        return obs
    r = doc["repair"]
    obs["lex_errors"] = [e["message"] for e in doc["lexical_errors"]]
    diags = doc["parse"]["diagnostics"]
    obs["valid"] = doc["parse"]["ok"]
    obs["error_at"] = f"{diags[0]['start']['line']}:{diags[0]['start']['column']}" if diags else None
    obs["resource_limit"] = doc["parse"]["resource_limit"]
    obs["status"] = r["decision"]["status"]
    obs["plan"] = r["decision"]["plans"][0]["source"] if r["decision"]["plans"] else None
    obs["plan_summary"] = r["decision"]["plans"][0]["summary"] if r["decision"]["plans"] else None
    obs["classes"] = r["counts"]["classes"]
    obs["accepted"] = r["counts"]["accepted"]
    obs["by_outcome"] = r["counts"]["by_outcome"]
    obs["budget_exhausted"] = r["budget"]["exhausted"]
    obs["has_valid_candidate"] = any(c["valid"] for c in r["candidates"])
    return obs


def check(case, obs) -> list[str]:
    """Returns a list of violated expectations (empty = as expected)."""
    exp = case[4]
    bad = []
    if "failure" in obs:
        return [f"compiler failure: {obs['failure']}"]
    if "lex_error" in exp and not any(exp["lex_error"] in m for m in obs["lex_errors"]):
        bad.append(f"lexical error containing {exp['lex_error']!r}")
    if "error_at" in exp and obs["error_at"] != exp["error_at"]:
        bad.append(f"first error at {exp['error_at']} (got {obs['error_at']})")
    if "status" in exp and obs["status"] not in exp["status"]:
        bad.append(f"status in {sorted(exp['status'])} (got {obs['status']})")
    if "plan_contains" in exp and (not obs["plan"] or exp["plan_contains"] not in obs["plan"]):
        bad.append(f"top plan contains {exp['plan_contains']!r}")
    if exp.get("valid") and not obs["valid"]:
        bad.append("program parses")
    if exp.get("resource_limit") and not obs["resource_limit"]:
        bad.append("parser resource limit reported")
    if exp.get("classes_lt_candidates") and not obs["classes"] < obs["accepted"]:
        bad.append("fewer AST classes than accepted candidates")
    if exp.get("has_valid_candidate") and not obs["has_valid_candidate"]:
        bad.append("a parser-valid candidate exists")
    if exp.get("budget_exhausted") and not obs["budget_exhausted"]:
        bad.append("budget exhausted")
    if "has_outcome" in exp and not obs["by_outcome"].get(exp["has_outcome"]):
        bad.append(f"some candidate rejected as {exp['has_outcome']}")
    if exp.get("duplicates") and not obs["by_outcome"].get("duplicate"):
        bad.append("duplicate candidates detected")
    return bad


def main() -> int:
    rows = []
    failures = 0
    for case in CASES:
        obs = run_case(case)
        bad = check(case, obs)
        failures += bool(bad)
        cid, group, desc, src, exp = case
        observed = []
        if obs.get("lex_errors"):
            observed.append("lexical: " + "; ".join(obs["lex_errors"])[:90])
        if obs.get("error_at"):
            observed.append(f"first error {obs['error_at']}")
        if obs.get("valid"):
            observed.append("parses")
        if obs.get("resource_limit"):
            observed.append("nesting limit reported")
        observed.append(f"status {obs.get('status')}")
        if obs.get("plan_summary"):
            observed.append(f"top plan: {obs['plan_summary']}")
        expected = ", ".join(f"{k}={sorted(v) if isinstance(v, set) else v}" for k, v in exp.items() if k != "args")
        rows.append((cid, group, desc, expected, "; ".join(observed), "as expected" if not bad else "MISMATCH: " + "; ".join(bad)))
    out = ["# Error catalog: observed results (generated)", "",
           "> Generated by `python -m evaluation.catalog.catalog` from real parallaxc runs. "
           "Assertions live in `evaluation/tests/test_catalog.py` (test `test_catalog_case[<id>]`).", "",
           "| ID | Group | Case | Expected | Observed | Verdict |", "|---|---|---|---|---|---|"]
    for r in rows:
        out.append("| " + " | ".join(str(x).replace("|", "\\|").replace("\n", " ") for x in r) + " |")
    out.append("")
    out.append(f"{len(rows) - failures} of {len(rows)} cases behaved as expected.")
    (ROOT / "docs" / "ERROR_CATALOG_RESULTS.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"{len(rows) - failures}/{len(rows)} as expected")
    for r in rows:
        if r[5] != "as expected":
            print(r[0], r[5], "|", r[4])
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
