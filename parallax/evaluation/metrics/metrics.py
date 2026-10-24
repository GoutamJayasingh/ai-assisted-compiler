"""Metric definitions (see docs/EVALUATION_PROTOCOL.md for the formal text).

All functions are pure and deterministic; randomness (bootstrap) takes an
explicit seed.
"""
from __future__ import annotations

import math
import random
from statistics import mean, median
from typing import Callable, Iterable, Sequence

INF = float("inf")


def wilson(k: int, n: int, z: float = 1.959964) -> tuple[float | None, float | None]:
    """Wilson score 95% interval for a binomial proportion k/n."""
    if n == 0:
        return (None, None)
    p = k / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return (max(0.0, centre - half), min(1.0, centre + half))


def proportion(flags: Sequence[bool]) -> dict:
    n = len(flags)
    k = sum(1 for f in flags if f)
    lo, hi = wilson(k, n)
    return {"k": k, "n": n, "rate": (k / n) if n else None, "ci95": [lo, hi]}


def paired_bootstrap_diff(a: Sequence[float], b: Sequence[float], seed: int = 7, reps: int = 2000) -> dict:
    """Mean difference mean(a) - mean(b) over paired cases with a percentile CI."""
    assert len(a) == len(b)
    n = len(a)
    if n == 0:
        return {"diff": None, "ci95": [None, None]}
    rng = random.Random(seed)
    diffs = []
    for _ in range(reps):
        idx = [rng.randrange(n) for _ in range(n)]
        diffs.append(sum(a[i] - b[i] for i in idx) / n)
    diffs.sort()
    return {
        "diff": sum(x - y for x, y in zip(a, b)) / n,
        "ci95": [diffs[int(0.025 * reps)], diffs[int(0.975 * reps) - 1]],
        "reps": reps,
        "seed": seed,
    }


def summary_stats(values: Iterable[float]) -> dict:
    v = sorted(x for x in values if x is not None)
    if not v:
        return {"mean": None, "median": None, "p95": None, "max": None, "n": 0}
    p95 = v[min(len(v) - 1, int(math.ceil(0.95 * len(v))) - 1)]
    return {"mean": mean(v), "median": median(v), "p95": p95, "max": v[-1], "n": len(v)}


def risk_coverage(confidence: Sequence[float], correct: Sequence[bool]) -> dict:
    """Risk-coverage curve when predictions are accepted in order of
    decreasing confidence. Ties are broken by case order (stable sort), which
    is deterministic. Returns the curve and AURC = mean risk over all
    coverage levels k/N, k = 1..N (lower is better).
    """
    n = len(confidence)
    order = sorted(range(n), key=lambda i: -confidence[i])
    errors = 0
    curve = []
    for k, i in enumerate(order, start=1):
        if not correct[i]:
            errors += 1
        curve.append({"coverage": k / n, "risk": errors / k})
    aurc = sum(p["risk"] for p in curve) / n if n else None
    # Oracle ordering (all correct first) gives the best achievable AURC for
    # the same set of predictions; reported for context.
    n_correct = sum(1 for c in correct if c)
    oracle = 0.0
    for k in range(1, n + 1):
        oracle += max(0, k - n_correct) / k
    oracle = oracle / n if n else None
    return {"aurc": aurc, "oracle_aurc": oracle, "curve": downsample(curve, 50)}


def downsample(curve: list[dict], points: int) -> list[dict]:
    if len(curve) <= points:
        return curve
    step = len(curve) / points
    out = [curve[int(i * step)] for i in range(points)]
    out.append(curve[-1])
    return out


def status_at_tau(status: str, margin: float | None, tau: float) -> str:
    """Re-applies the margin threshold offline.

    In the C++ policy (repair_engine.cpp, Engine::decide) every status other
    than RECOMMENDED / MULTIPLE_PLAUSIBLE is decided before the margin test,
    so only those two depend on tau, and exactly through `margin < tau`.
    """
    if status not in ("RECOMMENDED", "MULTIPLE_PLAUSIBLE"):
        return status
    if margin is None or margin >= tau:
        return "RECOMMENDED"
    return "MULTIPLE_PLAUSIBLE"


def choose_tau(rows: list[dict], grid: Sequence[float], target_risk: float,
               is_correct: Callable[[dict], bool]) -> dict:
    """Largest-coverage tau whose selective risk on `rows` is <= target.

    Falls back to the tau with the lowest selective risk if no tau meets the
    target. Only ever called on the DEV split.
    """
    table = []
    for tau in grid:
        rec = [r for r in rows if status_at_tau(r["status"], r["margin"], tau) == "RECOMMENDED"]
        wrong = sum(1 for r in rec if not is_correct(r))
        cov = len(rec) / len(rows) if rows else 0
        risk = wrong / len(rec) if rec else 0.0
        table.append({"tau": tau, "coverage": cov, "selective_risk": risk, "recommended": len(rec), "wrong": wrong})
    ok = [t for t in table if t["recommended"] > 0 and t["selective_risk"] <= target_risk]
    if ok:
        best = max(ok, key=lambda t: (t["coverage"], -t["tau"]))
        rule = f"max coverage s.t. dev selective risk <= {target_risk}"
    else:
        best = min(table, key=lambda t: (t["selective_risk"], -t["coverage"]))
        rule = "no tau met the target; minimum dev selective risk"
    return {"tau": best["tau"], "rule": rule, "table": table}
