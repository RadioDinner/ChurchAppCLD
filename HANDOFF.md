# HANDOFF — live project state (update every session)

_Last updated: 2026-09-03, session 001._

## What this is

ChurchAppCLD is a multi-tenant church platform for Anabaptist/Mennonite congregations: sermons (uploaded or
linked), push-notified announcements, bulletins/documents, a privacy-controlled member directory, calendars
with member event submission, and audience-targeted surveys. Super admin (the founder) creates churches and
manages Stripe billing; church leaders administer their congregation on the web; members use the Expo app.

Design document: see `docs/` and the plan summary below. Stack: pnpm monorepo, Next.js 16 on Vercel,
Expo SDK 57 (EAS Build), Supabase (Postgres + Auth + Storage), Stripe.

## State

- [x] Session conventions (`CLAUDE.md`, `new_session_instructions.md`, `Session log/`) and the approved plan (`docs/PLAN.md`, `docs/DESIGN.md`)
- [ ] Monorepo scaffold (not started; a premature scaffold was reverted in session 001)
- [ ] `supabase/migrations/9999_init.sql` + local shim + RLS tests
- [ ] `@church/domain`, `@church/db`, `@church/supabase-client`
- [ ] Web: auth, super admin, org admin (users/permissions, settings, sermons, share links, announcements, bulletins, push, cron)
- [ ] Mobile: auth, feed, sermon playback, push registration, EAS config
- [ ] Phase 2: directory UI (web + mobile), calendars/events, documents, custom groups, join codes

## Environment status (founder to-dos, in bootstrap order)

1. Create the Supabase project (Pro recommended; US East). Paste `supabase/migrations/9999_init.sql` in the SQL
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

## Added by plan (founder may veto)

`billing_mode` manual/free, `trial_ends_at`, announcement `pinned`/`expires_at`, share-link `max_views`,
`hide_from_congregation` household flag (column only, no UI), `org-assets` logo bucket, audit log,
account-deletion request flow (Play Store requirement), GitHub Actions CI workflow.

## Open questions for the founder

1. Should a family also be able to hide from its own congregation?
2. Fellowship viewers: phones/emails too, or names + address only? (Default: everything minus birth/anniversary years and notes.)
3. Men's/Women's include youth 13+ by default; adults are 18+ for fellowship visibility — OK?
4. Accept the permission mapping in `docs/RLS.md`, or add toggles later?
5. Share links: stream only, min password 8, also for `Upload sermons` holders — OK?
6. Push on every bulletin upload (per-church toggle, default on)?
7. Billing: monthly price, trial length (default 30 days), does `past_due` restrict anything?
8. May a household adult answer per-person surveys for a spouse without an account?
9. App display name, Android package id (placeholder `com.churchappcld.app`), brand colours, production domain.
10. Supabase region/plan and Vercel Pro at launch.

## Version pins worth remembering

Node 22, pnpm 10, TypeScript ~5.9 (TS 7 is out but unsupported by typescript-eslint), ESLint 9,
Next 16.3, Expo 57.0 / React Native 0.86.3 / React 19.2.3 (exact), supabase-js 2.112, Stripe 22.6, Zod 4.5.
