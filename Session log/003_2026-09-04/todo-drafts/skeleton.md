# Skeleton for docs/TODO.md — ChurchAppCLD build to-do list with one ready-to-paste prompt per step

## What we are producing

`docs/TODO.md` in the repo /home/user/ChurchAppCLD: a comprehensive, ordered to-do list that turns
`docs/PLAN.md` (executable summary) + `docs/DESIGN.md` (long-form design) into reality. For EVERY step there is a
prompt the founder pastes into a fresh Claude Code session (a different agent) to build that step. Steps marked
FOUNDER are manual actions in a browser/console (Supabase dashboard, Vercel, Stripe, Expo) and get a precise
checklist instead of an agent prompt (plus, where useful, a short "helper prompt" an agent can run to verify).

Primary objective given by the founder: "as a final product of the to-do list prompts, I want a finished web app
that I can trial with a Vercel deployment as the super admin". Milestones M1–M3 reach that (Checkpoint B).
M4–M6 complete the rest of the plan (mobile, Phase 2, Phase 3) and must also be comprehensive.

Repo state today (2026-09-03): only docs + session conventions exist. No code, no migrations. Files present:
CLAUDE.md, new_session_instructions.md, HANDOFF.md, README.md, .gitignore, docs/PLAN.md, docs/DESIGN.md,
scripts/session/new-session.sh, Session log/. Tooling on the founder's agents' machines: Node 22, pnpm 10,
PostgreSQL 16 installed locally (cluster may be down; Docker unavailable), Playwright + Chromium, npx supabase CLI,
npx eas-cli, npx vercel. No hosted Supabase project yet, no Stripe keys yet.

## Standing orders every prompt must respect (from CLAUDE.md / new_session_instructions.md)

- CLAUDE.md auto-loads `new_session_instructions.md` and `HANDOFF.md` in every session. Session-start checklist:
  run `scripts/session/new-session.sh`, append every user prompt verbatim to that session's `prompt_history.txt`
  with `--- YYYY-MM-DD HH:MM ---` (America/New_York), write `session_log.md` at the end, update `HANDOFF.md`.
- Git: commit to `main` and push after every meaningful step UNLESS the founder names another branch for the
  session. Prompts should say: "Work on `main` unless I have named another branch in this session."
  Commit messages use conventional prefixes (`feat(db):`, `feat(web):`, `chore:`, `docs:`) plus the attribution
  trailers the harness requires. No model identifiers in commits.
- Migrations: `supabase/migrations/` numbered DESCENDING (`9999_init.sql` newest-lowest rule: 9999 first, then 9998,
  9997 …; the LOWEST number is the NEWEST). Every file must be RE-RUNNABLE because the founder pastes it by hand
  into the Supabase SQL Editor. NEVER `supabase db push` / `db reset`. Per-construct rules: policies/triggers
  `drop … if exists` then `create`; tables/indexes `if not exists` (later changes via `alter table … add column if
  not exists`); functions `create or replace` (drop only on signature change, after dropping dependents in the same
  file); views `drop view if exists` + `create view`; enums in `do $$ if not exists` guards, and new enum VALUES in
  their own paste file (`9998a_enum.sql` / `9998b_use.sql`). Every function `security definer set search_path = ''`;
  pgcrypto/citext calls schema-qualified (`extensions.crypt(...)`). Policy names start with `ca_`. No `force row
  level security`. `9999_init.sql` is FROZEN once the founder has pasted it into production (HANDOFF ledger) — until
  then it may still be edited (it has NOT been pasted yet).
- Local DB verification before committing DB work: `scripts/db/local-up.sh && scripts/db/apply-migrations.sh &&
  scripts/db/apply-migrations.sh && scripts/db/check-rerunnable.sh && scripts/db/test.sh`.
- `pnpm turbo lint typecheck test` must be green before a push. pnpm workspaces + Turborepo.
- Web and mobile NEVER hold elevated Supabase keys; privileged work runs in Next.js Route Handlers / Server
  Actions against `public.srv_*` RPCs (service role only). No Supabase Edge Functions, no pg_cron.
- Mobile native dependency versions come only from `npx expo install <pkg>`; pnpm `catalog:` holds only deps shared
  by web and mobile (`react` pinned to the Expo SDK's exact version 19.2.3).
- Version pins: Node 22, pnpm 10, TypeScript ~5.9 (NOT 7), ESLint 9 (NOT 10), Next 16.3, Expo 57 / RN 0.86.3 /
  React 19.2.3 exact, supabase-js 2.112, @supabase/ssr 0.12, Stripe 22.6, Zod 4.5, Tailwind 4, Vitest 4,
  Playwright 1.62. Full table: docs/PLAN.md §3, docs/DESIGN.md §3.

## Founder decisions that change or sharpen the plan (answered 2026-09-03; recorded in HANDOFF.md)

1. Families may hide from their OWN congregation too → `households.hide_from_congregation` gets a real UI toggle
   (household adults any direction; org admins only toward more privacy; super admin any).
2. Fellowship viewers see everything the congregation sees minus birth year, anniversary year, leader notes (default).
3. Each church sets its own youth age → `youth_min_age`, `youth_max_age`, `adult_min_age`, `youth_excludes_married`,
   `adult_groups_include_youth` editable in `/o/[slug]/settings` (defaults 13 / 25 / 18 / on / on). No schema change.
4. Permission mapping (docs/DESIGN.md §5 table) ships as the default (not explicitly confirmed) — document it.
5. Share links: DOWNLOADS ALLOWED when the church allows it → NEW column
   `organization_settings.sermon_share_allow_download boolean not null default false` in `9999_init.sql`; the public
   share page shows a Download button for UPLOADED media only when on (signed URL with download disposition);
   external links keep "open at provider". Min password 8; available to `sermons.link` OR `sermons.upload` holders.
6. Push on every bulletin upload: yes (`push_on_bulletin` default true, per-church toggle).
7. Billing: flat $50 / month / church; one Stripe recurring Price → `STRIPE_PRICE_ID`; trial 30 days
   (`trial_ends_at` default now()+30d on church creation); only `suspended` blocks writes; `past_due` = banner only.
   Usage-based billing may come later (keep `billing_mode` enum extensible).
8. Surveys (Phase 3): the HEAD OF HOUSE (`household_role = 'head'`, or an adult designated head when there is no
   father) may answer `per_person` surveys on behalf of household members without accounts. Head-of-house
   designation editable by directory admins and by the household itself.
9. App display name "Anacast"; Android package id given as `com.Anacast.app` — record verbatim, recommend lowercase
   `com.anacast.app` in `app.config.ts` with a comment (founder to confirm; cannot change after first Play upload).
   Deep-link scheme can become `anacast`. Brand colours and production domain still open → prompts must use
   placeholders/env (`NEXT_PUBLIC_APP_URL`) and neutral default theme.
10. Supabase FREE plan (US East) and Vercel PRO at launch. Consequences: 50 MB per-file upload cap (bucket
    `file_size_limit` for `sermon-media` must be ≤ 50 MiB while on Free; keep the value in one place and document
    raising it on Pro), 1 GB storage, 500 MB DB, 5 GB egress, project PAUSES after 7 idle days (founder must restore
    it from the dashboard; note in docs). Web upload UI reads `NEXT_PUBLIC_MAX_UPLOAD_MB` (default 50) and maps the
    storage "exceeds plan limit" error to a clear message. Vercel Pro → cron `*/5 * * * *` allowed; `vercel.json`
    ships the Pro schedule (founder is on Pro) with the Hobby fallback documented.

## Prompt-writing rules (apply to every AGENT step)

Each prompt is pasted alone into a fresh Claude Code session in this repo. It must be fully self-contained:

1. Opening lines (verbatim pattern):
   "You are working in the ChurchAppCLD repository. CLAUDE.md loads `new_session_instructions.md` and `HANDOFF.md`
   automatically — follow the session-start checklist (new-session.sh, prompt_history.txt). Work on `main` unless I
   have named another branch in this session. This is step <ID> "<title>" of `docs/TODO.md`; read that step's
   'Done when' list first. Read `docs/PLAN.md` §<…> and `docs/DESIGN.md` §<…> before writing code. Build ONLY this
   step; do not start the next one."
2. **Goal** — one paragraph, what exists when the step is done and what the founder can see/do.
3. **Inputs / prior state** — what earlier steps produced that this step relies on (exact paths), what to read.
4. **Build** — concrete numbered instructions: files to create (paths), behaviours, rules, edge cases, founder
   decisions that apply (quote them), pinned versions, exact names (tables, RPCs, routes, env vars) taken from
   PLAN/DESIGN so the agent does not invent divergent names. Prefer listing exact file paths from
   docs/DESIGN.md §2 / §9 / §10 / §11.
5. **Constraints** — the standing orders that bite here (migration rules, no elevated keys client-side, pins,
   `expo install` only, etc.), and what NOT to do (no scope creep, don't refactor other areas, don't touch 9999 if
   frozen, no `db push`).
6. **Verify** — exact commands and expected results (`pnpm turbo lint typecheck test`, DB scripts, `pnpm --filter
   web build`, Playwright, `npx expo-doctor`, `npx expo export --platform android`), plus a manual check when useful.
7. **Finish** — update `HANDOFF.md` (State checklist, feature table, ledger if applicable, version pins, founder
   to-dos), tick the step's checkbox in `docs/TODO.md`, add `session_log.md`, commit with the given message
   (`<prefix>: <summary>`), push. If something in the plan turns out impossible or wrong, do the closest correct
   thing, record the deviation in HANDOFF.md under "Deviations from plan", and report it in the final message.

Sizing: a step should be doable by one agent in one long session (roughly ≤ 25 new files or one large SQL
section). If the skeleton's step is too large, the drafter may split it into <ID>a / <ID>b sub-steps with their
own prompts, keeping the id prefix so dependencies stay valid. Never merge steps.

Prompts are written in plain imperative English with markdown lists; use backticks for paths/identifiers. Do not
include model names. Do not include secrets. Where the founder must supply a value (email, domain), use an
explicit placeholder like `<FOUNDER_EMAIL>` and tell the agent to ask if it is not provided.

FOUNDER steps: a numbered click-path checklist (dashboard → menu → field → value), the exact values to enter
(taken from docs/ENV.md / PLAN §7 env list), what to record where (HANDOFF ledger, env file), and a "Done when"
check. Add an optional "helper prompt" for an agent to verify/adjust after the founder finishes when it helps
(e.g., "run the smoke test against the deployed URL and fix what fails").

## The step list (ids are fixed; drafters fill in prompts; dependencies listed)

### M0 — Prerequisites (founder, no code)
- 0.1 FOUNDER — Accounts & access: GitHub repo RadioDinner/ChurchAppCLD (exists), Supabase account (Free), Vercel
  account (Pro) connected to GitHub, Stripe account (test mode first), Expo account (needed at M4), Google/Firebase
  account (M4), optional domain + Resend. Decide/confirm: lowercase package id, brand colours, domain (may defer).
  Depends: —.

### M1 — Foundation & data layer (agents)
- 1.1 AGENT — Monorepo scaffold: root package.json, pnpm-workspace.yaml (hoisted, onlyBuiltDependencies, catalog),
  turbo.json, tsconfig.base.json, .nvmrc, .prettierrc, .editorconfig, .env.example, tooling/{tsconfig,eslint-config},
  empty packages/{domain,db,supabase-client} + apps placeholders, vercel.json (Pro cron), .github/workflows/ci.yml
  (non-blocking), docs/ENV.md (every env var incl. NEXT_PUBLIC_MAX_UPLOAD_MB), README update. `pnpm install` green.
  PLAN §2–§3, DESIGN §2–§3. Depends: 0.1 (not strictly).
- 1.2 AGENT — Local Postgres harness + migration skeleton: scripts/db/{local-up,apply-migrations,check-rerunnable}.sh,
  supabase/config.toml, supabase/tests/00_shim.sql (roles incl. churchapp_owner NOSUPERUSER BYPASSRLS; extensions
  schema pgcrypto/citext; auth.users + auth.uid()/jwt()/role(); storage.buckets/objects/foldername), and
  `9999_init.sql` sections (0)–(4): owner bypassrls assert, extensions/schemas/default privileges, ALL guarded enums,
  ALL 38 public + 3 private tables with checks/indexes (incl. NEW `sermon_share_allow_download`), touch_updated_at +
  assert_same_org trigger functions/triggers, the "drop all ca_% policies and our views" block. Apply twice.
  PLAN §4, DESIGN §4.1–§4.2, §4.4 sections 0–4, §12. Depends: 1.1.
- 1.3 AGENT — Helper functions, trigger functions, views, RPCs: `9999_init.sql` sections (5)–(7): every app.* helper
  (list in PLAN §4 "Key helper functions"), all trigger functions + triggers, views directory_households /
  directory_persons / org_directory_info (security_barrier, masking), all client RPCs (PLAN §4 "Client RPCs") and all
  srv_* RPCs, error codes via `raise … using errcode` (catalogue for domain/errors.ts). Apply twice. PLAN §4,
  DESIGN §4.3–§4.4 sections 5–7, §5, §8. Depends: 1.2.
- 1.4 AGENT — RLS policies, grants, storage, tests: `9999_init.sql` sections (8)–(11): enable RLS everywhere, anon
  revokes, column-level grants on persons/households, full `ca_*` policy catalogue (DESIGN §6 table), function
  grant matrix (revoke PUBLIC; grant per role), storage buckets upsert (sermon-media 50 MiB while on Free — single
  constant + comment; others per DESIGN §7) + storage.objects policies, commented super_admins bootstrap INSERT.
  supabase/tests/helpers.sql + tests/rls/01_tenancy … 09_grants.sql (every assertion in PLAN §12 / DESIGN §11
  acceptance), scripts/db/test.sh. All green, applied twice, check-rerunnable passes. Depends: 1.3.
- 1.5 AGENT — Seed, typegen, DB docs: supabase/seed/dev_seed.sql (guarded; 1 fellowship, 3 orgs, households,
  persons, one of each content type), scripts/db/gen-types.sh, supabase/README.md (paste order, bootstrap order,
  OTP template edit, Free-plan notes), docs/MIGRATIONS.md, docs/RLS.md (policy catalogue, directory visibility
  matrix, permission mapping, known consequences), HANDOFF ledger section ready. Depends: 1.4.
- 1.6 AGENT — @church/domain: permissions.ts (12-tuple + groups + labels/tooltips incl. mapping text), audiences.ts
  (mirror of app.person_in_kind), media-links.ts (parseMediaLink web/mobile), limits.ts (upload caps incl. 50 MB),
  dates.ts (org timezone helpers), errors.ts (errcode map), schemas/* (org, settings, sermon, announcement,
  bulletin, directory, users, share, invitation…), fixtures/persons.json shared with SQL test 05, Vitest suite.
  Depends: 1.3 (error codes), 1.1.
- 1.7 AGENT — @church/db + @church/supabase-client: generated database.types.ts (from local DB), client.ts, rpc.ts
  typed wrappers for every public RPC + srv_*, queries/* per domain (directory reads only via views), keys.ts,
  type-tests/enum-parity.test-d.ts; supabase-client: createWebBrowserClient, createMobileClient (LargeSecureStore,
  processLock), large-secure-store.ts. Depends: 1.5, 1.6.

### M2 — Web foundation, super admin, first deployment
- 2.1 AGENT — Web app shell, auth, guards: apps/web (Next 16, Tailwind 4, shadcn/ui), next.config.ts (security
  headers/CSP, transpilePackages, outputFileTracingRoot for monorepo), proxy.ts (session refresh, redirects,
  matcher exclusions), app/(public) pages (/, /privacy, /terms placeholders), app/(auth) (login password + OTP,
  signup, auth/callback, auth/reset, invite/[token] with "Open in app"), src/lib/supabase/{server,client,service},
  src/lib/auth/require-*.ts using my_context(), src/components/ui/*, vitest config, .env.example. `pnpm --filter web
  build` green. PLAN §7–§8, DESIGN §5, §8–§9. Depends: 1.7.
- 2.2 AGENT — Super admin UI: /admin (churches list: status, billing_mode, subscription badge, trial end),
  /admin/churches/new (creates org + settings via trigger; trial_ends_at +30d), /admin/churches/[orgId] tabs
  Details / Settings / Fellowships / Admins (invite or create first admin with all 12 perms via
  create_invitation / createUserDirect) / Billing (billing_mode, trial, status incl. suspend/cancel; Stripe buttons
  disabled until 2.3), /admin/fellowships + [id], /admin/super-admins (list + SQL instructions). Server Actions with
  Zod + user client; srv_attach_user via service client only for direct creation. Depends: 2.1.
- 2.3 AGENT — Stripe billing behind env: src/lib/stripe/{client,sync}.ts, /api/billing/checkout, /api/billing/portal,
  /api/stripe/webhook (raw body, 503 without secret, stripe_events idempotency, out-of-order guard, 500 on error),
  billing panel wiring, banner when keys absent, webhook unit tests. $50/month price via STRIPE_PRICE_ID.
  Depends: 2.2.
- 2.4 FOUNDER — Create the Supabase project (Free, US East); paste `9999_init.sql` in the SQL Editor (record in
  HANDOFF ledger with date); Auth settings: Email provider on, Magic Link template includes `{{ .Token }}`, OTP
  expiry, secure email change, custom SMTP or Resend (or accept default rate limits for the trial), Site URL +
  redirect URLs (Vercel domain + localhost); confirm buckets exist; copy URL + publishable + secret keys into a
  local password manager (never into git). Optional: run tests/rls/*.sql verbatim in the SQL editor. Depends: 1.5.
- 2.5 FOUNDER — Vercel project (Pro): import repo, root directory apps/web (or root with turbo — as the scaffold
  documents), Node 22, env vars from docs/ENV.md (Supabase URL/keys, NEXT_PUBLIC_APP_URL, SHARE_LINK_COOKIE_SECRET,
  CRON_SECRET, NEXT_PUBLIC_MAX_UPLOAD_MB=50; Stripe/Resend later), deploy; sign up at /login → run the
  `super_admins` INSERT → reload → /admin → create the first church. **Checkpoint A: super admin trial (create
  church, edit settings, fellowships).** Depends: 2.3, 2.4.
- 2.6 AGENT — Post-deploy triage (conditional/reusable): founder pastes the observed error/URL; agent reproduces
  with `pnpm --filter web build`/Vercel logs, fixes deployment config or code, documents in docs/DEPLOY.md
  (Vercel settings, redeploy, env changes, Supabase pause/restore). Depends: 2.5.

### M3 — Web org admin → finished web app (Checkpoint B)
- 3.1 AGENT — Org shell, dashboard, settings, billing read-only: app/(org)/o/[orgSlug]/{layout,dashboard},
  /settings (sharing + share-link password + NEW allow-download, directory sharing flags, youth/adult ages +
  youth_excludes_married + adult_groups_include_youth, events flags, push_on_bulletin, timezone, logo upload to
  org-assets), /settings/billing (read-only status/trial/past_due banner), org switcher, requireOrgMember +
  requirePerm on every page/action, 403/404 handling, suspended-org banner. Depends: 2.2.
- 3.2 AGENT — Users & permissions: /users (grid: rows users × 12 checkboxes under 3 role headers, select-all per
  header, debounced set_membership_permissions, optimistic, disabled+tooltip without users.edit_permissions), Invite
  dialog (create_invitation; Resend if configured else copy link), Create-account dialog (createUserDirect: temp
  password shown once; link to existing person or new one-person household), MembershipActions (disable/enable/
  remove via RPCs; last-manager error surfaced), /users/[membershipId], /invitations (list/revoke/resend),
  src/lib/email/resend.ts, src/lib/users/create-direct.ts. Depends: 3.1.
- 3.3 AGENT — Sermons: /sermons list (drafts vs published, filters), /sermons/new Upload | Link tabs
  (ResumableUpload with tus-js-client, exact-path flow insert→upload→update→publish, 50 MB cap + plan-limit error
  mapping, MIME allow-list), LinkPreview via parseMediaLink (YouTube nocookie iframe, Drive preview, Dropbox raw,
  other https), /sermons/[id] edit (title, speaker, preached_on, description, publish_at), SermonPlayer (signed URL
  1 h, re-mint on 403), delete (sermons.delete → storage_deletions). Depends: 3.1, 1.6.
- 3.4 AGENT — Share links: ShareLinksPanel on /sermons/[id] (create_share_link → raw token shown once; label,
  requires_password (min 8), expires_at, max_views; revoke), /s/[token] public page (Node runtime, service client,
  sha256 token hash, ip hash, srv_resolve_share_link, password form, unlock route with jose cookie, noindex/CSP/
  no-referrer headers, stream player, Download button only when `sermon_share_allow_download` and media is an
  upload, external → embed/open), /embed/yt/[id] hosted page, src/lib/share/{token,cookie}.ts + tests, 404 states
  (revoked, expired, org disabled sharing, unpublished). Depends: 3.3.
- 3.5 AGENT — Announcements & bulletins UI: /announcements list/new/[id]/edit (title, body, audience group select
  from audience_groups, publish_at incl. future, expires_at, pinned, push toggle, optional document link),
  /bulletins ("This Sunday" / "Quarter" presets computing starts_on/ends_on, PDF/JPG/PNG upload 25 MiB, list,
  delete), publish Server Actions call the push dispatcher (3.6 stub interface now, real in 3.6 — or order 3.6
  before 3.5; drafter decides and states the dependency). Depends: 3.1.
- 3.6 AGENT — Push dispatch + cron: src/lib/push/{expo,dispatch}.ts (srv_claim_notifications, re-read row,
  srv_audience_user_ids ∩ preferences ∩ devices, expo-server-sdk chunks, notification_deliveries, attempts ≤ 5),
  /api/cron/tick (Bearer CRON_SECRET; enqueue due → dispatch → receipts → storage_deletions drain → orphan sweep →
  srv_housekeeping → srv_process_account_deletions; maxDuration 60; idempotent), vercel.json cron, dispatch tests
  with mocked SDK, admin visibility of notification status on announcements list. Depends: 3.5 (or 3.1 if ordered
  first).
- 3.7 AGENT — Web QA: Playwright smoke with mock env (pages render, validation, unauth redirects, /s/unknown 404,
  security headers) + env-gated full E2E (super admin creates church → creates admin directly → admin toggles
  permissions → uploads small mp3 → password share link → anonymous unlock → org disables sharing → 404), CI
  workflow runs it, `pnpm --filter web build` clean, accessibility basics (labels, focus, contrast), empty/loading/
  error states audit. Depends: 3.6, 3.4, 3.2.
- 3.8 AGENT — Docs & handoff for the web release: docs/CHECKLIST_SECURITY.md, docs/DEPLOY.md (if not from 2.6),
  README full, HANDOFF (env vars, founder to-dos in order, feature checklist, ledger), docs/ENV.md final, in-app
  help text for the founder's manual acceptance script (docs/ACCEPTANCE_WEB.md: click-through script for
  Checkpoint B). Depends: 3.7.
- 3.9 FOUNDER — Stripe: product "Anacast church subscription" $50/month recurring → STRIPE_PRICE_ID; webhook
  endpoint https://<domain>/api/stripe/webhook with events (checkout.session.completed, customer.subscription.*,
  invoice.payment_failed/succeeded) → STRIPE_WEBHOOK_SECRET; STRIPE_SECRET_KEY (test mode first); optional
  Resend key + verified sender; Vercel env update + redeploy; Vercel cron visible (Pro `*/5`); run
  docs/ACCEPTANCE_WEB.md end to end as super admin, then as the first church admin. **Checkpoint B: finished web
  app trial as super admin.** Depends: 3.8.
- 3.10 AGENT — Fix/polish round from founder feedback (reusable prompt template: paste a list of observations;
  agent triages, fixes, adds regression tests, updates docs). Depends: 3.9.

### M4 — Mobile app (Android) — Phase 1 completion
- 4.1 AGENT — Expo scaffold + auth: apps/mobile (Expo 57, expo-router, versions via npx expo install), app.config.ts
  (name Anacast, package com.anacast.app w/ comment on founder's `com.Anacast.app`, scheme, googleServicesFile
  from env, eas projectId from env, plugins), eas.json, metro.config.js (monorepo), createMobileClient, (auth)
  sign-in OTP-first + password, verify-otp, invite/[token] deep link, no-church, (app)/_layout with membership
  check + org switcher, TanStack Query + kv-store persister. `npx expo-doctor`, `expo export --platform android`
  clean. Depends: 1.7, 2.1 (invite page).
- 4.2 AGENT — Feed & playback: (tabs)/home (pinned + recent announcements, current bulletin card), (tabs)/sermons +
  sermons/[id] with SermonPlayer strategies (expo-audio background, expo-video, WebView on hosted /embed/yt,
  expo-web-browser external), announcements/[id], bulletins list + bulletins/[id] (Android PDF via cache +
  intent-launcher), signed-url helper with re-mint. Depends: 4.1, 3.4 (embed page).
- 4.3 AGENT — Push & deep links: explainer → Android channel → permission → getExpoPushTokenAsync → upsert
  push_devices; delete on sign-out; notification response listener → switch org → route; settings/notifications
  (notification_preferences), (tabs)/more. Depends: 4.2, 3.6.
- 4.4 AGENT — Mobile build docs + CI: docs/MOBILE_BUILD.md (Expo account → eas init → Firebase → google-services.json
  as EAS file env var → FCM v1 key → preview build → sideload; iOS untested), docs/MEDIA.md (providers, strategies,
  caveats), CI adds expo-doctor + export, HANDOFF mobile section. Depends: 4.3.
- 4.5 FOUNDER — Expo account, `npx eas-cli init`, Firebase project, google-services.json → EAS file env var,
  FCM v1 service account → `eas credentials`, `npx eas-cli build -p android --profile preview`, sideload APK, sign in
  with OTP, receive a push from a web announcement, open sermon. **Checkpoint C: Android trial.** Depends: 4.4.

### M5 — Phase 2 (directory, calendars, documents, groups, join codes)
- 5.1 AGENT — Directory admin (web): /o/[slug]/directory households list/search, household page (address, phone,
  photo upload to directory-photos, anniversary, privacy toggles hide_from_fellowship / hide_from_congregation /
  show_children_in_fellowship with direction rule + confirmation state, head-of-house designation), persons CRUD
  via save_person (names, sex, birthdate + visibility, marital, role, congregation_status via
  set_congregation_status, member_since, youth_override, directory_listed, contacts, photo), leader notes
  (directory admins), link person ↔ user, create household. All reads via directory_* views. Depends: 3.2.
- 5.2 AGENT — Mobile directory & household self-service: directory/* (Our congregation | Fellowship tabs grouped via
  org_directory_info), person/household detail, household/* edit (save_household/save_person/set_household_privacy,
  head-of-house), ArrayBuffer photo upload with expo-image-picker/manipulator, privacy explainer + confirm flow for
  admin-created households. Depends: 5.1, 4.3.
- 5.3 AGENT — Calendars & events: web /calendars (CRUD, view/submit audience groups; org.settings), /events
  list + /events/pending approval queue (announcements.edit; approve → push), event create/edit; mobile events/*
  (list by calendar, detail, submit → pending). RLS tests for events already exist — add Playwright. Depends: 5.1.
- 5.4 AGENT — Documents: web /documents (upload 50 MiB allow-list, category, audience group, publish_at, delete),
  announcements can link a document; mobile documents/* list + open. Depends: 3.5, 4.2.
- 5.5 AGENT — Custom audience groups: web /groups (create/rename/delete custom groups; member picker from directory
  views; announcements.create or org.settings), used by announcements/documents/calendars/surveys selects.
  Depends: 5.1.
- 5.6 AGENT — Join codes & join requests: NEW migration `9998_join_codes.sql` (RPCs redeem_join_code /
  approve_join_request / reject_join_request / create_join_code / revoke_join_code; policies; grants; re-runnable;
  tests), web /join-codes (+ printable page), /join-requests (approve with person link), mobile join / pending
  screens, no-church screen gets join-code entry. Depends: 5.1, 4.1.
- 5.7 AGENT — Phase 2 hardening: Android App Links (intentFilters + /.well-known/assetlinks.json route), YouTube
  oEmbed "Re-check link", CSV directory import (web, dry-run + errors), directory performance test (5k-row fixture,
  explain analyze, documented bound), Phase 2 RLS directory matrix tests + Playwright, docs update. Depends: 5.2–5.6.

### M6 — Phase 3 (surveys, audit, account deletion, iOS)
- 6.1 AGENT — Surveys: NEW migration `9997_surveys_head_of_house.sql` (allow head of house to submit per_person
  responses for household members without accounts; adjust stamp_response_scope + policies; tests), web /surveys
  builder (questions, audience, response_mode, window, allow_edit, open/close), results + CSV export; mobile
  surveys/* responder incl. "answer for <household member>" for the head of house. Depends: 5.5, 5.2.
- 6.2 AGENT — Audit & scheduling UI: /o/[slug]/audit and /admin/audit (filter by table/actor/date), scheduled
  announcements list/edit polish, notification delivery status page. Depends: 3.6.
- 6.3 AGENT — Account deletion, privacy, monitoring: request_account_deletion UI (mobile + web), cron processing
  verified, /privacy and /terms real text (placeholders for founder review), Play Data Safety worksheet in docs,
  Sentry (web + mobile) behind env, docs/CHECKLIST_SECURITY.md run-through with results. Depends: 4.3.
- 6.4 FOUNDER+AGENT — iOS: Apple Developer account, bundle id, APNs key via eas credentials, `eas build -p ios`,
  TestFlight; agent fixes iOS-only issues (PDF viewer, background audio). Depends: 6.3.

## Drafter groups (one drafting agent each)

- G1: 0.1, 1.1
- G2: 1.2, 1.3
- G3: 1.4, 1.5
- G4: 1.6, 1.7
- G5: 2.1, 2.2
- G6: 2.3, 2.4, 2.5, 2.6
- G7: 3.1, 3.2
- G8: 3.3, 3.4
- G9: 3.5, 3.6
- G10: 3.7, 3.8, 3.9, 3.10
- G11: 4.1, 4.2, 4.3, 4.4, 4.5
- G12: 5.1, 5.2, 5.3
- G13: 5.4, 5.5, 5.6, 5.7
- G14: 6.1, 6.2, 6.3, 6.4

## Output JSON shape for each group file (`groups/G<n>.json`)

{
  "group": "G1",
  "steps": [
    {
      "id": "1.1",
      "title": "Monorepo scaffold",
      "actor": "agent" | "founder" | "founder+agent",
      "milestone": "M1",
      "depends_on": ["0.1"],
      "goal": "one paragraph",
      "prompt": "full prompt text (agent steps) — markdown allowed",
      "founder_checklist": "numbered click-path (founder steps) — markdown; empty string for agent steps",
      "helper_prompt": "optional agent prompt for founder steps; empty string if none",
      "done_when": ["checkable statement", "..."],
      "commit_message": "feat(x): …" (agent steps),
      "reads": ["docs/PLAN.md §2", "docs/DESIGN.md §2–§3"],
      "estimated_session": "S | M | L | XL",
      "notes": "risks, deviations, things the founder should know"
    }
  ],
  "proposed_additional_steps": [ { same shape, id like "3.11", "reason": "..." } ],
  "open_issues": ["anything the drafter could not resolve"]
}
