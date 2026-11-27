"""The scoreboard sums the recorded runs from their own events."""

from __future__ import annotations

from kavach.config import REPO_ROOT
from kavach.scoreboard import markdown, scoreboard, summarize_run

GALLERY = REPO_ROOT / "runs" / "gallery"


def test_every_gallery_run_summarizes():
    files = sorted(GALLERY.glob("*.jsonl"))
    rows = [summarize_run(p) for p in files]
    assert files and all(rows)
    head = next(r for r in rows if r.file == "demo1.jsonl")
    assert head.model.endswith("gpt-oss-20b") and head.rounds == 3
    assert head.trend[0] > 0.8 and head.final_breach == 0 and head.verdict == "hardened"
    assert head.tth_seconds is not None and head.utility == 1.0


def test_models_are_grouped_and_sorted():
    board = scoreboard(GALLERY)
    models = board["models"]
    assert sum(m["runs"] for m in models) == len(board["runs"])
    assert [m["first_breach_avg"] for m in models] == sorted(
        (m["first_breach_avg"] for m in models), reverse=True
    )
    table = markdown(board)
    assert table.startswith("| Victim model |") and "gpt-oss-20b" in table


def test_sample_approval_run_has_a_rejection():
    row = summarize_run(REPO_ROOT / "runs" / "sample_approval_run.jsonl")
    assert row and row.vetoes >= 2 and row.verdict == "hardened"


def test_missing_or_empty_files(tmp_path):
    assert summarize_run(tmp_path / "nope.jsonl") is None
    (tmp_path / "empty.jsonl").write_text("", encoding="utf-8")
    assert summarize_run(tmp_path / "empty.jsonl") is None
    assert scoreboard(tmp_path) == {"runs": [], "models": []}
