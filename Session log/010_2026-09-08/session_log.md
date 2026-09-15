# Session 010 — 2026-09-08 → 2026-09-15 (bites 7–9 of the TODO.md global audit; bite 10 stopped by the usage limit)

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
- `348d6d2` bite 10 record; bite 10 itself failed on the usage limit (no files changed).

## Directional decisions
- Founder (2026-09-15): "work through all the next bites until you run out of usage" — back-to-back bites this session; the one-bite-then-
  pause rule from session 009 is suspended for this instruction only.
- Orchestrator: the 5 NEW findings were applied by hand in `assemble.py` rather than by a fixer; `docs/TODO.md` preview stays committed
  and is regenerated after the fixer bites.
- Redundant work discarded: this session's clone started at `ec5f2c6`; a G7 group draft made before fetching was thrown away unpushed.

## How to resume (bite 10 onward)
1. `git pull`; `scripts/session/new-session.sh`.
2. **Bite 10**: Workflow `workflow-global.js` args `{"stage":"fix","groups":["G5","G6","G7","G8"],"round":1}` (4 agents, high effort,
   ~250k each). Propagation notes for these groups are in `workflow-results.md` (bite 9 outcome) and in G4.json `open_issues`:
   G6 2.3 → `queries/organizations.ts` / `listOrganizations(db)`; G8 3.4b → `srvLoadUnlockedShareLink` + `SHARE_LINK_LOAD_STATUSES`;
   G5 2.1a/2.1b/2.2b decision 20 (super-admin pass-through) + palette (17); G7 3.1/3.2a/3.2b `OrgContext.org.org_id` spelling + `writable`.
3. **Bite 11**: `{"stage":"fix","groups":["G9","G10","G11"],"round":1}`. **Bite 12**: `{"stage":"fix","groups":["G12","G13","G14","G1"],"round":1}`.
4. `python3 validate.py groups/G*.json && python3 assemble.py /home/user/ChurchAppCLD/docs/TODO.md`; check `docs/TODO.md` header by
   hand; repoint prose "step 1.2" mentions to 1.2a/1.2b where the fixers did not; second review round only if blockers remain.
5. Update HANDOFF (State: TODO.md done), commit `docs: TODO.md — build order with a prompt per step`, push; ask the founder about `main`.

## Things future sessions should know
- Review lenses cost 230–400k tokens each; fixers ~235k per group. Four fixers in parallel plus the two earlier bites exhausted a full
  usage window (~2.6M sub-agent tokens in one sitting).
- The findings files are the fixers' only input (the script has no `fs`); they are committed, so a relaunch needs nothing else.
- `service_role` bypasses RLS: the G3 fixer rejected "add service_role update/delete policies" on that ground — do not re-add them.
