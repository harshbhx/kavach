# Changelog

## Unreleased

### Added
- `LYZR_CALL_BUDGET`: a per-run cap on Lyzr calls. Lyzr bills credits per call; past the cap the agents answer from their offline fallbacks and the run still finishes. `GET /api/health` reports the cap.
- `AUTO_PDF` (on by default): the branded PDF audit report is built in the background when a live run ends, so the dashboard PDF button is instant. Needs Chrome.
- `run.started` carries `approval_required`; the dashboard header says whether a person approves each patch or patches ship automatically, and names an Agent37 sandbox target.
- Gallery run 11: the recording with a person in the loop.
- `pnpm referee` and `pnpm check:backend`; `pnpm bootstrap` and `pnpm demo` no longer need `make`.

### Changed
- Every number in a Referee message is formatted from code. The model may add one short comment, dropped if it contains digits. This fixes messages like "Final utility: 1.0%" for 100%.
- Attack batches in more reply shapes are accepted (attacks keyed by name, or a list under an unknown key), so fewer batches fall back to the library.
- The dashboard's PDF button shows **Building PDF** while it waits and explains a missing Chrome. The Human approval checkbox is remembered per browser.

## 0.1.0-beta.1 (28 Nov 2026)

First public beta.

### Added
- Human approval as an option: a **Human approval** checkbox in the dashboard, `require_approval` on `POST /api/runs`, and `@Referee approve v2` or `@Referee reject v2 because ...` in the Band room. Off by default, so runs stay fully automated. See `docs/APPROVAL.md`.
- Branded PDF audit report served by the API (`GET /api/runs/{id}/report.pdf`) and a PDF button in the dashboard, built with the existing `scripts/build_report_pdf.py` template. See `docs/REPORTS.md`.
- Two recorded runs in the gallery: run 9 (both skill packs loaded) and run 10 (target on an Agent37 sandbox), plus `runs/demo_approval.jsonl`, the first recording with a person in the loop.
- New docs: Human approval, Audit reports, Agent37, Setup on Windows and Recorded runs.

### Fixed
- `pnpm dev` dropped `APPROVAL_REQUIRED` and `APPROVAL_TIMEOUT_S`, so approval never turned on under Turbo. Both are now passed through.
- The Agent37 deploy script killed its own remote shell, so the target never started while `/health` still answered. It now frees the port with `fuser -k` and starts the server with `setsid`.
- Patcher and Injector replies containing regex escapes such as `\s` or `\d` no longer fail to parse, and a dead target stops the run at once (PRs 21 and 23).

### Honest limits
- One run at a time; state is in memory plus JSONL.
- The skill packs are in the Finch skill format but are not published on the Finch market (publishing needs a signing wallet).
- AdaL was not run on this repo; the integration is `.adal/skills/` and `AGENTS.md`.
- One of eleven recordings used Agent37; the rest used a local target.
