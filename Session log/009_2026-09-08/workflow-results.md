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

## Bite 3 — draft steps 6.7 + 6.8 (G14) — launched 2026-09-08 America/New_York (founder: "next bite")
- args: {"groups": ["G14"], "stage": "draft", "steps": ["6.7", "6.8"]}
- Briefs: orchestrator decision 24 (6.7 FOUNDER paste `9997_surveys_head_of_house.sql` and, case B, `9996_account_archival.sql`
  + ledger, depends_on 6.1a/6.3a, 6.4 and 6.5 depend on it; 6.8 FOUNDER+AGENT production release — Play closed test → production,
  App Store review, 14-day closed-test rule; depends_on 6.4/6.5/6.6/6.7). Bite 2's fixer note: 6.7 should say "paste every file the
  ledger does not list".
- Run: wf_8ad6021c-76a (task wlcp34na6). Outcome: completed, 0 failures. 6.7 written (founder, S, 1146-word checklist, 6 done_when);
  6.8 written (founder+agent, M, 2615-word agent prompt + 2281-word checklist, 6 done_when). Sketches removed; 6.1d and 6.x stay as
  rejected proposals. Orchestrator added 5.9 to 6.7's depends_on (descending paste order), per the drafter's note.
  Validator (all 14 groups): 0 errors, 5 accepted warnings. Assembler: **77 steps, no unknown dependencies**, ≈304k words.
- Usage: agent_count 1, **subagent_tokens 161,541**, tool_uses 15, duration 597 s (~10 min). Fallback send_later deleted.
- Fixer notes: 6.7's verification queries use the G14 default names for 6.1a/6.3a objects — regenerate if the G2/G3 fixers rename them;
  6.8's store-policy facts (closed-test tester minimum 20→12, 14 days, review times) are unverified offline and the checklist tells the
  founder to read the Console; store badge artwork not downloaded (brand terms); countries and manual-vs-automatic App Store release are
  founder decisions recorded in HANDOFF 'Store releases'.

**Drafting complete.** Bites 1–3 total: 149,887 + 217,218 + 161,541 = **528,646 sub-agent tokens** (3 agents, ~29 min of agent time).

## Bite 4 — critique G1 + G2, fidelity lens — launched 2026-09-08 America/New_York (founder: "lets go")
- args: {"groups": ["G1", "G2"], "skipDraft": ["G1", "G2"], "stage": "critique", "lenses": ["fidelity"]}
- Two critics in parallel (one per group); findings saved to `reviews/G1.fidelity.json` and `reviews/G2.fidelity.json`.
- Run: wf_5a645d88-337 (task wcqa7uj93). Outcome: completed, 0 failures. G1: 11 findings (4 major, 7 minor; 0.1 ×6, 1.1 ×5) —
  0.1 still treats the package id as unconfirmed and the palette as neutral (decisions 17/18); 1.1 pins `@types/react ~19.1`
  against the docs' `~19.2` and its CI workflow does not use `pnpm --filter web build`. G2: 13 findings (3 major, 10 minor;
  1.2 ×2, 1.3a ×6, 1.3b ×5) — the three majors are the decision-15/21 schema corrections (archival columns, membership helpers
  treating archived users as non-members, the changed deletion RPCs) not yet in 1.2/1.3a/1.3b. No blockers.
- Usage: agent_count 2, **subagent_tokens 312,663**, tool_uses 41, duration 425 s (~7 min). Fallback send_later deleted.
- Note: the G2 majors are exactly the fixer work decision 21 assigned to the global round; the G2 reviser (bite 6) will do that
  part early since the critics wrote it up concretely.

## Next bites
- Bite 5: same groups, lenses ["executability", "completeness"] (4 critics).
- Bite 6: {"groups": ["G1", "G2"], "skipDraft": ["G1", "G2"], "stage": "revise"}.
- Then `workflow-global.js` in bites.
