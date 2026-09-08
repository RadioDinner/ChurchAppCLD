# Session 009 — workflow runs (sub-agent bites)

## Bite 1 — draft step 2.7 (G6) — launched 2026-09-08 America/New_York
- args: {"groups": ["G6"], "stage": "draft", "steps": ["2.7"]}
- Brief: orchestrator decision 24 (hosted smoke test script `scripts/web/smoke-hosted.sh` + GitHub Actions job on
  `workflow_dispatch` / `deployment_status`; merges G6's 2.7 and G10's 3.12; 3.7a depends on it).
- `workflow-groups.js` gained the "adopted proposal → full step, delete the sketch" rule for `steps` runs.
- Outcome: (pending)
