# Session 009 — workflow runs (sub-agent bites)

## Bite 1 — draft step 2.7 (G6) — launched 2026-09-08 America/New_York
- args: {"groups": ["G6"], "stage": "draft", "steps": ["2.7"]}
- Brief: orchestrator decision 24 (hosted smoke test script `scripts/web/smoke-hosted.sh` + GitHub Actions job on
  `workflow_dispatch` / `deployment_status`; merges G6's 2.7 and G10's 3.12; 3.7a depends on it).
- `workflow-groups.js` gained the "adopted proposal → full step, delete the sketch" rule for `steps` runs.
- Run: wf_ee7d615c-780 (task wtkszspcq). Outcome: completed, 0 failures. Step 2.7 written (agent, S, depends_on ['2.5'],
  2966 words, 8 done_when); the 2.7 sketch was removed from `proposed_additional_steps`; 4 new open_issues (check ids H01…T01,
  `--checkpoint A|B`, `.github/workflows/deploy-smoke.yml`, repo variables `PRODUCTION_URL`/`SMOKE_CHECKPOINT`, port 3100 shared
  with 3.7a; `docs/DEPLOY.md` may be created by 2.7 before 2.6; Vercel GitHub-integration assumption; deploy-smoke is
  blocking-visible, unlike 1.1's informational ci job — orchestrator may flip). Validator: 0 errors, 1 pre-existing warning (2.3).
  Assembler: 73 steps; the only unknown dependency left is 6.7 (from 6.4/6.5).
- Usage: agent_count 1, **subagent_tokens 149,887**, tool_uses 16, duration 423 s (~7 min). Fallback send_later deleted.
- Fixer notes for the global round (from the drafter): 2.6, 3.9 and 3.10 should call `scripts/web/smoke-hosted.sh <URL> --checkpoint B`
  instead of hand-typed curl lists; 3.9's checklist flips `SMOKE_CHECKPOINT` to `B`; 2.6/3.8 say `docs/DEPLOY.md` may already exist.

## Bite 2 — draft steps 5.8 + 5.9 (G13) — launched 2026-09-08 America/New_York (founder: "next bite")
- args: {"groups": ["G13"], "stage": "draft", "steps": ["5.8", "5.9"]}
- Briefs: orchestrator decision 24 (5.8 web join landing `/join/[code]` + QR + App Link, agent M; 5.9 FOUNDER Checkpoint D incl.
  paste of `9998_join_codes.sql` + ledger, founder M, depends_on 5.7c and 5.8).
- Run: wf_21a029e0-ad1 (task w5qmwoshb). Outcome: completed, 0 failures. 5.8 written (agent, M, depends_on 5.6b/5.6c/5.7a,
  3117 words, 5 done_when); 5.9 written (founder, M, depends_on 5.7c/5.8, 1622-word checklist, 5 done_when). Both sketches removed
  from `proposed_additional_steps`; stale 'proposed 5.9/5.10' open_issues rewritten as RESOLVED. Validator 0 errors, 1 pre-existing
  warning (5.6a). Assembler: 75 steps; only unknown dependency left is 6.7.
- Usage: agent_count 1, **subagent_tokens 217,218**, tool_uses 25, duration 732 s (~12 min). Fallback send_later deleted.
- Decisions the drafter left to the orchestrator/founder: 5.8 uses an in-repo QR encoder + `jsqr` test-only devDependency (alternative:
  runtime `qrcode` library); `/join/[code]` shows no church name (anonymous RLS, no existence leak) — a rate-limited lookup is a
  possible follow-up. Fixer notes: 5.7a/5.7c mentions of 'proposed 5.9' → step 5.8; 6.7's 'normally still to paste' → 'every file
  the ledger does not list'; 6.5 flips `PLAY_LISTING.live`; 5.9 item 19 needs a non-member test account (`+test` alias).

## Next bites
- Bite 3: {"groups": ["G14"], "stage": "draft", "steps": ["6.7", "6.8"]}
- Then: critique + revise G1 and G2; then `workflow-global.js`.
