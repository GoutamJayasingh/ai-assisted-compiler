"""Reads the real grammar artefacts produced by the build:

* compiler/grammar/minic.y  - the grammar source shown in the UI;
* compiler/build/parser.output - Bison's report (rules, LR states, items).

Nothing here is hand-maintained: if the grammar changes and the compiler is
rebuilt, the UI shows the new rules and states.
"""
from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

RULE_RE = re.compile(r"^\s+(\d+)\s+(\S+):\s*(.*)$")
ALT_RE = re.compile(r"^\s+(\d+)\s+\|\s*(.*)$")
STATE_RE = re.compile(r"^State (\d+)$")
ACTION_RE = re.compile(r"^\s+(\S+(?: \S+)*?)\s{2,}(shift|reduce|go to|accept|error)(.*)$")


def grammar_rules_section(grammar_file: Path) -> str:
    text = grammar_file.read_text(encoding="utf-8")
    parts = text.split("\n%%\n")
    return parts[1].strip() + "\n" if len(parts) >= 2 else text


@lru_cache(maxsize=4)
def parse_report(path_str: str, mtime: float) -> dict:
    """Parses parser.output. Cached per (path, mtime)."""
    lines = Path(path_str).read_text(encoding="utf-8", errors="replace").splitlines()
    rules: list[dict] = []
    states: dict[int, dict] = {}
    section = None
    lhs = None
    current = None
    for line in lines:
        if line.startswith("Grammar"):
            section = "grammar"
            continue
        m = STATE_RE.match(line)
        if m:
            section = "state"
            current = {"number": int(m.group(1)), "items": [], "actions": []}
            states[current["number"]] = current
            lhs = None
            continue
        if section == "grammar":
            if line and not line.startswith(" "):
                section = None
                continue
            m = RULE_RE.match(line)
            if m:
                lhs = m.group(2)
                rules.append({"number": int(m.group(1)), "lhs": lhs, "rhs": m.group(3).strip()})
                continue
            m = ALT_RE.match(line)
            if m and lhs:
                rules.append({"number": int(m.group(1)), "lhs": lhs, "rhs": m.group(2).strip()})
        elif section == "state" and current is not None:
            m = RULE_RE.match(line)
            if m and ("." in m.group(3) or "•" in m.group(3)):
                lhs = m.group(2)
                current["items"].append({"rule": int(m.group(1)), "lhs": lhs, "rhs": m.group(3).strip()})
                continue
            m = ALT_RE.match(line)
            if m and lhs and ("." in m.group(2) or "•" in m.group(2)):
                current["items"].append({"rule": int(m.group(1)), "lhs": lhs, "rhs": m.group(2).strip()})
                continue
            m = ACTION_RE.match(line)
            if m:
                current["actions"].append({"on": m.group(1).strip(), "action": (m.group(2) + m.group(3)).strip()})
    return {"rules": rules, "states": states}


def load_report(path: Path) -> dict | None:
    if not path.is_file():
        return None
    return parse_report(str(path), path.stat().st_mtime)


def state_info(report: dict | None, number: int | None) -> dict | None:
    if report is None or number is None or number < 0:
        return None
    st = report["states"].get(number)
    if st is None:
        return None
    return {"number": number, "items": st["items"], "actions": st["actions"][:40],
            "actions_truncated": len(st["actions"]) > 40}
