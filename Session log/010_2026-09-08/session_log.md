# Session 010 — 2026-09-08 → 2026-09-15 (TODO.md global audit: review bites 7–8, fixer bites 9–12, final assembly — docs/TODO.md done)

Branch: `claude/project-status-todo-plan-leghlm`. Nothing merged to `main` (founder: wait until told).

## Shipped (oldest first)
- `ac2eefb`/`3eac504` bite 7 started; `0154026` `docs/TODO.md` committed as a generated preview (stop hook needs a clean tree).
- `74ebf02` **bite 7**: global review, coverage (26) + consistency (22) → `reviews/global.{coverage,consistency}.r1.json`. First attempt on
  09-08 died on the usage limit; relaunched 09-15 after the founder's reset.
- `9e86b66` **bite 8**: dependencies (59) + founder (30) → `reviews/global.{dependencies,founder}.r1.json`. Round-1 total 137 findings,
  18 blockers.
- `0dd284e` assembler header rewritten for the 5 "NEW" findings (item 0 merge/branch rule, template fill-in blocks, founder+agent three
  passes, consoles list, bold no-secrets rule, situation → prompt routing table, Checkpoint D, decisions block refreshed for 15–21/31–33).
- `5f99aa2` **bite 9**: fixers G2 (1.2 → 1.2a + 1.2b; **78 steps** now), G3 (decision-21 propagation, grants/tests/docs), G4 (wrappers for
  every RPC, counts derived from the migration). Validator 0 errors / 10 accepted long-prompt warnings.
- `348d6d2` bite 10 record; first attempt failed on the usage limit (no files changed); relaunched after the founder's reset.
- `bce1fa7` **bite 10**: fixers G5 (pass-through + palette + `OrgContext` contract), G6 (no self-invitation, smoke script, dry run), G7, G8.
- `3d92942` **bite 11**: fixers G9 (per-org claim, queued-at-once), G10 (3.7b/3.8/3.9/3.10 incl. custom SMTP), G11 (palette in mobile theme).
- `567d239` hand pass: share-link load RPC skips `max_views` for cookie holders; "step 1.2" repointed in G3/G9.
- `8d9a8e1` **bite 12**: fixers G12 (atomic `setHeadOfHouse`, `calendars.members_can_submit`), G13, G14 (super-admin "Start deletion",
  monitoring row, listing flags flipped in 6.8), G1 (0.1 item 13 merge/branch rule). **162 findings applied in total, 0 validator errors.**
- (this commit) final hand pass (5 propagations + topological print order in `assemble.py`), `docs/TODO.md` regenerated (78 steps,
  ~338k words), HANDOFF State: TODO.md done.

## Directional decisions
- Founder (2026-09-15): "work through all the next bites until you run out of usage" — back-to-back bites this session; the one-bite-then-
  pause rule from session 009 is suspended for this instruction only.
- Orchestrator: the 5 NEW findings were applied by hand in `assemble.py` rather than by a fixer; `docs/TODO.md` preview stays committed
  and is regenerated after the fixer bites.
- Redundant work discarded: this session's clone started at `ec5f2c6`; a G7 group draft made before fetching was thrown away unpushed.

## How to resume (TODO.md is done)
1. Ask the founder whether to merge `claude/project-status-todo-plan-leghlm` into `main` (decision 32c: only when told). Until then every
   build session starts with "Work on branch `claude/project-status-todo-plan-leghlm`" (TODO.md "How to use" item 0).
2. Optional quality pass: second global review round — `workflow-global.js` `{"stage":"review","lenses":["coverage","consistency"],"round":2}`
   then `["dependencies","founder"]`, then `stage: fix` per group with `"round": 2`. Round 1 left no known blockers; this is polish.
3. Then the build begins at step 0.1 (founder) and 1.1 (agent) of `docs/TODO.md`.

## Things future sessions should know
- Review lenses cost 230–400k tokens each; fixers ~235k per group. Four fixers in parallel plus the two earlier bites exhausted a full
  usage window (~2.6M sub-agent tokens in one sitting).
- The findings files are the fixers' only input (the script has no `fs`); they are committed, so a relaunch needs nothing else.
- `service_role` bypasses RLS: the G3 fixer rejected "add service_role update/delete policies" on that ground — do not re-add them.
