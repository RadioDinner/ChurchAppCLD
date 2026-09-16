# Session 009 — 2026-09-08 (status pass → decision memo → six single-agent bites; all 14 groups complete)

Branch: `claude/project-status-todo-plan-leghlm` (harness-assigned). The local clone was a stale shallow checkout at `ec5f2c6`;
unshallowed, verified ancestry, fast-forwarded to origin `5f77b3f`. Nothing merged to `main` (founder has not said to).
Founder pacing rule in force all day: one bite per "next bite"/"lets go", pause after each.

## What shipped (commits, oldest first)
- `3fd2ef5` status pass; HANDOFF `docs/TODO.md` State line refreshed to the real state.
- `f294ee1` **orchestrator decisions 20–29** appended to `todo-drafts/orchestrator-decisions.md`; numbering fixes applied to the
  group JSON files: stale `depends_on` (1.6a → 1.4c, 3.1 → 2.2b), migration reservations (9998/9997/9996; worked example renamed
  `9995_storage_limit.sql`), RLS test files 10–13 (6.3a → `13_account_deletion.sql`), Playwright names (`<feature>.smoke.spec.ts`,
  full specs 01–05), every proposal given a `decision` field, renumbered (5.9→5.8, 5.10→5.9, 6.1p→6.7), 4.6 promoted to a real
  step; `workflow-groups.js`, `assemble.py`, `validate.py` updated.
- `72782c0` bite 1 — step 2.7 drafted (hosted smoke test script). 149,887 tokens.
- `8408fcd` bite 2 — steps 5.8 (web join landing + QR + App Link) and 5.9 (Checkpoint D) drafted. 217,218 tokens.
- `2b7d6ac` bite 3 — steps 6.7 (Phase 3 migration paste) and 6.8 (production release) drafted; **drafting complete, 77 steps**;
  6.7 given `depends_on` 5.9. 161,541 tokens.
- `ee6ffd9` bite 4 — G1 + G2 fidelity critiques (11 + 13 findings, 0 blockers). 312,663 tokens.
- `0d188fa` bite 5 — G1 + G2 executability + completeness critiques (19 + 29 findings, 1 blocker in 1.3a). 700,909 tokens.
- `aa7543a` bite 6 — G1 + G2 revised (30 + 41 applied, 1 rejected with reason → **decision 30**); `reviews/G1.result.json`,
  `reviews/G2.result.json`; **all 14 groups drafted, critiqued and revised**. 498,904 tokens.
- `1b47e89` `workflow-global.js` **bite mode**: `stage: "review"` (subset of lenses, findings saved to
  `reviews/global.<lens>.r<round>.json`) and `stage: "fix"` (one fixer per `groups` entry reading the saved findings + a standing
  FIXER_WORKSHEET built from decisions 20–24 and 30 and G2's propagation list). No agents used.
- Record-only commits in between (bite starts, prompt history). Run ids and per-bite usage: `workflow-results.md`.

**Session sub-agent total: 2,041,122 tokens (6 bites, 11 agents, ~69 min of agent time).**

## State at wrap
- `docs/TODO.md` still not generated. Validator over G1–G14: 0 errors, 5 accepted warnings (decision 26/30). Assembler dry run:
  77 steps, ~312k words, no duplicate ids, no unknown dependencies.
- The decision-15/21 schema (archival columns and RPCs, `srv_claim_notifications(org_id, max_rows)`, `srv_load_unlocked_share_link`,
  `set_head_of_house`, system-group guard, `calendars.members_can_submit`, `cancelled_at`, …) now lives in G2's 1.2/1.3a/1.3b
  prompts. G2.json `open_issues` carries the propagation list for G3, G4, G8, G9, G12, G13, G14 — the global fixers' worksheet.

## Directional decisions
- Founder: list the founder questions first, then do the memo and fix the numbering; run bites one at a time; wrap after bite 6 and
  pick up bite 7 next session. Founder chose not to answer the seven founder questions yet (see below).
- Orchestrator (founder may veto): decisions 20–30 in `orchestrator-decisions.md` — super-admin pass-through wins (20); schema
  corrections go into the unfrozen 9999, later migrations count down from 9995 (21); RLS test files 10–13 (22); Playwright naming
  (23); proposals adopted 2.7, 4.6, 5.8, 5.9, 6.7, 6.8, rest rejected (24); stale deps (25); long prompts accepted (26); 4.4 grep
  intentional (27); `sharp` allowed (28); `decision` bookkeeping (29); G2 lengths + strict head-of-house guard with the atomic
  `set_head_of_house` RPC (30).
- Drafter defaults left standing: 2.7's deploy-smoke job is visible-blocking; 5.8 uses an in-repo QR encoder + `jsqr` test-only;
  `/join/[code]` shows no church name to anonymous visitors.

## How to resume (next session = bite 7)
1. `git checkout claude/project-status-todo-plan-leghlm && git pull`; run `scripts/session/new-session.sh`.
2. Assemble locally first (bite mode skips the assembler agent):
   `cd "Session log/003_2026-09-04/todo-drafts" && python3 validate.py groups/G*.json && python3 assemble.py /home/user/ChurchAppCLD/docs/TODO.md`
   (commit the generated file only if the founder wants a preview in git; otherwise write it to the scratchpad).
3. **Bite 7**: Workflow `workflow-global.js` with `{"stage":"review","lenses":["coverage","consistency"],"round":1}` (2 agents, high
   effort, ~600–800k). Arm a 50-min `send_later`; on completion read `reviews/global.{coverage,consistency}.r1.json`, record, commit.
4. **Bite 8**: `{"stage":"review","lenses":["dependencies","founder"],"round":1}`.
5. **Bites 9–12**: `{"stage":"fix","groups":["G2","G3","G4"],"round":1}`, then G5–G8, G9–G11, G12–G14 (skip groups with no findings —
   the FIXER_WORKSHEET still applies to G3/G4/G5/G6/G8/G9/G10/G12/G13/G14, so run those even with few findings).
6. Re-run validate + assemble; second review round only if blockers remain. Then hand-fix the TODO.md header/appendix, update
   HANDOFF (State: TODO.md done), commit `docs: TODO.md — build order with a prompt per step`, push, and ask the founder about `main`.
   Consider splitting the ~312k-word output per milestone (`docs/todo/M1.md` …) — orchestrator call at assembly.

## Founder questions still open (asked in chat 2026-09-08, unanswered)
1. Production domain. 2. Yes/no on the permission mapping. 3. Legal entity name, address, governing state, privacy contact email.
4. Confirm 30-day deletion grace + self-restore default (decision 15). 5. Confirm palette token roles (decision 17).
6. Merge to `main` when TODO.md is generated, or after review? 7. Delete stale branches `claude/plan-todo-prompts-ia7gkd` (merged)
and `claude/plan-todo-prompts-w3madd` (record-only)?

## Things future sessions should know
- Bite costs today: drafter 150–220k per 1–2 steps; critic 150–175k per lens per group; reviser 230–270k per group. All six bites
  completed first try with no usage-limit stops.
- `send_later` fallbacks (40–50 min) were armed per bite and deleted on completion; the Workflow completion notification arrived
  every time, so none fired.
- The `assemble.py` appendix now prints each proposal's `decision`; `validate.py` skips the 4.4 placeholder warning when the mention
  is inside a `git grep` command.
- `workflow-global.js` bite mode does not read files in the script (no `fs`): the fixer agents read the saved global findings themselves.
