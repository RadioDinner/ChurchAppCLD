# HANDOFF — live project state (update every session)

_Last updated: 2026-09-08, session 009 wrap (decisions 20–30; steps 2.7/5.8/5.9/6.7/6.8 drafted; G1/G2 critiqued and revised; global audit next — resume steps in session 009 `session_log.md`)._

## What this is

ChurchAppCLD is a multi-tenant church platform for Anabaptist/Mennonite congregations: sermons (uploaded or
linked), push-notified announcements, bulletins/documents, a privacy-controlled member directory, calendars
with member event submission, and audience-targeted surveys. Super admin (the founder) creates churches and
manages Stripe billing; church leaders administer their congregation on the web; members use the Expo app.

Design document: see `docs/` and the plan summary below. Stack: pnpm monorepo, Next.js 16 on Vercel,
Expo SDK 57 (EAS Build), Supabase (Postgres + Auth + Storage), Stripe.

## State

- [x] Session conventions (`CLAUDE.md`, `new_session_instructions.md`, `Session log/`) and the approved plan (`docs/PLAN.md`, `docs/DESIGN.md`)
- [ ] `docs/TODO.md` — step-by-step build list with one prompt per step. **In progress** on branch
  `claude/project-status-todo-plan-leghlm` (nothing on `main`). Kit: `Session log/003_2026-09-04/todo-drafts/` (skeleton,
  orchestrator-decisions 1–30, validate.py, assemble.py, workflow-groups.js, workflow-global.js). As of 2026-09-08 (session 009):
  all 14 groups drafted, **77 steps** (4.6 promoted; 2.7, 5.8, 5.9, 6.7, 6.8 drafted in bites 1–3), validator 0 errors / 5 accepted warnings, assembler reports no unknown dependency; **every group critiqued and revised** (G1/G2 done in session 009 bites 4–6; the decision-15/21 schema is now in G2's 9999 prompts). The orchestrator decision memo (decisions 20–30) is written and its numbering fixes are applied:
  stale `depends_on`, migration reservations (9998/9997/9996; worked example `9995_storage_limit.sql`), RLS test files 10–13,
  Playwright spec names, every proposal decided. **Still to do:** `workflow-global.js` in bite mode (bite 7 = review lenses coverage + consistency; then dependencies + founder; then fixers
  per group with the FIXER_WORKSHEET from decisions 20–24/30 — exact args in session 009 `session_log.md` "How to resume"); generate
  `docs/TODO.md` (dry run ≈ 312k words); HANDOFF update; founder's word on merging to `main`. Details: session 009 `session_log.md`.
- [ ] Monorepo scaffold (not started; a premature scaffold was reverted in session 001)
- [ ] `supabase/migrations/9999_init.sql` + local shim + RLS tests
- [ ] `@church/domain`, `@church/db`, `@church/supabase-client`
- [ ] Web: auth, super admin, org admin (users/permissions, settings, sermons, share links, announcements, bulletins, push, cron)
- [ ] Mobile: auth, feed, sermon playback, push registration, EAS config
- [ ] Phase 2: directory UI (web + mobile), calendars/events, documents, custom groups, join codes

## Environment status (founder to-dos, in bootstrap order)

1. Create the Supabase project (**Free plan** per the founder; US East; upgrade to Pro when sermon uploads must exceed 50 MB). Paste `supabase/migrations/9999_init.sql` in the SQL
   Editor; record it in the ledger below.
2. Auth → Email Templates → Magic Link: include `{{ .Token }}` so mobile OTP sends a 6-digit code. Set OTP expiry,
   enable secure email change, configure custom SMTP (or Resend).
3. Vercel project (Node 22; Pro plan at launch): set the env vars listed in `docs/ENV.md`. Deploy.
4. Sign up once on the deployed site, then run the `super_admins` INSERT at the bottom of `9999_init.sql`.
5. Create the first church in `/admin`, invite or create its first org admin.
6. Expo: `npx eas-cli init`, Firebase project → `google-services.json` (EAS file env var `GOOGLE_SERVICES_JSON`),
   FCM v1 service-account key via `eas credentials`, then `npx eas-cli build -p android --profile preview`.
7. Stripe: test keys + `stripe listen --forward-to localhost:3000/api/stripe/webhook`; set `STRIPE_PRICE_ID`.

## Applied migrations (hosted Supabase)

| file | pasted on | by |
|---|---|---|
| _(none yet)_ | | |

## Founder's feature checklist

| Feature | Schema | Web UI | Mobile UI |
|---|---|---|---|
| Super admin creates churches, settings, billing | planned | planned | — |
| Org admin settings (sharing, share-link password) | planned | planned | — |
| Users + 12 permission toggles | planned | planned | — |
| Sermons: upload / link / delete, share links | planned | planned | planned (playback) |
| Announcements + push | planned | planned | planned |
| Bulletins (Sunday / quarter) | planned | planned | planned |
| Documents | planned | Phase 2 | Phase 2 |
| Directory (households, persons, photos, privacy override) | planned | Phase 2 | Phase 2 |
| Calendars (All/Youth/Men/Women + custom), member submission | planned | Phase 2 | Phase 2 |
| Surveys (audience groups, per person / per household) | planned | Phase 3 | Phase 3 |
| iOS build | — | — | Phase 3 |

## Decisions (do not re-open without the founder)

- Expo/React Native; Next.js App Router on Vercel; Supabase; Stripe subscriptions; push to `main`.
- Sermon media: Supabase Storage uploads **and** external links (unlisted YouTube, Dropbox, Google Drive, any https).
- "All attendees" = everyone who attends, members included. System groups: All attendees, Members,
  Non-member attendees, Youth, Men, Women + custom.
- Fellowship directory: adults only by default; children only if the family opts in; admin-entered households
  start hidden from the fellowship until a family adult confirms; leaders can only make a family *more* private.
- Timezone America/New_York for logs and as the default church timezone.
- No Supabase Edge Functions / pg_cron: Next.js Route Handlers + DB triggers + one Vercel Cron.
- Permissions are exactly the founder's 12 toggles; other capabilities map onto them (see `docs/RLS.md`).
- Families may hide from their own congregation as well as from the fellowship (both toggles in the UI).
- Each church sets its own youth/adult ages in settings.
- Share links may allow downloads of uploaded media when the church turns `sermon_share_allow_download` on.
- Billing: $50 / month / church flat via one Stripe Price; 30-day trial; only `suspended` blocks writes.
- Surveys (Phase 3): the head of house answers per-person surveys for household members without accounts.
- App name Anacast, Android package id **`com.anacast.app`** (lowercase confirmed by the founder 2026-09-07).
- Supabase Free plan to start (50 MB upload cap), Vercel Pro at launch.
- Account archival (2026-09-07): the self-service action is **Deactivate**, which archives the account so the super admin
  can restore it later; real **Delete account** stays available in-app and on the web because Google Play requires it,
  with a 30-day grace during which the user or the super admin can cancel (orchestrator decision 15 in the TODO kit).
- Privacy policy and terms are a real step (6.6, founder+agent) before the App Store and Play listings (2026-09-07).
  A placeholder policy lives at `docs/legal/privacy-policy.md`; the founder's lawyers replace it before go-live.

## Added by plan (founder may veto)

`billing_mode` manual/free, `trial_ends_at`, announcement `pinned`/`expires_at`, share-link `max_views`,
`hide_from_congregation` household flag (column only, no UI), `org-assets` logo bucket, audit log,
account-deletion request flow (Play Store requirement), GitHub Actions CI workflow.

## Founder answers to the plan's open questions (2026-09-03, session 002)

The ten questions in `docs/PLAN.md` §13 were answered by the founder. Defaults stand where no answer was given.

| # | Question | Answer | Consequence for the build |
|---|---|---|---|
| 1 | Family can hide from its **own congregation**? | **Yes** | `households.hide_from_congregation` gets a real UI toggle (household adults any direction; org admins only toward privacy). |
| 2 | Fellowship viewers see phones/emails? | **Default** | Fellowship level sees everything the congregation sees minus birth year, anniversary year and leader notes. |
| 3 | Youth 13+ in men's/women's; adults 18+? | **Each church sets its own youth age** | `youth_min_age` / `youth_max_age` / `adult_min_age` / `youth_excludes_married` / `adult_groups_include_youth` are editable per church in `/o/[slug]/settings` (defaults 13 / 25 / 18 / on / on). No schema change. |
| 4 | Accept the permission mapping? | _(not answered)_ | Ship the mapping in `docs/RLS.md` as the default; extra toggles can be added later by a `9998_*` migration. |
| 5 | Share links: stream only, min password 8, `sermons.upload` too? | **Downloads allowed when the church allows it** | New `organization_settings.sermon_share_allow_download` (default **false**) goes into `9999_init.sql` (not yet pasted anywhere). Share page shows a Download button for **uploaded** media only when the setting is on; external links keep "open at provider". Min password 8 and `sermons.link`/`sermons.upload` holders unchanged. |
| 6 | Push on every bulletin upload? | **Yes** | `push_on_bulletin` default true, per-church toggle in settings. |
| 7 | Billing | **$50 per month per church, flat**; usage-based plan later | One Stripe recurring Price (`STRIPE_PRICE_ID`); trial 30 days (`trial_ends_at`); only `suspended` blocks writes; `past_due` shows a banner only. |
| 8 | Who answers per-person surveys for household members without accounts? | **Head of house** (`household_role = 'head'`), or an adult designated head when there is no father | Phase 3: the head of house may submit `per_person` responses on behalf of household members without accounts; head-of-house designation editable by directory admins and by the household. |
| 9 | App display name / Android package id | **`com.Anacast.app`** → display name **Anacast** | Recorded as given. Recommendation: use lowercase `com.anacast.app` (package ids are conventionally lowercase and cannot change after the first Play upload) — founder to confirm. Brand colours and production domain still open. |
| 10 | Supabase plan / Vercel plan | **Supabase Free** (US East), **Vercel Pro** at launch | Free plan: 50 MB per upload, 1 GB storage, 500 MB database, 5 GB egress, project pauses after 7 idle days. Sermon uploads are capped at 50 MB (`NEXT_PUBLIC_MAX_UPLOAD_MB=50`); "link your own recording" is the lever. Upgrade to Pro raises the cap. |

## Still open for the founder

1. ~~Production domain~~ — **answered 2026-09-08: none yet; Vercel's generated domain until the features work** (decision 31).
   Re-open when a real domain is bought (App Links, store privacy URL and Supabase redirects must then be updated).
2. Explicit yes/no on the permission mapping (DESIGN §5 table; `docs/RLS.md` is written by step 1.5, so it does not exist yet).
3. Legal entity for the privacy policy and terms (step 6.6) — **2026-09-08: not decided; candidates Elevare Holdings LLC or
   CodeFuse Solutions.** Placeholders stay until chosen; postal address, governing state and privacy contact email also needed.
4. Confirm the 30-day deletion grace and the self-restore-on-sign-in default in orchestrator decision 15.
5. Confirm the token roles suggested for the brand palette (below), or assign your own.
6. Merge to `main` as soon as `docs/TODO.md` is generated, or after founder review?
7. Delete the stale remote branches `claude/plan-todo-prompts-ia7gkd` (merged) and `claude/plan-todo-prompts-w3madd` (record-only)?

## Brand palette (founder, 2026-09-07)

| Name | Hex | Suggested token (founder may change) |
|---|---|---|
| Prussian Blue | `#00072d` | `ink` — body text on light surfaces, darkest dark-mode surface, splash |
| Deep Navy | `#001c55` | `primaryDark` — headers, pressed states, dark-mode surfaces |
| Imperial Blue | `#0a2472` | `primary` — buttons, links, app bar |
| Bright Marine | `#0e6ba8` | `accent` — secondary buttons, active tab, focus rings (white text on it: 5.7:1, AA) |
| Icy Blue | `#a6e1fa` | `tint` — backgrounds, badges, selected rows; never text on white (1.4:1) |

One token file per app (web Tailwind tokens / `theme.ts`, mobile `theme.ts`); store assets use the same values.
Recorded as orchestrator decision 17 in the TODO kit.

## Version pins worth remembering

Node 22, pnpm 10, TypeScript ~5.9 (TS 7 is out but unsupported by typescript-eslint), ESLint 9,
Next 16.3, Expo 57.0 / React Native 0.86.3 / React 19.2.3 (exact), supabase-js 2.112, Stripe 22.6, Zod 4.5.
