"""Thin, safe wrapper around the parallaxc binary used by the evaluation.

Source text is passed on stdin and options as an argument array (never via a
shell), every call has a timeout, and failures are reported as structured
dictionaries instead of exceptions so one bad case cannot abort a run.
"""
from __future__ import annotations

import json
import os
import subprocess
import time
from pathlib import Path

PARALLAX_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_BINARY = PARALLAX_ROOT / "compiler" / "build" / "parallaxc"


def binary_path() -> Path:
    return Path(os.environ.get("PARALLAXC", DEFAULT_BINARY))


def run(mode: str, source: str, args: list[str] | None = None, timeout: float = 30.0) -> dict:
    """Runs `parallaxc <mode> [args]` and returns the parsed JSON document.

    Adds `_wall_ms` (process wall time) and, on failure, `_failure`.
    """
    cmd = [str(binary_path()), mode, *(args or [])]
    start = time.perf_counter()
    try:
        proc = subprocess.run(cmd, input=source.encode("utf-8"), capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return {"_failure": "timeout", "_wall_ms": (time.perf_counter() - start) * 1000}
    except OSError as exc:
        return {"_failure": f"cannot execute compiler: {exc.strerror}", "_wall_ms": 0.0}
    wall = (time.perf_counter() - start) * 1000
    if proc.returncode not in (0, 3):
        return {"_failure": f"exit status {proc.returncode}", "_wall_ms": wall}
    try:
        doc = json.loads(proc.stdout.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return {"_failure": "invalid JSON from compiler", "_wall_ms": wall}
    doc["_wall_ms"] = wall
    return doc
