"""Request schemas. Responses are documented in docs/API_CONTRACT.md."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

MAX_SOURCE_CHARS = 64 * 1024  # bytes are re-checked after UTF-8 encoding


class SourceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: str = Field(..., max_length=MAX_SOURCE_CHARS, description="MiniC source text")


class ParseRequest(SourceRequest):
    trace: bool = Field(False, description="Capture Bison's shift/reduce trace (bounded)")


class RepairOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")
    strategy: Literal["parallax", "least-cost"] = "parallax"
    grouping: bool = True
    stability: bool = True
    abstention: bool = True
    layout: bool = True
    tau: float | None = Field(None, ge=-10, le=10)
    max_parses: int | None = Field(None, ge=10, le=100000)
    max_depth: int | None = Field(None, ge=1, le=6)


class RepairRequest(SourceRequest):
    options: RepairOptions = Field(default_factory=RepairOptions)


class CompareRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    before: str = Field(..., max_length=MAX_SOURCE_CHARS)
    after: str = Field(..., max_length=MAX_SOURCE_CHARS)


class EvaluateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    split: Literal["dev", "test"] = "test"
    limit: int = Field(40, ge=5, le=120)
    seed: int = Field(1, ge=0, le=1_000_000)
