"""Reproducible MiniC syntax-error benchmark generator.

Every case is derived from a hand-written VALID program (a "family") by
injecting one or two token-level mutations with a fixed seed. Each case keeps
the original source, the corrupted source, the injected edit(s), the reference
correction (the inverse edit), its category and an a-priori ambiguity label.

Splits are made by FAMILY (whole source program), never by mutated variant,
so no program contributes cases to both the tuning (dev) and test splits.

Usage (from the parallax/ directory):
    python -m evaluation.generators.generate_dataset
"""
from __future__ import annotations

import hashlib
import json
import random
import sys
from collections import Counter
from pathlib import Path

from evaluation.lib import compiler

ROOT = Path(__file__).resolve().parents[1]
PROGRAMS = ROOT / "programs"
OUT = ROOT / "dataset"

CONFIG = {
    "seed": 20261024,
    "single_mutations_per_program": 24,
    "multi_mutations_per_program": 6,
    "multi_min_token_distance": 10,
    "dev_fraction": 0.4,
    "max_attempts_per_case": 60,
    # Relative weights of single-mutation categories.
    "category_weights": {
        "missing-semicolon": 4,
        "missing-rparen": 3,
        "missing-lparen": 2,
        "missing-rbrace": 2,
        "missing-lbrace": 2,
        "missing-comma": 2,
        "missing-rbracket": 1,
        "missing-operator": 2,
        "missing-identifier": 2,
        "missing-literal": 1,
        "missing-keyword": 2,
        "duplicate-delimiter": 3,
        "extra-token": 2,
        "invalid-character": 1,
        "wrong-delimiter": 2,
        "wrong-operator": 2,
        "keyword-typo": 1,
        "transposition": 2,
    },
}

DELETE_KIND = {
    "missing-semicolon": {"SEMI"},
    "missing-rparen": {"RPAREN"},
    "missing-lparen": {"LPAREN"},
    "missing-rbrace": {"RBRACE"},
    "missing-lbrace": {"LBRACE"},
    "missing-comma": {"COMMA"},
    "missing-rbracket": {"RBRACKET"},
    "missing-operator": {"PLUS", "MINUS", "STAR", "SLASH", "PERCENT", "ASSIGN", "EQ", "NE", "LT", "LE", "GT",
                         "GE", "AND", "OR"},
    "missing-identifier": {"IDENT"},
    "missing-literal": {"INT_LIT", "FLOAT_LIT", "CHAR_LIT", "TRUE", "FALSE"},
    "missing-keyword": {"INT", "FLOAT", "CHAR", "BOOL", "VOID", "IF", "ELSE", "WHILE", "FOR", "RETURN"},
}
DUPLICABLE = {"SEMI", "RPAREN", "LPAREN", "RBRACE", "LBRACE", "COMMA"}
EXTRA_TOKENS = [";", ")", "(", "}", "{", ",", "=", "+", "*", "int", "return"]
INVALID_CHARS = ["@", "$", "`"]
WRONG_DELIM = {";": [",", ":"], ",": [";", "."], ")": ["]", "}"], "(": ["[", "{"], "{": ["(", "["],
               "}": [")", "]"], "]": [")"], "[": ["("]}
WRONG_OP = {"==": ["="], "=": ["=="], "&&": ["&"], "||": ["|"], "<=": ["=<"], ">=": ["=>"], "!=": ["!"],
            "+": ["++"], "-": ["--"]}
KEYWORD_TYPOS = {"while": "whlie", "return": "retrun", "int": "itn", "if": "fi", "for": "fro", "else": "esle",
                 "float": "flaot", "bool": "boll"}
OPERATORS = DELETE_KIND["missing-operator"]


def ambiguity(category: str, removed_kind: str | None) -> str:
    """A-priori ambiguity label, assigned from the mutation alone."""
    if category in ("missing-identifier", "missing-literal"):
        return "content-lost"
    if category == "missing-keyword":
        return "content-lost"
    if category in ("missing-operator", "wrong-operator"):
        return "operator-choice"
    if category == "keyword-typo":
        return "content-lost"
    return "structural"


def lex(source: str) -> list[dict]:
    doc = compiler.run("lex", source)
    if "_failure" in doc:
        raise RuntimeError(doc["_failure"])
    return doc["tokens"]


def analyze(source: str) -> dict:
    doc = compiler.run("analyze", source)
    if "_failure" in doc:
        raise RuntimeError(doc["_failure"])
    return doc


def glue(a: bytes, b: bytes) -> bool:
    """True if bytes a and b would lex as one token when made adjacent."""
    word = lambda c: c.isalnum() or c in b"_'."
    op = lambda c: c in b"=<>!&|+-*/%"
    return bool(a and b) and ((word(a) and word(b)) or (op(a) and op(b)))


def splice(src: str, start: int, end: int, text: str) -> str:
    """Replaces the byte range [start, end) of `src` (UTF-8) with `text`."""
    b = src.encode("utf-8")
    return (b[:start] + text.encode("utf-8") + b[end:]).decode("utf-8")


def mutate(src: str, toks: list[dict], category: str, rng: random.Random, lo: int = 0, hi: int | None = None):
    """Applies one mutation of `category` to a token index in [lo, hi).

    Returns (new_source, edit_record) or None if no eligible position exists.
    The record's `site` is the token index of the error in the CORRUPTED
    token stream (for a deletion, the gap where the token is missing).
    """
    hi = len(toks) if hi is None else hi
    idx = list(range(lo, hi))
    rng.shuffle(idx)

    def rec(op, i, removed=None, inserted=None, site=None):
        t = toks[i] if i < len(toks) else None
        return {
            "op": op,
            "category": category,
            "token_index": i,
            "removed": removed,
            "inserted": inserted,
            "site": i if site is None else site,
            "line": t["start"]["line"] if t else None,
            "column": t["start"]["column"] if t else None,
        }

    if category in DELETE_KIND:
        for i in idx:
            t = toks[i]
            if t["kind"] in DELETE_KIND[category]:
                s, e = t["start"]["offset"], t["end"]["offset"]
                b = src.encode("utf-8")
                filler = ""
                if s > 0 and e < len(b) and b[s - 1:s] == b" " and b[e:e + 1] == b" ":
                    e += 1  # avoid leaving two spaces where one token used to be
                elif s > 0 and e < len(b) and glue(b[s - 1:s], b[e:e + 1]):
                    filler = " "  # "f(x" minus "(" must not become the identifier "fx"
                r = rec("delete", i, removed=t["lexeme"])
                r["removed_kind"] = t["kind"]
                return splice(src, s, e, filler), r
        return None
    if category == "duplicate-delimiter":
        for i in idx:
            t = toks[i]
            if t["kind"] in DUPLICABLE:
                e = t["end"]["offset"]
                return splice(src, e, e, t["lexeme"]), rec("insert", i + 1, inserted=t["lexeme"], site=i + 1)
        return None
    if category in ("extra-token", "invalid-character"):
        for i in idx:
            if i == 0:
                continue
            text = rng.choice(EXTRA_TOKENS if category == "extra-token" else INVALID_CHARS)
            e = toks[i - 1]["end"]["offset"]
            return splice(src, e, e, " " + text), rec("insert", i, inserted=text, site=i)
        return None
    if category == "wrong-delimiter":
        for i in idx:
            t = toks[i]
            if t["lexeme"] in WRONG_DELIM:
                new = rng.choice(WRONG_DELIM[t["lexeme"]])
                r = rec("replace", i, removed=t["lexeme"], inserted=new)
                return splice(src, t["start"]["offset"], t["end"]["offset"], new), r
        return None
    if category == "wrong-operator":
        for i in idx:
            t = toks[i]
            if t["lexeme"] in WRONG_OP:
                new = rng.choice(WRONG_OP[t["lexeme"]])
                r = rec("replace", i, removed=t["lexeme"], inserted=new)
                return splice(src, t["start"]["offset"], t["end"]["offset"], new), r
        return None
    if category == "keyword-typo":
        for i in idx:
            t = toks[i]
            if t["lexeme"] in KEYWORD_TYPOS:
                new = KEYWORD_TYPOS[t["lexeme"]]
                r = rec("replace", i, removed=t["lexeme"], inserted=new)
                return splice(src, t["start"]["offset"], t["end"]["offset"], new), r
        return None
    if category == "transposition":
        for i in idx:
            if i + 1 >= hi or i + 1 >= len(toks):
                continue
            a, b = toks[i], toks[i + 1]
            if a["lexeme"] == b["lexeme"]:
                continue
            between = src.encode("utf-8")[a["end"]["offset"]:b["start"]["offset"]].decode("utf-8")
            new = b["lexeme"] + between + a["lexeme"]
            r = rec("transpose", i, removed=a["lexeme"] + " " + b["lexeme"], inserted=b["lexeme"] + " " + a["lexeme"])
            return splice(src, a["start"]["offset"], b["end"]["offset"], new), r
        return None
    raise ValueError(category)


def family_split(families: list[str], seed: int, dev_fraction: float) -> dict[str, str]:
    order = sorted(families)
    random.Random(seed).shuffle(order)
    n_dev = round(len(order) * dev_fraction)
    return {f: ("dev" if k < n_dev else "test") for k, f in enumerate(order)}


def main() -> int:
    cfg = CONFIG
    rng = random.Random(cfg["seed"])
    cats = list(cfg["category_weights"])
    weights = [cfg["category_weights"][c] for c in cats]
    programs = sorted(PROGRAMS.glob("*.mc"))
    if not programs:
        print("no programs found", file=sys.stderr)
        return 1
    split = family_split([p.stem for p in programs], cfg["seed"], cfg["dev_fraction"])
    cases = []
    rejected = Counter()
    for prog in programs:
        family = prog.stem
        original = prog.read_text(encoding="utf-8")
        ref = analyze(original)
        if not ref["parse"]["ok"]:
            raise SystemExit(f"{prog} is not a valid MiniC program")
        toks = ref["tokens"]
        ref_tokens = [t["lexeme"] for t in toks]
        seen = set()
        made = 0
        k = 0

        def emit(corrupted, edits, kind):
            nonlocal made, k
            key = hashlib.sha1(corrupted.encode()).hexdigest()
            if key in seen:
                rejected["duplicate-source"] += 1
                return False
            doc = analyze(corrupted)
            if doc["parse"]["ok"]:
                rejected["still-valid"] += 1
                return False
            seen.add(key)
            cats_ = [e["category"] for e in edits]
            amb = "structural"
            for e in edits:
                a = ambiguity(e["category"], e.get("removed_kind"))
                if a != "structural":
                    amb = a
            cases.append({
                "id": f"{family}-{k:03d}",
                "family": family,
                "split": split[family],
                "kind": kind,
                "category": cats_[0] if kind == "single" else "multi",
                "categories": cats_,
                "ambiguity": amb,
                "edits": edits,
                "site": min(e["site"] for e in edits),
                "n_errors": len(edits),
                "original": original,
                "corrupted": corrupted,
                "reference_tokens": ref_tokens,
                "reference_ast_hash": ref["parse"]["ast_hash"],
                "seed": cfg["seed"],
                "generator": "token-mutation-v1",
            })
            k += 1
            made += 1
            return True

        target = cfg["single_mutations_per_program"]
        attempts = 0
        while made < target and attempts < target * cfg["max_attempts_per_case"]:
            attempts += 1
            cat = rng.choices(cats, weights)[0]
            res = mutate(original, toks, cat, rng)
            if res is None:
                rejected["no-eligible-token"] += 1
                continue
            emit(res[0], [res[1]], "single")

        target_multi = made + cfg["multi_mutations_per_program"]
        attempts = 0
        while made < target_multi and attempts < 200:
            attempts += 1
            n = len(toks)
            gap = cfg["multi_min_token_distance"]
            if n < 2 * gap + 2:
                break
            cut = rng.randrange(gap, n - gap)
            c1, c2 = rng.choices(cats, weights, k=2)
            # mutate the later region first so earlier byte offsets stay valid
            second = mutate(original, toks, c2, rng, lo=cut + gap // 2, hi=n)
            if second is None:
                continue
            mid_src = second[0]
            first = mutate(mid_src, toks, c1, rng, lo=0, hi=cut - gap // 2)
            if first is None:
                continue
            e1, e2 = first[1], second[1]
            # convert the second site to corrupted coordinates after the first edit
            shift = {"delete": -1, "insert": 1}.get(e1["op"], 0)
            e2 = dict(e2)
            e2["site"] = e2["site"] + shift
            emit(first[0], [e1, e2], "multi")

    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / "cases.jsonl", "w", encoding="utf-8") as f:
        for c in cases:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    manifest = {
        "config": cfg,
        "programs": len(programs),
        "cases": len(cases),
        "by_split": dict(Counter(c["split"] for c in cases)),
        "by_kind": dict(Counter(c["kind"] for c in cases)),
        "by_category": dict(sorted(Counter(c["category"] for c in cases).items())),
        "by_ambiguity": dict(Counter(c["ambiguity"] for c in cases)),
        "families": {f: s for f, s in sorted(split.items())},
        "rejected_mutations": dict(rejected),
        "notes": "Synthetic token-level mutations of hand-written programs. Not real student data.",
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: manifest[k] for k in ("cases", "by_split", "by_kind", "rejected_mutations")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
