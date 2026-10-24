"""Optional CPCT+ baseline (G) via grmtools' `nimbleparse`.

CPCT+ (Diekmann & Tratt, "Don't Panic! Better, Fewer, Syntax Errors for LR
Parsers", ECOOP 2020) is implemented in the Rust grmtools project. This
adapter runs the real tool; it never fabricates output.

Setup (documented in docs/INSTALLATION_AND_TROUBLESHOOTING.md):
    cargo install nimbleparse        # tested with nimbleparse 0.15.0

Fairness measures
* The grammar (cpctplus/minic.y) has the same productions as the Bison
  grammar, without actions and without panic-mode `error` rules.
* Both systems see the SAME token stream: we lex with parallaxc, then write
  one canonical token per line (lexical-error and unsupported tokens become
  `@BAD@`, a token the grammar never accepts). Hence line N = token N-1.
* nimbleparse reports, at each error, the set of minimal-cost repair
  sequences it found. We replay sequence #1 at every error as CPCT+'s
  top-1 output, and sequences #2/#3 at the first error for top-3.
  (Assumption, stated in the docs: the first listed sequence is the one
  grmtools continues parsing with; later error points are reported after
  that repair.)
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent / "cpctplus"
GRAMMAR = HERE / "minic.y"
LEXER = HERE / "minic.l"
TESTED_VERSION = "nimbleparse 0.15.0 (crates.io)"

ERROR_RE = re.compile(r"^Parsing error at line (\d+) column (\d+)\. Repair sequences found:")
SEQ_RE = re.compile(r"^\s+(\d+): (.*)$")

PLACEHOLDER = {"IDENT": "__hole", "INT_LIT": "0", "FLOAT_LIT": "0.0", "CHAR_LIT": "'?'"}
SPELLING = {
    "INT": "int", "FLOAT": "float", "CHAR": "char", "BOOL": "bool", "VOID": "void", "IF": "if", "ELSE": "else",
    "WHILE": "while", "FOR": "for", "RETURN": "return", "BREAK": "break", "CONTINUE": "continue",
    "TRUE": "true", "FALSE": "false", "PLUS": "+", "MINUS": "-", "STAR": "*", "SLASH": "/", "PERCENT": "%",
    "ASSIGN": "=", "EQ": "==", "NE": "!=", "LT": "<", "LE": "<=", "GT": ">", "GE": ">=", "AND": "&&", "OR": "||",
    "NOT": "!", "LPAREN": "(", "RPAREN": ")", "LBRACE": "{", "RBRACE": "}", "LBRACKET": "[", "RBRACKET": "]",
    "SEMI": ";", "COMMA": ",", **PLACEHOLDER,
}


def _exe() -> str | None:
    return shutil.which("nimbleparse") or (
        str(Path.home() / ".cargo" / "bin" / "nimbleparse")
        if (Path.home() / ".cargo" / "bin" / "nimbleparse").is_file() else None)


def availability() -> dict:
    exe = _exe()
    if not exe:
        return {"available": False, "reason": "nimbleparse not installed (cargo install nimbleparse)"}
    if not (GRAMMAR.is_file() and LEXER.is_file()):
        return {"available": False, "reason": "grmtools-format MiniC grammar files are missing"}
    return {"available": True, "reason": None, "tool": "nimbleparse", "tested_version": TESTED_VERSION}


def normalise(tokens: list[dict]) -> str:
    """One canonical token per line; error/unsupported tokens -> @BAD@."""
    out = []
    for t in tokens:
        out.append("@BAD@" if t["kind"] in ("ERROR", "UNSUPPORTED") else t["lexeme"])
    return "\n".join(out) + "\n"


def run_tool(text: str, timeout: float = 30.0) -> tuple[list[dict], float]:
    """Runs nimbleparse; returns ([{token_index, sequences: [[op, arg], ...]}], wall_ms)."""
    exe = _exe()
    if not exe:
        raise RuntimeError("nimbleparse not available")
    with tempfile.TemporaryDirectory(prefix="px-cpct-") as d:  # private, unique per call
        path = Path(d) / "input.mc"
        path.write_text(text, encoding="utf-8")
        start = time.perf_counter()
        proc = subprocess.run([exe, "-y", "original", "-q", str(LEXER), str(GRAMMAR), str(path)],
                              capture_output=True, text=True, timeout=timeout)
        wall = (time.perf_counter() - start) * 1000
    errors: list[dict] = []
    for line in (proc.stdout + "\n" + proc.stderr).splitlines():
        m = ERROR_RE.match(line)
        if m:
            errors.append({"token_index": int(m.group(1)) - 1, "sequences": []})
            continue
        m = SEQ_RE.match(line)
        if m and errors:
            ops = []
            for part in m.group(2).split(", "):
                op, _, arg = part.partition(" ")
                ops.append((op, arg))
            errors[-1]["sequences"].append(ops)
    return errors, wall


def replay(lexemes: list[str], errors: list[dict], first_choice: int = 0) -> list[str] | None:
    """Applies one repair sequence per error point to the token list.

    Uses sequence `first_choice` at the first error and sequence 0 later.
    Returns None if a sequence cannot be replayed consistently.
    """
    out: list[str] = []
    i = 0
    for k, err in enumerate(errors):
        seqs = err["sequences"]
        choice = first_choice if k == 0 else 0
        if choice >= len(seqs):
            return None
        target = err["token_index"]
        if target < i:  # error inside a region already consumed by a previous sequence
            continue
        out.extend(lexemes[i:target])
        i = target
        for op, arg in seqs[choice]:
            if op == "Insert":
                out.append(SPELLING.get(arg, arg))
            elif op == "Delete":
                if i >= len(lexemes):
                    return None
                i += 1
            elif op == "Shift":
                if i >= len(lexemes):
                    return None
                out.append(lexemes[i])
                i += 1
            else:
                return None
    out.extend(lexemes[i:])
    return out


def apply_first(lexemes: list[str], err: dict, choice: int) -> list[str] | None:
    """Applies only sequence `choice` at the first error point."""
    one = {"token_index": err["token_index"], "sequences": [err["sequences"][choice]]}
    return replay(lexemes, [one], 0)


def run(tokens: list[dict], timeout: float = 30.0) -> dict:
    """Full baseline result for one case (token dicts from `parallaxc lex`).

    plans[0]: sequence #1 at every error (what CPCT+ itself does).
    plans[1..2]: sequence #2/#3 at the first error, then the tool is re-run on
    that partially repaired stream so later repairs are CPCT+'s own choices
    for that prefix (not ones computed for a different prefix).
    """
    lexemes = ["@BAD@" if t["kind"] in ("ERROR", "UNSUPPORTED") else t["lexeme"] for t in tokens]
    errors, wall = run_tool(normalise(tokens), timeout)
    plans: list[list[str]] = []
    if errors:
        first = replay(lexemes, errors, 0)
        if first is not None:
            plans.append(first)
        for choice in range(1, min(3, len(errors[0]["sequences"]))):
            partial = apply_first(lexemes, errors[0], choice)
            if partial is None:
                continue
            text = "\n".join(partial) + "\n"
            later, _ = run_tool(text, timeout)
            rep = replay(partial, later, 0) if later else partial
            if rep is not None:
                plans.append(rep)
    return {"errors": errors, "plans": plans, "wall_ms": wall}
