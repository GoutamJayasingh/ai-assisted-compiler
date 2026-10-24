"""Runtime configuration (environment variables, safe defaults)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

PARALLAX_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    compiler_path: Path = field(default_factory=lambda: Path(
        os.environ.get("PARALLAX_COMPILER", PARALLAX_ROOT / "compiler" / "build" / "parallaxc")))
    parser_report: Path = field(default_factory=lambda: Path(
        os.environ.get("PARALLAX_PARSER_REPORT", PARALLAX_ROOT / "compiler" / "build" / "parser.output")))
    grammar_file: Path = PARALLAX_ROOT / "compiler" / "grammar" / "minic.y"
    lexer_file: Path = PARALLAX_ROOT / "compiler" / "grammar" / "minic.l"
    examples_dir: Path = PARALLAX_ROOT / "examples"
    results_dir: Path = field(default_factory=lambda: Path(
        os.environ.get("PARALLAX_RESULTS", PARALLAX_ROOT / "evaluation" / "results")))
    timeout_s: float = float(os.environ.get("PARALLAX_TIMEOUT_S", "15"))
    max_concurrency: int = int(os.environ.get("PARALLAX_MAX_CONCURRENCY", "4"))
    max_input_bytes: int = 64 * 1024
    cors_origins: tuple[str, ...] = tuple(
        o.strip() for o in os.environ.get(
            "PARALLAX_CORS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173").split(",")
        if o.strip())


def get_settings() -> Settings:
    return Settings()
