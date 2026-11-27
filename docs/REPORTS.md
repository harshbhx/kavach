# Audit reports

Every run turns into an audit report. There are two formats, and both are built from the run's own recording, so every number is the run's number.

| Format | What it is | Where |
|---|---|---|
| Markdown | The full report as text: summary, rounds, findings by OWASP LLM Top 10 risk, each patch, the hardened prompt | `runs/<id>.report.md`, the dashboard's Audit report view, `GET /api/runs/{id}/report.md` |
| PDF | The same report as a branded four-page A4 document you can hand to someone | the **PDF** button on the Audit report view, `GET /api/runs/{id}/report.pdf`, or the script below |

## The PDF template

There is one template, `scripts/build_report_pdf.py`, and everything uses it. The script needs only the Python standard library plus Google Chrome (headless print-to-PDF), so it works on a laptop without extra installs. The report has four pages: a cover with the verdict and the breach rate round by round, the rounds and what was attacked, the evidence by rule and OWASP risk, and the patch with the hardened prompt, the skill packs used and the SHA-256 of the recording the report came from.

```bash
uv run python scripts/build_report_pdf.py runs/demo_run.jsonl docs/Kavach-Audit-Report.pdf
```

With no arguments it reads `runs/demo_run.jsonl` (or the bundled sample if there is none) and writes `docs/Kavach-Audit-Report.pdf`. Set `KAVACH_KEEP_HTML=1` to keep the page the PDF was printed from, for debugging.

## From the dashboard and the API

Once a run has finished, the Audit report view shows two buttons: **PDF** and **Markdown**. The PDF button calls:

```text
GET /api/runs/RUN_ID/report.pdf
```

When a live run ends, the API builds the PDF in the background from `runs/RUN_ID.jsonl` and caches it next to the recording as `runs/RUN_ID.report.pdf` (set `AUTO_PDF=false` to turn this off). The build takes about 30 seconds because it starts Chrome. If you press PDF before it is done, the button shows **Building PDF** and waits for the same build, never starting a second one. Later calls return the cached file at once. Cached PDFs are gitignored.

| Response | Meaning |
|---|---|
| `200` | the PDF |
| `404` | the report is not ready yet, or the recording is missing |
| `501` | Chrome was not found on the machine running the API |

Replayed recordings in the hosted demo have no PDF endpoint, because there is no API behind the static site. For those, use the committed PDFs in `docs/`: `Kavach-Audit-Report.pdf` is the headline run and `Kavach-Audit-Report-sample.pdf` is the offline sample.

## Reports for every new run

Use the same template every time: run `scripts/build_report_pdf.py` on the recording, or press PDF on the dashboard. Do not hand-edit a report. If a number looks wrong, fix the run or the scoring code and rebuild.
