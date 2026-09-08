# Session 009 — 2026-09-08 (high-level pass: what is outstanding on docs/TODO.md)

Branch: `claude/project-status-todo-plan-leghlm` (harness-assigned). The local clone was a stale shallow checkout at
`ec5f2c6`; unshallowed, verified ancestry, fast-forwarded to origin `5f77b3f`. No kit, group or review files were changed.
Nothing merged to `main`.

## Shipped
- HANDOFF.md: the `docs/TODO.md` State line refreshed to the real state (all 14 groups drafted; G1/G2 uncritiqued; global
  audit and assembly not run). Session folder 009 with prompt history and this log.

## Status found (2026-09-08 07:35 ET)
- `docs/TODO.md` does not exist. `python3 validate.py groups/G*.json` → 0 errors, 6 warnings. 71 steps across G1–G14.
- Assembler dry run (to the scratchpad, not committed): 71 steps, ~273k words / 2.1 MB; warnings `1.6a depends on unknown 1.4`,
  `3.1 depends on unknown 2.2`.
- Validator warnings: prompts over 3400 words — 1.4a (4465), 1.5 (4141), 1.2 (4040), 5.6a (3974), 2.3 (3851); 4.4 still
  mentions the old `com.churchappcld` placeholder.
- open_issues per group: G1 6, G2 10, G3 16, G4 13, G5 18, G6 14, G7 10, G8 15, G9 16, G10 18, G11 17, G12 18, G13 43, G14 32
  (246 total).
- Proposed additional steps (16): G1 6.5 (already adopted, decision 8 — drop the proposal); G2 1.8; G5 3.11 and G10 3.11
  (same super-admin gap); G8 3.11 (share-link SQL stub, different thing — renumber); G6 2.7; G9 3.12 and G10 3.12 (different
  things — renumber one); G11 4.6; G12 5.8; G13 5.9, 5.10; G14 6.1d, 6.1p, 6.7, 6.8.
- Cross-group contradictions still unsettled: G5 2.1a (super admin without membership → 404) vs G7 3.1 (pass-through);
  Playwright spec layout (G10 `testMatch` vs G12/G13/G14 names); M3/M5 migration numbering vs reserved 9998/9997/9996;
  RLS test file `11_` claimed by both 5.6a and 6.3a.
- Decision-15 archival names chosen by 6.3a (`profiles.archived_at/archived_by/archive_reason`,
  `account_deletion_requests.scheduled_for`, `deactivate_account()`, `restore_my_account()`, `srv_archive_account()`,
  `srv_restore_account()`, `ACCOUNT_DELETION_GRACE_DAYS`) are not yet in the G2/G3 prompts.

## Remaining work, in the order recommended to the founder
1. Orchestrator decision memo (no agents): accept splits, settle the 4 contradictions, adopt/reject/renumber the 16 proposals,
   fix the 2 stale `depends_on`, decide on the 5 over-length prompts.
2. Critique + revise G1 and G2 in single-agent bites (`workflow-groups.js`, `stage`/`lenses` args; ~1.0–1.3M sub-agent tokens).
3. `workflow-global.js` in bites (assemble → coverage / consistency / dependencies / founder lenses → per-group fixers, ≤2 rounds);
   fixers push the decision-15 schema into 1.2–1.4.
4. Assemble `docs/TODO.md`; hand-fix header/appendix; consider splitting the 273k-word output per milestone.
5. HANDOFF update (State: TODO.md done), commit `docs: TODO.md — build order with a prompt per step`, then the founder's word
   on merging to `main`.

## Founder items still open (unchanged from session 008)
Production domain; explicit yes/no on the permission mapping; legal entity name/address/state/contact for 6.6; confirm the
30-day deletion grace and self-restore default (decision 15); confirm the palette token roles (decision 17); when to merge.

## Housekeeping noticed
- Remote branches `claude/plan-todo-prompts-ia7gkd` (merged into this branch in 37aa965) and `claude/plan-todo-prompts-w3madd`
  (two session-002 record commits, nothing else) are stale and can be deleted once the founder agrees.

## Directional decisions
- None this session (status question only).
