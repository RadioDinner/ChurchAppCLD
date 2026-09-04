# Orchestrator decisions for docs/TODO.md drafting (session 003, 2026-09-04)

These settle the cross-group questions raised by the G1 draft and by the founder's answers. Every drafter, critic
and reviser must follow them; they override the skeleton where they differ. Do not re-open them.

1. **Vercel layout.** Vercel Root Directory = `apps/web`; `vercel.json` lives at `apps/web/vercel.json` (Pro cron
   `*/5 * * * *` for `/api/cron/tick`, Hobby fallback `0 12 * * *` documented in docs/ENV.md). Step 2.1 sets
   `outputFileTracingRoot` in `next.config.ts` to the monorepo root. Step 2.5 imports the project with Root Directory
   `apps/web`, Framework Next.js, Node 22, Install Command `pnpm install --frozen-lockfile` run from the repo root
   (Vercel detects pnpm workspaces from the root lockfile).
2. **Package names.** `apps/web/package.json` name is `web`; `apps/mobile/package.json` name is `mobile`. Shared
   packages are `@church/domain`, `@church/db`, `@church/supabase-client`, `@church/tsconfig`, `@church/eslint-config`.
   Filters in prompts: `pnpm --filter web build`, `pnpm --filter mobile exec expo-doctor`, etc.
3. **React types.** `@types/react` and `@types/react-dom` follow the 19.2 line (React is 19.2.3 exact). Where
   PLAN §3 / DESIGN §3 say `~19.1`, the 19.2 line wins; prompts say so explicitly.
4. **Supabase plan is Free** (founder decision 10). The `sermon-media` bucket `file_size_limit` is 50 MiB while on
   Free, defined once as a documented constant at the top of the storage section of `9999_init.sql` with a comment on
   raising it to 2 GiB on Pro (bucket rows are upserted, so a later paste can raise it). `NEXT_PUBLIC_MAX_UPLOAD_MB`
   default 50. Any remaining "Pro recommended" wording in HANDOFF/DESIGN is historical; prompts must not repeat it.
5. **Identity.** App display name `Anacast`. Android package id in `app.config.ts` is `com.anacast.app` with a comment
   that the founder gave `com.Anacast.app` and that the value is immutable after the first Play upload; step 4.1 must
   read HANDOFF.md first and use the confirmed value if the founder recorded one in step 0.1. Deep-link scheme
   `anacast`. Expo slug `anacast`. Brand colours: neutral default theme, a single `theme.ts` / Tailwind token file so
   colours change in one place; production domain via `NEXT_PUBLIC_APP_URL` / `EXPO_PUBLIC_WEB_URL` only.
6. **Head of house.** `household_role = 'head'`; `9999_init.sql` enforces at most one `head` per household with a
   partial unique index (`create unique index if not exists … on persons (household_id) where household_role = 'head'`).
   Directory admins and household adults may set it (step 5.1 / 5.2). Surveys proxy rule is Phase 3 (step 6.1).
7. **Ordering 3.5 / 3.6.** 3.5 (announcements & bulletins UI) ships first: publishing inserts rows and the DB trigger
   enqueues `notifications` rows; the UI shows "queued, delivered by the push dispatcher (step 3.6)". 3.6 then adds
   `src/lib/push/*`, wires the publish Server Actions to call `dispatch()` synchronously after enqueue, and the cron.
   3.6 depends on 3.5.
8. **Adopted proposal 6.5** "Google Play Console: internal testing upload and store listing" (founder+agent, after
   6.3 and 4.5) is a real step in G14. Drafters may propose further steps in `proposed_additional_steps`; the
   orchestrator decides at assembly.
9. **Prompts must contain** the exact opening lines from the skeleton's prompt-writing rule 1 and the six headed
   sections `## Goal`, `## Inputs / prior state`, `## Build`, `## Constraints`, `## Verify`, `## Finish`. Agent-step
   prompts are 1200–3000 words. Founder steps have a numbered click-path checklist and `helper_prompt` where useful.
   Use `<FOUNDER_EMAIL>`, `<VERCEL_URL>`, `<DOMAIN>` placeholders; never a real email, key or secret.
10. **Exact names come from the docs.** Tables, enums, RPC names, `app.*` helpers, view names, routes, env vars,
    bucket names, package names and file paths must be copied from docs/PLAN.md §4–§9 and docs/DESIGN.md §2, §4–§10.
    If the docs disagree, PLAN wins and the prompt notes the DESIGN wording. If a needed name is not in the docs the
    drafter chooses one, flags it in `open_issues`, and uses it consistently.
11. **Verification is mandatory in every agent prompt**: the standing local DB sequence for DB steps
    (`scripts/db/local-up.sh && scripts/db/apply-migrations.sh && scripts/db/apply-migrations.sh &&
    scripts/db/check-rerunnable.sh && scripts/db/test.sh`), `pnpm turbo lint typecheck test` for everything,
    `pnpm --filter web build` for web steps, `npx expo-doctor` + `npx expo export --platform android` for mobile steps.
12. **Finish block in every agent prompt**: update HANDOFF.md (State checklist, feature table, ledger if applicable,
    Deviations from plan), tick the step in `docs/TODO.md`, write `session_log.md`, commit with the step's
    `commit_message`, push (`git push origin main` unless another branch was named).
13. **Sizing.** If a step cannot be done in one long session (> ~25 new files or > one large SQL section), split into
    `<id>a`, `<id>b` with their own full prompts and `depends_on` chains. Never merge steps. Every split is recorded in
    `notes`.
14. **Session numbering.** This work happens in session 003 (2026-09-04); the assembler header mentions both sessions.
