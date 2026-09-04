# Session 002 — 2026-09-03

## Shipped
- `173334b` docs: record founder answers to the plan's open questions (HANDOFF.md "Founder answers" table, PLAN.md §13 addendum, DESIGN.md §13 note)
- (this commit) chore(session): save the docs/TODO.md drafting kit — skeleton, assembler, first finished draft — and this log

Branch for this session: `claude/plan-todo-prompts-ia7gkd` (founder: "I'll tell you when to merge to main"). Nothing merged to `main`.

## What was asked
Build a comprehensive step-by-step to-do list for the plan in `docs/PLAN.md` / `docs/DESIGN.md`, with one ready-to-paste prompt per step for other agents, whose end product is a finished web app trialled on Vercel as super admin. Do not run the prompts. The founder also answered the ten open questions from session 001.

## Directional decisions (founder answers, all recorded in HANDOFF.md)
1. Families may hide from their own congregation → `hide_from_congregation` gets a UI toggle.
2. Fellowship viewers: default (everything minus birth year, anniversary year, notes).
3. Each church sets its own youth/adult ages in settings (columns already exist).
4. Permission mapping: no answer → ships as default.
5. Share links may allow downloads when the church allows → new `organization_settings.sermon_share_allow_download` (default false) to be added to `9999_init.sql` before its first paste.
6. Push on bulletin upload: yes.
7. Billing: $50 / month / church flat; 30-day trial; only `suspended` blocks writes.
8. Head of house answers per-person surveys for household members without accounts (Phase 3).
9. App name Anacast, package id `com.Anacast.app` as given (lowercase `com.anacast.app` recommended; founder to confirm).
10. Supabase Free (50 MB upload cap, project pauses after 7 idle days) and Vercel Pro.

## State of the to-do list work (interrupted by the founder to save usage)
- `todo-drafts/skeleton.md` — the complete brief: objective, standing orders, founder decisions, prompt-writing rules, and the FIXED step list (M0–M6, ids 0.1 … 6.4, dependencies, drafter groups G1–G14) plus the JSON shape each group file must follow. This is the backbone of `docs/TODO.md`; only the per-step prompts still need writing for most steps.
- `todo-drafts/assemble.py` — turns `groups/G*.json` into `docs/TODO.md` (master checklist per milestone, then one section per step with prompt box, founder checklist, done-when list). Run: `python3 "Session log/002_2026-09-03/todo-drafts/assemble.py" docs/TODO.md` after pointing it at the folder holding `groups/` (it looks next to itself).
- `todo-drafts/groups/G1.draft.json` — finished, validated draft for steps 0.1 (founder accounts) and 1.1 (monorepo scaffold, ~2000-word prompt). Not yet critiqued. Its `open_issues` list decisions the assembler must propagate to other groups: Vercel Root Directory = `apps/web` with `vercel.json` inside `apps/web`; web package name `web` (so `pnpm --filter web build` works) or use the directory filter; `@types/react` should follow 19.2 not ~19.1; DESIGN §11 founder action items still say "Supabase Pro recommended" (HANDOFF already says Free).
- Groups G2–G14 (steps 1.2 … 6.4) have no drafts yet. The workflow (14 drafters → 3 critics each → reviser → 3 global critics → fixers) was stopped after the first draft landed because of usage cost.

## Next step (next week)
1. Resume on `claude/plan-todo-prompts-ia7gkd`. Read `todo-drafts/skeleton.md` first.
2. Write the remaining group files G2–G14 following the skeleton's step list and JSON shape. Cheaper than the stopped workflow: draft the groups directly in the main session (or one sub-agent per milestone), then ONE review pass over the assembled `docs/TODO.md` for coverage against PLAN §10–§12 and consistency of names, instead of 3 critics per group plus 3 global critics.
3. Run `assemble.py` → `docs/TODO.md`; fix the G1 open issues across groups; commit; wait for the founder's word before merging to `main`.

## Notes
- The scratchpad and workflow run in this container are ephemeral; everything worth keeping was copied into `todo-drafts/`.
- HANDOFF.md "Environment status" item 1 now says Supabase Free; `docs/DESIGN.md` §11 founder action items were not edited (historical text).
