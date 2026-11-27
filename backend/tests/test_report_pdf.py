"""The audit report PDF endpoint builds the branded PDF once from the run's recording and serves the cached file."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from kavach.api import app as api
from kavach.models import RunSummary
from kavach.orchestrator.events import EventBus


def _handle(run_id: str, report: str | None = "# report") -> api.RunHandle:
    h = api.RunHandle(summary=RunSummary(run_id=run_id, mode="live"), bus=EventBus(run_id), report_md=report)
    api.RUNS[run_id] = h
    return h


async def test_pdf_built_once_then_served_from_cache(settings, tmp_path, monkeypatch):
    settings.runs_dir = str(tmp_path)
    monkeypatch.setattr(api, "settings", settings)
    (tmp_path / "kv-pdf.jsonl").write_text("{}\n")
    calls: list[str] = []

    def fake_build(recording, out):
        calls.append(recording.name)
        out.write_bytes(b"%PDF-1.4 fake")

    monkeypatch.setattr(api, "_build_pdf", fake_build)
    _handle("kv-pdf")
    try:
        r1 = await api.report_pdf("kv-pdf")
        r2 = await api.report_pdf("kv-pdf")
        assert r1.path == r2.path and str(r1.path).endswith("kv-pdf.report.pdf")
        assert calls == ["kv-pdf.jsonl"]
    finally:
        api.RUNS.pop("kv-pdf", None)


async def test_pdf_not_ready_and_missing_chrome(settings, tmp_path, monkeypatch):
    settings.runs_dir = str(tmp_path)
    monkeypatch.setattr(api, "settings", settings)
    (tmp_path / "kv-nochrome.jsonl").write_text("{}\n")

    def no_chrome(recording, out):
        raise RuntimeError("chrome not found")

    monkeypatch.setattr(api, "_build_pdf", no_chrome)
    _handle("kv-early", report=None)
    _handle("kv-nochrome")
    try:
        with pytest.raises(HTTPException) as early:
            await api.report_pdf("kv-early")
        assert early.value.status_code == 404
        with pytest.raises(HTTPException) as chrome:
            await api.report_pdf("kv-nochrome")
        assert chrome.value.status_code == 501
    finally:
        api.RUNS.pop("kv-early", None)
        api.RUNS.pop("kv-nochrome", None)
