# Session 008 — 2026-09-07 (G14 in bites; founder decisions 15–19)

Branch: `claude/project-status-todo-plan-leghlm` (harness-assigned; the founder's other session ran G13 on the same branch
concurrently — every push was preceded by `git pull --rebase`; no conflicts all day). Nothing merged to `main`.

## What shipped (commits, oldest first)
- `6a4ca66`, `5046064`, `d0afb29`, `5d73307` — G14 drafts: bite 1 (6.1 → 6.1a/6.1b/6.1c), bite 2 (6.2 → 6.2a/6.2b),
  bite 3 (6.3 → 6.3a/6.3b), bite 4 (6.4, 6.5, new 6.6).
- `e005c9d` — orchestrator decisions 15 (account archival + Play-compliant deletion with 30-day grace) and 16 (adopted step
  6.6 privacy policy & terms); `workflow-groups.js` G14 entry gained 6.6; HANDOFF Decisions + "Still open" updated.
- `a33c89b` — decisions 17 (brand palette, five blues, measured WCAG contrast, suggested token roles) and 18 (`com.anacast.app`
  confirmed); HANDOFF "Brand palette" table.
- `a553320` — `docs/legal/privacy-policy.md` placeholder (lawyers replace before go-live); decision 19.
- `0af3963`, `b7a4b0a` — critiques: fidelity (21 findings, 4 blockers), executability (31, 3 blockers), completeness (20, 2 blockers).
- `57b5b38` — G14 revised: 68 applied, 3 partially rejected with reasons, validator 0 errors; new step 6.3c; `reviews/G14.result.json`.
- Session record commits in between (`workflow-results.md`, `prompt_history.txt`, autosave `2641a8b`).

## How G14 was run (the "bites" method)
Eight single-agent Workflow runs of `workflow-groups.js` using `stage` / `steps` / `lenses` args (session 003's G7 method),
pausing after each for the founder: draft 6.1 → draft 6.2 → draft 6.3 → draft 6.4+6.5+6.6 → fidelity critic → executability +
completeness critics together (founder's choice) → reviser. Per-bite tokens and run ids are in `workflow-results.md`.
Total 1,902,943 sub-agent tokens over 9 agents; a full-pipeline run of a group cost 0.9–1.4 M, so bites cost ~40 % more in
exchange for stop points. A 30–45 min `send_later` fallback was armed for each bite and deleted on completion.

## Directional decisions (founder, this session)
1. **Account archival, not deletion, as the self-service action** — but Google Play's account-deletion policy requires an
   in-app path + web link that really deletes, and says deactivation does not qualify (verified through search results and
   secondary sources; support.google.com is blocked from the sandbox). Recorded as decision 15: Deactivate = archive
   (super admin restores; self-restore on sign-in is a recommended default); Delete = archive now + real deletion after a
   30-day grace, cancellable by the user or the super admin; super admin can start a deletion for someone who asks by email.
   Schema goes into `9999_init.sql` via the global review (not pasted yet) or the next free `999x_*` migration otherwise.
2. **Privacy policy is a real step (6.6)** and a **placeholder policy** exists at `docs/legal/privacy-policy.md`; the
   founder's lawyers replace it before go-live. 6.3a copies it verbatim into `legal.ts`; 6.6 swaps in the approved text.
3. **Brand palette** (Prussian Blue `#00072d`, Deep Navy `#001c55`, Imperial Blue `#0a2472`, Bright Marine `#0e6ba8`,
   Icy Blue `#a6e1fa`) with suggested token roles the founder may change; Icy Blue never as text on white (1.4:1).
4. **Android package id `com.anacast.app`** confirmed lowercase.
5. The founder chose not to answer the smaller product questions the drafts raised (delivery-status visibility for church
   admins, reschedule fix placement, audit index); they stay in G14.json `open_issues` with the drafters' defaults.

## Open questions / next step
- **G13** is being finished in the founder's other session (single-agent bites after a usage-limit stop). Do not touch
  G13 files from this branch until it reports done.
- **Global audit** (`workflow-global.js`: assemble → 4 global lenses → per-group fixers → loop ≤ 2) runs in this session
  after every group exists, per the founder. Plan it in bites too (the script launches many agents at once) and make sure
  the G2/G3 fixers adopt the decision-15 names 6.3a chose (`profiles.archived_at/archived_by/archive_reason`,
  `account_deletion_requests.scheduled_for`, `deactivate_account()`, `restore_my_account()`, `srv_archive_account()`,
  `srv_restore_account()`, `ACCOUNT_DELETION_GRACE_DAYS`).
- **Assembly decisions** waiting on the orchestrator: accept the splits (6.1a–c, 6.2a–b, 6.3a–c) and the dependency edits
  listed in `reviews/G14.result.json`; decide proposals 6.1d, 6.1p (founder paste of 9998/9997/9996 + ledger), 6.7 (super
  admin ops view), 6.8 (production release); 6.3a is 3392 words (threshold 3400) — split `/admin/users` out if wanted;
  the G5 2.1a vs G7 3.1 super-admin pass-through contradiction; `sharp` as a root devDependency for store-asset generation.
- **Founder items still open**: production domain; permission mapping yes/no; legal entity name/address/state/contact;
  confirm the 30-day grace and self-restore defaults; confirm the palette token roles; when to merge to `main`.

## Things future sessions should know
- `stage`/`steps`/`lenses` bites work well; a critic of a 10-step file costs ~300 K tokens, the reviser ~280 K.
- Mid-turn founder messages arrive alongside tool results; each was logged to `prompt_history.txt` verbatim.
- The other session's commits appeared during rebases three times; all were record-only, so no conflict handling was needed.
