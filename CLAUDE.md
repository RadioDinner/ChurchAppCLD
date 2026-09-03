@new_session_instructions.md
@HANDOFF.md

# ChurchAppCLD — working agreement for Claude Code sessions

The two files imported above are loaded at the start of every session. `new_session_instructions.md`
is the founder's standing orders (verbatim); `HANDOFF.md` is the live cross-session state of the project.
Read both before doing anything else, then follow the session-start checklist below.

## Session-start checklist

1. Run `scripts/session/new-session.sh` (creates `Session log/NNN_YYYY-MM-DD/` with an empty
   `prompt_history.txt`; dates are America/New_York).
2. Append every user prompt to that `prompt_history.txt` verbatim, immediately, preceded by
   `--- YYYY-MM-DD HH:MM ---` (America/New_York). Include AskUserQuestion answers and one-word replies.
   Never edit past entries. The file rides along in every commit.
3. Work on `main` and push after every meaningful step (`git push origin main`), unless the founder
   names another branch for the session.
4. Before the session ends write `session_log.md` in the session folder using the template in
   `new_session_instructions.md` §3, and update `HANDOFF.md`.

## When the founder says "update new_session_instructions"

Edit `new_session_instructions.md` directly, commit on the current branch with the message
`Update new_session_instructions: <one-line summary>`, and reflect any change in default behaviour here in
`CLAUDE.md` so future sessions pick it up at load.

## Planned repository map (nothing built yet — see docs/PLAN.md)

```
apps/web         Next.js 16 App Router (Vercel): super admin (/admin), org admin (/o/[slug]), public share pages
apps/mobile      Expo SDK 57 + expo-router: congregation member app (Android first, iOS later)
packages/domain  @church/domain — pure TS: permissions, audience derivation, media-link parser, Zod schemas
packages/db      @church/db — generated Supabase types, typed RPC wrappers, query helpers
packages/supabase-client  @church/supabase-client — browser and React Native client factories
supabase/        migrations (descending numbering), seed, local shim + plain-SQL RLS tests
scripts/db       local Postgres 16 bring-up, apply-migrations (twice), tests, typegen, re-runnability check
scripts/session  new-session.sh
docs/            ENV, MIGRATIONS, RLS, MEDIA, MOBILE_BUILD, CHECKLIST_SECURITY
Session log/     one folder per session: prompt_history.txt + session_log.md
```

## Migrations (see `docs/MIGRATIONS.md`)

- Files live in `supabase/migrations/` and are numbered **descending**: `9999_init.sql`, then `9998_*`,
  `9997_*` … The lowest number is the newest. Never run `supabase db push` or `db reset`; the founder pastes
  each file by hand into the Supabase SQL Editor, so every file must be **re-runnable**.
- Per construct: policies and triggers → `drop … if exists` then `create`; tables/indexes → `if not exists`
  (later changes via `alter table … add column if not exists`); functions → `create or replace` (drop only when
  the signature changes, after dropping dependents in the same file); views → `drop view if exists` + `create view`;
  enums → `do $$ if not exists` guard, and new enum *values* go in their own paste (`9998a_enum.sql` /
  `9998b_use.sql`) because Postgres forbids using a new value in the same transaction.
- Every function is `security definer set search_path = ''`; pgcrypto/citext calls are schema-qualified
  (`extensions.crypt(...)`). Policy names start with `ca_`. No `force row level security`.
- `9999_init.sql` is frozen once the founder has pasted it into production (see the ledger in `HANDOFF.md`).
- Verify locally before committing: `scripts/db/local-up.sh && scripts/db/apply-migrations.sh &&
  scripts/db/apply-migrations.sh && scripts/db/check-rerunnable.sh && scripts/db/test.sh`.

## Conventions

- pnpm workspaces + Turborepo. `pnpm turbo lint typecheck test` must be green before a push.
- Mobile native dependency versions come only from `npx expo install <pkg>`; the pnpm `catalog:` holds only
  deps shared by web and mobile (`react` is pinned to the Expo SDK's exact version).
- Web and mobile never hold elevated Supabase keys; privileged work runs in Next.js Route Handlers / Server
  Actions against `public.srv_*` RPCs (service role only). No Supabase Edge Functions, no pg_cron.
- Commit messages: conventional prefix (`feat(db):`, `chore:`, `docs:`) plus the attribution trailers the
  harness requires.
