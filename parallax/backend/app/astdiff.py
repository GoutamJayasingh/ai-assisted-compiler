"""Structural comparison of two ASTs (as serialised by parallaxc).

Equality is defined on the canonical form: node kind + attributes + ordered
children, ignoring source spans. This matches the C++ canonical_form used for
AST grouping, so "equivalent" here means "same AST class" in the engine.
"""
from __future__ import annotations

ATTRS = ("type", "name", "op", "value", "array")


def canonical(node: dict | None) -> str:
    if node is None:
        return "null"
    parts = [node["kind"]]
    for a in ATTRS:
        if node.get(a):
            v = str(node[a])
            parts.append(f"{a}={len(v)}:{v}")
    parts.extend(canonical(c) for c in node.get("children", []))
    return "(" + " ".join(parts) + ")"


def label(node: dict) -> str:
    bits = [node["kind"]]
    for a in ATTRS:
        if node.get(a):
            bits.append(f"{a}={node[a]}")
    return " ".join(bits)


def _lcs(a: list[str], b: list[str]) -> list[tuple[int, int]]:
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            dp[i][j] = dp[i + 1][j + 1] + 1 if a[i] == b[j] else max(dp[i + 1][j], dp[i][j + 1])
    out, i, j = [], 0, 0
    while i < n and j < m:
        if a[i] == b[j]:
            out.append((i, j))
            i += 1
            j += 1
        elif dp[i + 1][j] >= dp[i][j + 1]:
            i += 1
        else:
            j += 1
    return out


def diff(a: dict | None, b: dict | None, path: str = "Program", limit: int = 200) -> list[dict]:
    """Returns a list of changes turning AST `a` into AST `b`."""
    changes: list[dict] = []

    def emit(kind, p, x=None, y=None, detail=""):
        if len(changes) < limit:
            changes.append({"change": kind, "path": p, "before": label(x) if x else None,
                            "after": label(y) if y else None, "detail": detail,
                            "before_span": x.get("span") if x else None, "after_span": y.get("span") if y else None})

    def walk(x, y, p):
        if canonical(x) == canonical(y):
            return
        if x["kind"] != y["kind"]:
            emit("replaced", p, x, y)
            return
        attr_changes = [f"{k}: {x.get(k)!r} -> {y.get(k)!r}" for k in ATTRS if x.get(k) != y.get(k)]
        if attr_changes:
            emit("changed", p, x, y, "; ".join(attr_changes))
        xc, yc = x.get("children", []), y.get("children", [])
        ca, cb = [canonical(c) for c in xc], [canonical(c) for c in yc]
        anchors = _lcs(ca, cb) + [(len(xc), len(yc))]
        i = j = 0
        for ai, bj in anchors:
            gx, gy = list(range(i, ai)), list(range(j, bj))
            # pair unmatched children of equal kind positionally, recurse into them
            while gx and gy:
                u, v = gx[0], gy[0]
                if xc[u]["kind"] == yc[v]["kind"]:
                    walk(xc[u], yc[v], f"{p}/{xc[u]['kind']}[{u}]")
                    gx.pop(0)
                    gy.pop(0)
                elif len(gx) >= len(gy):
                    emit("removed", f"{p}/{xc[u]['kind']}[{u}]", xc[u], None)
                    gx.pop(0)
                else:
                    emit("added", f"{p}/{yc[v]['kind']}[{v}]", None, yc[v])
                    gy.pop(0)
            for u in gx:
                emit("removed", f"{p}/{xc[u]['kind']}[{u}]", xc[u], None)
            for v in gy:
                emit("added", f"{p}/{yc[v]['kind']}[{v}]", None, yc[v])
            i, j = ai + 1, bj + 1

    if a is None or b is None:
        return changes
    walk(a, b, path)
    return changes
