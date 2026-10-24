"""Systems compared in the evaluation (baselines and ablations).

Every system is a real invocation of parallaxc; nothing is simulated.
  A  raw parser diagnostics (first Bison error, no repair)
  B  panic-mode recovery (Bison `error` productions; all diagnostics)
  C  local least-cost repair (cost-only ranking, first-found tie-break,
     no grouping, no layout/stability evidence, no abstention)
  D  Parallax without AST grouping
  E  Parallax without follow-on stability evidence
  F  Parallax without abstention (forced top-1)
  L  Parallax without layout evidence (extra ablation)
  P  Parallax (full)
  G  CPCT+ (optional, external; see baselines/cpctplus_adapter.py)
"""
from __future__ import annotations

SYSTEMS = [
    {"id": "A", "name": "Raw parser diagnostics", "mode": "analyze", "family": "diagnostic",
     "description": "First syntax error reported by the Bison parser; no repair."},
    {"id": "B", "name": "Panic-mode recovery", "mode": "analyze", "family": "diagnostic",
     "description": "Bison error productions (sync on ';' and '}'); reports every recovered diagnostic, no repair."},
    {"id": "C", "name": "Local least-cost repair", "mode": "repair", "family": "repair",
     "args": ["--strategy", "least-cost"], "abstains": False,
     "description": "Same bounded candidate space; ranks by edit cost only, ties by generation order; greedy for later errors; never abstains."},
    {"id": "D", "name": "Parallax w/o AST grouping", "mode": "repair", "family": "repair",
     "args": ["--no-grouping"], "abstains": True,
     "description": "Margins are computed between individual candidates instead of AST equivalence classes."},
    {"id": "E", "name": "Parallax w/o stability evidence", "mode": "repair", "family": "repair",
     "args": ["--no-stability"], "abstains": True,
     "description": "Residual-diagnostic, cascade and completion features removed from the score."},
    {"id": "F", "name": "Parallax w/o abstention", "mode": "repair", "family": "repair",
     "args": ["--no-abstention"], "abstains": False,
     "description": "Forced top-1: always returns the best plan."},
    {"id": "L", "name": "Parallax w/o layout evidence", "mode": "repair", "family": "repair",
     "args": ["--no-layout"], "abstains": True,
     "description": "No layout-informed generators and no line-end / indentation / duplicate evidence."},
    {"id": "P", "name": "Parallax (full)", "mode": "repair", "family": "repair",
     "args": [], "abstains": True,
     "description": "Evidence ranking + AST grouping + hypothesis lanes + abstention."},
]

REPAIR_SYSTEMS = [s for s in SYSTEMS if s["family"] == "repair"]
BY_ID = {s["id"]: s for s in SYSTEMS}
