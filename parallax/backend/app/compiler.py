"""Async, sandboxed invocation of the parallaxc binary.

* argument arrays only (no shell), source on stdin — no injection surface;
* no temporary files, so concurrent requests cannot race on shared paths;
* a hard timeout per call (the process is killed on expiry);
* a semaphore bounds concurrent compiler processes;
* failures map to typed exceptions that the API turns into distinct
  HTTP statuses (compiler missing vs. timeout vs. crash).
"""
from __future__ import annotations

import asyncio
import json
import os
import time
import weakref
from dataclasses import dataclass

from .config import Settings


class CompilerError(Exception):
    code = "COMPILER_FAILURE"
    http_status = 500

    def __init__(self, message: str, hint: str | None = None):
        super().__init__(message)
        self.message = message
        self.hint = hint


class CompilerUnavailable(CompilerError):
    code = "COMPILER_UNAVAILABLE"
    http_status = 503


class CompilerTimeout(CompilerError):
    code = "COMPILER_TIMEOUT"
    http_status = 504


class InputTooLarge(CompilerError):
    code = "INPUT_TOO_LARGE"
    http_status = 413


BUILD_HINT = ("Build the compiler first: cmake -S compiler -B compiler/build && "
              "cmake --build compiler/build (see docs/INSTALLATION_AND_TROUBLESHOOTING.md)")


@dataclass
class CompilerResult:
    doc: dict
    wall_ms: float


class CompilerRunner:
    def __init__(self, settings: Settings):
        self.settings = settings
        # asyncio primitives bind to the loop that first waits on them; keep
        # one semaphore per running loop so the runner is safe to share
        # (uvicorn uses one loop; test clients may use several).
        self._sems: weakref.WeakKeyDictionary = weakref.WeakKeyDictionary()

    def _semaphore(self) -> asyncio.Semaphore:
        loop = asyncio.get_running_loop()
        sem = self._sems.get(loop)
        if sem is None:
            sem = self._sems[loop] = asyncio.Semaphore(self.settings.max_concurrency)
        return sem

    def available(self) -> bool:
        p = self.settings.compiler_path
        return p.is_file() and os.access(p, os.X_OK)

    async def run(self, mode: str, source: str, args: list[str] | None = None,
                  timeout_s: float | None = None) -> CompilerResult:
        if not self.available():
            raise CompilerUnavailable("The parallaxc compiler binary was not found or is not executable.", BUILD_HINT)
        data = source.encode("utf-8")
        if len(data) > self.settings.max_input_bytes:
            raise InputTooLarge(f"Input is {len(data)} bytes; the limit is {self.settings.max_input_bytes} bytes.")
        timeout = timeout_s or self.settings.timeout_s
        cmd = [str(self.settings.compiler_path), mode, *(args or [])]
        async with self._semaphore():
            start = time.perf_counter()
            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd, stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE)
            except OSError as exc:
                raise CompilerUnavailable(f"The compiler could not be started ({exc.strerror}).", BUILD_HINT) from exc
            try:
                out, err = await asyncio.wait_for(proc.communicate(data), timeout=timeout)
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                raise CompilerTimeout(f"The compiler did not finish within {timeout:g} s and was stopped.",
                                      "Try a smaller input or lower search limits.")
            wall = (time.perf_counter() - start) * 1000
        if proc.returncode == 3:
            raise InputTooLarge("The compiler rejected the input as too large.")
        if proc.returncode != 0:
            raise CompilerError(f"The compiler exited with status {proc.returncode}.",
                                "This is an internal compiler failure, not a problem with your MiniC code.")
        try:
            doc = json.loads(out.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise CompilerError("The compiler produced output that is not valid JSON.") from exc
        if "error" in doc and "mode" not in doc:
            raise CompilerError(doc["error"].get("message", "compiler usage error"))
        return CompilerResult(doc=doc, wall_ms=wall)

    async def version(self) -> dict | None:
        try:
            return (await self.run("version", "", timeout_s=5)).doc
        except CompilerError:
            return None
