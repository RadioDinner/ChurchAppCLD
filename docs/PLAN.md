# ChurchAppCLD — Church management platform: architecture & build plan

## Context

RadioDinner/ChurchAppCLD is an empty repository (zero commits, zero branches). The founder wants a
multi-tenant "service" for Anabaptist/Mennonite congregations: sermon recordings (uploaded or linked),
push-notified announcements, bulletins and documents, a member directory with congregation- and
fellowship-level sharing controls plus an absolute per-family opt-out, multiple church calendars with
member event submission, and surveys targeted at audience groups with per-person or per-household
response modes. A super admin (the founder) creates churches and manages settings and Stripe billing.
Church leaders log in as organization admins and manage settings, users and 12 granular permissions.

The plan below is the synthesis of a design workflow (3 independent architecture proposals, 3 judges,
3 adversarial critics, one revision). The full revised design document (104 KB, with SQL sketches and
the complete policy catalogue) is at
`docs/DESIGN.md`
— consult it while implementing; this file is the executable summary.

### Decisions made with the founder in this session

| Decision | Choice |
|---|---|
| Mobile stack | Expo SDK 57 / React Native (TypeScript), shared pnpm monorepo with the Next.js web app; EAS Build for Android first, iOS later |
| Web stack | Next.js 16 App Router on Vercel |
| Backend | Supabase: Postgres, Auth, Storage. **No Edge Functions, no pg_cron** — server code is Next.js Route Handlers/Server Actions + DB triggers + one Vercel Cron |
| Billing | Stripe Customer + Subscription per church, webhook syncs to Supabase; `billing_mode` = stripe / manual / free; ships behind env vars |
| Sermon media | Supabase Storage uploads (TUS) **and** external links: unlisted YouTube, Dropbox, Google Drive, any https URL |
| Git | Push to **`main`** directly after every step (founder's standing instruction #6). Repo is on `claude/church-management-platform-0wb3qz` with no commits: `git checkout -b main`, first push `-u origin main` |
| Scope this session | Ship Phase 1 completely, then continue into Phase 2 (directory + calendars) as context allows |
| "All attendees" | Everyone who attends, members included. System groups: All attendees (everyone), Members, Non-member attendees, Youth, Men, Women, + custom |
| Fellowship directory privacy | Adults only by default; children shown only if the family opts in; admin-entered households start hidden from the fellowship until a family adult confirms; leaders can only move a family toward **more** privacy |
| Timezone | `America/New_York` for session-log timestamps and as the default `organization_settings.timezone` |
| Session conventions | The uploaded `new_session_instructions.md` goes in verbatim; `CLAUDE.md` imports it with `@new_session_instructions.md` and `@HANDOFF.md`; `Session log/001_2026-09-01/{prompt_history.txt,session_log.md}`; migrations descending from `9999_init.sql`, re-runnable |

### Environment facts
Node 22.22, pnpm 10.33, `npx supabase` 2.116, `npx eas-cli` 23.2, `npx vercel` 59, Playwright + Chromium.
PostgreSQL 16.13 installed (cluster `main` down; run as `postgres` user or `initdb` in the scratchpad) — Docker daemon is
**down**, so no `supabase start`. No Android SDK (EAS only). No Supabase project or Stripe keys yet.

---

## 1. Architecture summary

1. **Authorization lives in Postgres.** RLS on every table and on `storage.objects`; `anon` gets zero table/function grants;
   PUBLIC `execute` is revoked on all functions and re-granted per role; all helpers `security definer set search_path = ''`;
   secrets (share-link token hashes, bcrypt password hashes, invitation token hashes, rate limits) live in a non-exposed
   `private` schema. `app.assert_same_org()` triggers on every child table make cross-org FK references impossible.
   **No `force row level security`** (the helper scheme relies on owner bypass; migration asserts `rolbypassrls`).
2. **Permissions are exactly the founder's 12 toggles**, rows in `org_membership_permissions` (enum `permission_key`),
   checked by `app.has_perm(org, perm)` / `org_id = any((select app.perm_org_ids('…')))` (InitPlan, once per statement).
   TS 12-tuple in `packages/domain` held in parity with the DB enum by a type test. Unnamed capabilities are **mapped**
   onto existing toggles (no 13th permission) — see §4.
3. **Directory privacy is one function**: `app.household_view_level(org_id, household_id, hide_cong, hide_fell)` →
   `none | fellowship | congregation | household | admin`. Sensitive columns (`birthdate`, `anniversary`) are excluded from
   the client's column-level `select` grant on `persons`/`households`; leader notes live in admin-only tables; all directory
   reads go through owner-privileged, `security_barrier` views `directory_persons` / `directory_households` that filter and
   mask (birth-year masking, adults-only for fellowship). All directory writes go through RPCs.
4. **Households are the unit** (`persons.household_id NOT NULL`; single adults get a one-person household). `member` vs
   `attendee` is leader-set; youth/men/women are derived with per-org age settings and a per-person override; derived groups
   exclude inactive/deceased; minors never in men/women and never shown to other congregations unless the household opts in.
5. **Sermons**: private bucket + TUS resumable uploads + signed URLs, or external link via a pure TS `parseMediaLink()` shared by
   both apps. YouTube on mobile plays through a page **we host** (`/embed/yt/[id]`) inside `react-native-webview` (referer
   requirement). Share links: 32-byte token hashed in Node (sha256), optional bcrypt password (min 8), DB rate limits,
   re-validated against the org's *current* `sermons_shareable` and the sermon's published state on every hit.
6. **Push**: fan-out resolved once in SQL (`srv_audience_user_ids`, active memberships only), dispatched by a Route Handler
   synchronously on publish and retried by the single cron (`/api/cron/tick`) with `for update skip locked` claiming.
   Scheduled publishing = `publish_at` column enforced in RLS, not a job.
7. **Billing**: Stripe Customer created up front, Checkout with `customer=`, webhook with raw-body verification, 503 when the
   secret is missing, 500 on handler error (Stripe retries), out-of-order events ignored by `event_created`.
8. **Verification without Docker**: local PG16 + `auth`/`storage`/`extensions` shim; apply `9999_init.sql` **twice**; plain-SQL
   RLS assertion files that also run verbatim in the hosted SQL editor; `supabase gen types --db-url`; Vitest; Playwright smoke;
   `expo-doctor` + `expo export --platform android`.

## 2. Monorepo layout

```
ChurchAppCLD/
├─ CLAUDE.md                     # line 1 "@new_session_instructions.md", line 2 "@HANDOFF.md"; repo map; migration
│                                #   re-runnability rules per construct; "update new_session_instructions" procedure
├─ new_session_instructions.md   # founder's file VERBATIM (from /root/.claude/uploads/.../afc5121c-new_session_instructions.md)
├─ HANDOFF.md                    # live state: what exists, env status, Applied-migrations (hosted) ledger, founder feature
│                                #   checklist w/ "not yet in UI", Added-by-plan (veto-able) list, founder to-dos, version pins
├─ README.md
├─ Session log/001_2026-09-01/{prompt_history.txt, session_log.md}
├─ package.json  pnpm-workspace.yaml (nodeLinker: hoisted; onlyBuiltDependencies; catalog:)  turbo.json  tsconfig.base.json
├─ .nvmrc(22) .prettierrc .editorconfig .gitignore (.env*, !.env.example, google-services.json)  .env.example  vercel.json
├─ .github/workflows/ci.yml      # single non-blocking workflow
├─ docs/{ENV,MIGRATIONS,RLS,MEDIA,MOBILE_BUILD,CHECKLIST_SECURITY}.md
├─ apps/web/                     # Next.js 16: app/{(public),(auth),(super),(org),api}, proxy.ts, src/{lib,features,components/ui}, e2e/
├─ apps/mobile/                  # Expo 57 + expo-router: app/{(auth),(app)/(tabs)}, src/{lib,features,components}, app.config.ts, eas.json, metro.config.js
├─ packages/domain/              # @church/domain: permissions, audiences, media-links, schemas/*, limits, dates, errors; fixtures/persons.json
├─ packages/db/                  # @church/db: database.types.ts (generated), rpc.ts, queries/*, keys.ts, type-tests/enum-parity.test-d.ts
├─ packages/supabase-client/     # @church/supabase-client: createWebBrowserClient, createMobileClient (LargeSecureStore + processLock)
├─ tooling/{eslint-config,tsconfig}/
├─ supabase/{config.toml, migrations/9999_init.sql, seed/dev_seed.sql, tests/{00_shim.sql,helpers.sql,rls/01..09_*.sql}, README.md}
└─ scripts/{db/{local-up,apply-migrations,test,gen-types,check-rerunnable}.sh, session/new-session.sh}
```

Tooling: pnpm workspaces + Turborepo 2.10; `catalog:` holds only web-shared deps that `expo install` does not manage
(`react`/`react-dom` **19.2.3** exact = Expo 57 pin, `@types/react ~19.2`, `typescript ~5.9.3`, `zod`, `@supabase/supabase-js`,
`@tanstack/react-query`, `date-fns`); all `expo-*`/`react-native-*` versions are literals produced by `npx expo install`.
Packages exported as TS source (`"exports": {".": "./src/index.ts"}`, Next `transpilePackages`, Metro resolves exports natively).
ESLint 9 flat config (not 10: `eslint-config-expo` unvalidated). Next 16 uses `proxy.ts` (not `middleware.ts`).

## 3. Stack & pins (verified 2026-09-01 via `npm view` / Expo `bundledNativeModules.json`)

| Area | Packages |
|---|---|
| Web | `next` 16.3.4, Tailwind 4.3, shadcn/ui, `react-hook-form` 7.87 + `@hookform/resolvers` 5.9 (zod v4), `sonner`, `lucide-react` |
| Shared | `zod` 4.5.4, `@tanstack/react-query` 5.102, `date-fns` 4.4 + `@date-fns/tz` |
| Supabase | `@supabase/supabase-js` 2.112.4, `@supabase/ssr` 0.12.5, CLI 2.116 via npx |
| Uploads / billing / push / share | `tus-js-client` 4.3.1, `stripe` 22.6.1, `expo-server-sdk` 7.2.0, `jose` 6.2, `resend` 6.25 (optional) |
| Mobile core | `expo` 57.0.19, `react-native` **0.86.3**, `expo-router` ~57.0.18, `react-native-screens` ~4.26, `react-native-safe-area-context` ~5.7, `react-native-reanimated` 4.5.1 + `react-native-worklets` 0.10.1, `react-native-gesture-handler` ~2.32, `@expo/metro-runtime` |
| Mobile media | `expo-video` 57.0.3, `expo-audio` 57.0.4 (never `expo-av`), `react-native-webview` 13.16.1 |
| Mobile auth/storage | `expo-sqlite` (kv-store), `expo-secure-store`, `expo-crypto`, `aes-js` (LargeSecureStore), `react-native-url-polyfill` |
| Mobile misc | `expo-notifications`, `expo-device`, `expo-constants`, `expo-file-system`, `expo-image`, `expo-linking`, `expo-web-browser`, `expo-intent-launcher`, `expo-dev-client`, `expo-build-properties`, `react-native-paper` 5.15 |
| Tooling/tests | `turbo` 2.10.12, `typescript` ~5.9.3, `eslint` 9, `typescript-eslint` 8, `prettier` 3.9, `vitest` 4.1, `@playwright/test` 1.62, `eas-cli` 23.2 via npx |

## 4. Data model (all in `supabase/migrations/9999_init.sql`)

Schemas: `public` (tables, views, client RPCs, and server-only `public.srv_*` RPCs — PostgREST only exposes `public`),
`app` (SQL-only helpers for policies/triggers), `private` (secrets). uuid PKs, `created_at/updated_at` + touch trigger,
`org_id` + index on every tenant table, `extensions.citext` for emails, policies named `ca_<table>_<op>_<who>`.
Hard org deletion forbidden (status `cancelled`, purged by cron after 30 days).

**Enums**: `permission_key` (`sermons.upload, sermons.delete, sermons.link, announcements.create, announcements.delete,
announcements.edit, bulletins.upload, documents.upload, users.create, users.delete, users.edit_permissions, org.settings`),
`org_status` (trial, active, past_due, suspended, cancelled), `billing_mode`, `subscription_status` (+ none, unknown),
`membership_status` (pending, active, disabled), `congregation_status` (member, attendee, inactive), `sex`, `marital_status`,
`household_role` (head, spouse, child, other), `birthdate_visibility` (full, month_day, hidden), `media_kind` (upload, youtube,
dropbox, google_drive, url), `audience_kind` (everyone, members, attendees, youth, men, women, custom), `calendar_kind`,
`event_status`, `survey_status`, `response_mode` (per_person, per_household), `question_kind`, `notification_kind`,
`notification_status`, `push_platform`, `join_request_status`. Each created inside a `do $$ if not exists` guard.

**Tables** (38 public + 3 private):
- Tenancy: `organizations` (super-admin-owned: slug, name, status, billing_mode, trial_ends_at, contact_email),
  `organization_settings` (1:1, governed by `org.settings`: timezone default America/New_York, logo_path,
  `directory_share_in_congregation` t, `directory_share_with_fellowship` f, `fellowship_directory_adults_only` t,
  `sermons_shareable` f, `sermon_share_requires_password` t, `youth_min_age` 13, `youth_max_age` 25, `adult_min_age` 18,
  `youth_excludes_married` t, `adult_groups_include_youth` t, `members_can_submit_events` t, `events_require_approval` t,
  `push_on_bulletin` t; check `fellowship ⇒ congregation`), `fellowships`, `fellowship_memberships` (m:n), `profiles`
  (trigger-created from `auth.users`), `super_admins`, `org_memberships` (unique org+user, status), `org_membership_permissions`
  (PK membership+permission; last-manager guard trigger), `invitations` (+ `private.invitation_secrets`), `join_codes`,
  `join_requests` (schema only; UI Phase 2), `account_deletion_requests`.
- Directory: `households` (address, home_phone, photo_path, anniversary, `hide_from_fellowship`, `hide_from_congregation`,
  `show_children_in_fellowship`, `privacy_confirmed_by/at`, `created_via`), `household_leader_notes`, `persons`
  (`household_id NOT NULL`, `user_id` null w/ partial unique `(org_id, user_id)`, names, sex, birthdate, birthdate_visibility,
  marital_status, household_role, congregation_status, member_since, youth_override, directory_listed, email, phones,
  photo_path, deceased_on), `person_leader_notes`.
- Content: `sermons` (media_kind, storage_path | external_url, publish_at null = draft; shape/https/path checks),
  `sermon_share_links` (+ `private.share_link_secrets` token_hash/password_hash), `announcements` (audience_group_id,
  publish_at, expires_at, pinned, push), `bulletins` (`starts_on`/`ends_on` date range covers Sunday and quarterly),
  `documents`, `audience_groups` (6 system rows per org + custom), `audience_group_members`, `calendars` (all/youth/men/women
  + custom; view/submit audience groups), `events` (status; trigger forces `pending` + `push=false` unless `announcements.create`).
- Surveys (schema now, UI Phase 3, no anonymous mode): `surveys` (audience_group_id, response_mode, allow_edit, status, window;
  shape frozen after draft), `survey_questions`, `survey_responses` (`scope_key` unique per survey, stamped by trigger from caller
  identity), `survey_answers` (composite FK to question+survey).
- Notifications: `push_devices`, `notification_preferences`, `notifications` (outbox), `notification_deliveries`.
- Billing/ops: `billing_customers`, `billing_subscriptions` (enum status + `status_raw` + `event_created`; mirror trigger to
  `organizations.status` when `billing_mode='stripe'`), `stripe_events`, `audit_log` (trigger-fed), `storage_deletions`,
  `private.rate_limits`.

**Derivation** (`app.person_in_kind`): base = `congregation_status in ('member','attendee') and deceased_on is null`;
`is_minor` = role child or age < adult_min_age; `is_adult` = role head/spouse or age ≥ adult_min_age; `youth` =
`coalesce(youth_override, age in [youth_min, youth_max] and (not youth_excludes_married or not married))`; `men/women` =
sex ∧ not minor ∧ (adult_groups_include_youth or not youth). Age computed in the org timezone. Mirrored in
`packages/domain/src/audiences.ts`; SQL test and Vitest share `packages/domain/fixtures/persons.json`.

**Key helper functions** (`app.*`, all `security definer set search_path=''`): `is_super_admin`, `member_org_ids()`,
`perm_org_ids(perm)`, `directory_admin_org_ids()` (= `users.create` ∪ `org.settings`), `my_household_ids()`,
`fellowship_visible_org_ids()`, `has_perm`, `has_any_perm`, `org_writable(org)`, `require_user()`, `require_writable(org)`,
`household_view_level(org, hh, hide_cong, hide_fell)`, `person_age`, `is_minor`, `is_adult`, `can_edit_household`,
`my_person_id(org)`, `user_in_group(group)`, `can_read_object/can_write_object(bucket, name)`; trigger fns `touch_updated_at`,
`assert_same_org`, `audit_row`, `on_org_created` (settings + 6 groups + 4 calendars), `on_auth_user_created/updated`,
`guard_last_org_manager`, `guard_persons_columns`, `guard_household_privacy_columns` (direction rule),
`force_event_pending`, `freeze_survey_shape`, `stamp_response_scope`, `validate_timezone`, `enqueue_storage_deletion`,
`cancel_notifications_on_delete`, `on_content_publish`, `mirror_subscription_status`, `rate_limit_hit`.

**Client RPCs** (`public.*`, granted to `authenticated`, each starts with `require_user()`; mutating ones `require_writable`):
`my_context()`, `set_membership_permissions`, `set_membership_status`, `remove_membership`, `create_invitation`
(perms non-empty requires `users.edit_permissions`), `revoke_invitation`, `accept_invitation` (creates one-person household
when no person linked; merges for existing members), `save_household(jsonb)`, `save_person(jsonb)`, `delete_person`,
`set_household_privacy(hh, hide_fell, hide_cong, show_children)` (adults any direction + stamps confirmation; admins only
toward privacy; super any), `save_leader_notes`, `set_congregation_status`, `create_share_link` (returns raw token once),
`revoke_share_link`, `submit_survey_response`, `request_account_deletion`.
**Server-only RPCs** (`public.srv_*`, `service_role` only): `srv_resolve_share_link(token_hash, password, ip_hash)`,
`srv_audience_user_ids(group, org)`, `srv_enqueue_due_notifications()`, `srv_claim_notifications(limit)`,
`srv_attach_user(user, org, person, display_name, perms)`, `srv_process_account_deletions()`, `srv_housekeeping()`.

**Permission mapping for unnamed capabilities** (documented in `docs/RLS.md` and checkbox tooltips):
directory admin = `users.create` or `org.settings`; invite/create accounts = `users.create` (granting perms also needs
`users.edit_permissions`); remove access = `users.delete`; approve events = `announcements.edit`, calendar CRUD =
`org.settings`; custom groups = `announcements.create` or `org.settings`; surveys = `announcements.create/edit/delete`;
share links = `sermons.link` or `sermons.upload`; billing status/audit = `org.settings`.

**Migration skeleton** (every migration): (0) assert owner `rolbypassrls` → (1) extensions/schemas + default-privilege revokes
→ (2) guarded enums → (3) `create table if not exists` (later changes `add column if not exists`) → (4) drop all `ca_%` policies
and our views → (5) `create or replace function` → (6) views → (7) `drop trigger if exists` + `create trigger` → (8) enable RLS +
policies → (9) revoke PUBLIC execute on all functions, grant precisely → (10) `storage.buckets` upsert → (11) commented
`super_admins` bootstrap INSERT. Enum value additions go in their own paste (`9998a_enum.sql` / `9998b_use.sql`).
`9999_init.sql` is frozen after the founder's first production paste.

## 5. RLS strategy (summary; full catalogue in the design doc §6)

Baseline: every public table `enable row level security` (no force); `revoke all on all tables in schema public from anon`;
`persons`/`households` column-level `select` for `authenticated` excluding `birthdate`/`anniversary`; RPC-only tables have no
write grants for `authenticated`; base-table select policies for `persons`/`households` are
`exists (select 1 from directory_persons d where d.id = persons.id)`. Members read `sermons`/`announcements`/`bulletins`/
`documents` when `publish_at <= now()` (and `user_in_group` for targeted content); managers by permission. `organizations`
readable by members and fellowship-visible orgs (so the fellowship tab can show church names). `profiles` readable by own
row and by `users.*` holders of a shared org. `storage.objects`: `ca_storage_select` (`can_read_object`) and
`ca_storage_insert` (`can_write_object`: a row exists whose path **equals** `name` and caller holds the permission) only —
no update/delete for `authenticated`; deletions via `storage_deletions` + service role.

**Directory rule, stated once**: Church A member sees a Church B household iff B has `directory_share_with_fellowship`
(which requires `directory_share_in_congregation`), B not suspended/cancelled, A and B share a fellowship, household has
neither hide flag, person is listed, not inactive/deceased, and is an adult unless `show_children_in_fellowship`.
Fellowship level never sees birth years, anniversary years, privacy flags or leader notes.

## 6. Storage & media

Buckets (all private, signed URLs 1 h, TanStack caches 50 min, re-mint on 403): `sermon-media`
(`{org}/sermons/{id}/{uuid}.{ext}`, 2 GiB, audio/video MIME allow-list), `bulletins` (25 MiB pdf/jpg/png), `documents`
(50 MiB allow-list), `directory-photos` (10 MiB), `org-assets` (5 MiB, no SVG). Upload flow: insert row with `publish_at
null` and the exact planned path → TUS upload (`chunkSize 6 MiB`, `uploadDataDuringCreation`, `x-upsert: 'false'`,
contentType from the File) → update size/mime → set `publish_at`. Mobile photos (Phase 2) upload `ArrayBuffer`, never Blob.

`parseMediaLink(url, 'web'|'mobile')` in `packages/domain/src/media-links.ts` → `{kind, externalId, canonicalUrl, embedUrl,
streamUrl, strategy}`; YouTube → web iframe `youtube-nocookie`, mobile → hosted `/embed/yt/{id}` in WebView; Dropbox →
`raw=1` native stream for audio/mp4 else open external (warn: Basic 20 GB/day); Drive → web iframe preview, mobile open
external; other https → native stream for mp3/m4a/mp4/m3u8 else open external; `http://` rejected (Zod + DB check).

Share flow: `/s/[token]` (Node runtime, service client) → `sha256(token)` + `sha256(ip+secret)` → `srv_resolve_share_link`
→ password form → `POST /api/share/[token]/unlock` → jose-signed HttpOnly cookie (24 h) → signed URL / embed. Headers:
`noindex`, `no-referrer`, CSP `frame-src youtube-nocookie.com drive.google.com`. Android bulletin PDFs: download to cache
→ `expo-intent-launcher` ACTION_VIEW.

## 7. Server-side logic (Next.js only)

| Concern | Where |
|---|---|
| CRUD | user-scoped Supabase client under RLS via `@church/db/queries/*` |
| Multi-row invariants | `public.*` RPCs; errors `raise … using errcode` mapped in `@church/domain/errors.ts` |
| Direct user creation | Server Action `createUserDirect` (verifies `users.create` with user client) → service `auth.admin.createUser({email, password, email_confirm: true})` → `srv_attach_user` |
| Stripe | `POST /api/billing/checkout`, `/api/billing/portal` (super admin); `POST /api/stripe/webhook` (raw body, `force-dynamic`, 503 w/o secret, `stripe_events` idempotency, fetch subscription from Stripe, ignore stale `event_created`, 500 on error) |
| Share | `/s/[token]` page + `/api/share/[token]/unlock` |
| YouTube host | `GET /embed/yt/[id]` (public, noindex, frame-able) |
| Invitations | Server Action → Resend if `RESEND_API_KEY`, else return the link for copy/paste |
| Push | `src/lib/push/dispatch.ts`: `srv_claim_notifications` → re-read referenced row → `srv_audience_user_ids` ∩ preferences ∩ devices → `expo-server-sdk` chunks → `notification_deliveries`; called on publish (`maxDuration 60`) and by cron |
| Cron | `GET /api/cron/tick` (`Authorization: Bearer $CRON_SECRET`): enqueue due → dispatch → receipts → drain storage deletions → orphan sweep → `srv_housekeeping` → `srv_process_account_deletions`. `vercel.json` Hobby `0 12 * * *`; Pro `*/5` documented |

`proxy.ts` refreshes the session cookie and redirects unauthenticated `(super)`/`(org)`; matcher excludes
`/api/stripe/webhook`, `/api/cron/tick`, `/s/*`, `/embed/*`, static. Env vars documented in `docs/ENV.md` (accept both
`sb_publishable_/sb_secret_` and legacy anon/service keys): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`, `SHARE_LINK_COOKIE_SECRET`, `CRON_SECRET`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `RESEND_API_KEY`/`RESEND_FROM`, mobile `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_WEB_URL`, EAS `EAS_PROJECT_ID`, `GOOGLE_SERVICES_JSON`; local `DATABASE_URL`.

## 8. Web route map (`apps/web/app`)

- `(public)`: `/`, `/s/[token]`, `/embed/yt/[id]`, `/privacy`, `/terms`
- `(auth)`: `/login` (password + OTP), `/signup`, `/auth/callback`, `/auth/reset`, `/invite/[token]` ("Open in app")
- `(super)` `/admin/*` (`requireSuperAdmin`): churches list, `/admin/churches/new`, `/admin/churches/[orgId]` (Details, Settings,
  Fellowships, Admins → invite/create first admin with all 12, Billing → checkout/portal/billing_mode/trial), `/admin/fellowships`,
  `/admin/fellowships/[id]`, `/admin/super-admins`
- `(org)` `/o/[orgSlug]/*` (`requireOrgMember` + `requirePerm` per page/action): `/dashboard`, `/sermons`, `/sermons/new`
  (Upload | Link tabs), `/sermons/[id]` (edit + share-links panel), `/announcements`, `/announcements/new`,
  `/announcements/[id]/edit`, `/bulletins` ("This Sunday" / "Quarter" presets), `/users` (12-checkbox grid under 3 role headers,
  Invite dialog, Create-account dialog, disable/remove), `/users/[membershipId]`, `/invitations`, `/settings`, `/settings/billing`.
  Phase 2: `/directory/*`, `/calendars`, `/events/pending`, `/documents`, `/groups`, `/join-codes`, `/join-requests`.
  Phase 3: `/surveys/*`, `/audit`.
- `api/`: `stripe/webhook`, `billing/checkout`, `billing/portal`, `share/[token]/unlock`, `cron/tick`

UI: Tailwind 4 + shadcn/ui, RHF + zodResolver, TanStack Query, sonner. Permission grid debounces `set_membership_permissions`;
checkboxes disabled with tooltip when the actor lacks `users.edit_permissions`. `hide_from_congregation` toggle hidden in UI
(column exists) pending founder answer.

## 9. Mobile screen map (`apps/mobile/app`)

- `(auth)/sign-in` (OTP-first + password), `verify-otp`, `invite/[token]`, `no-church`
- `(app)/_layout` (session + ≥1 active membership; org switcher), `(tabs)/home` (pinned + recent announcements, current
  bulletin), `(tabs)/sermons`, `(tabs)/more` (Bulletins, Notification settings, Switch church, Sign out); stacks `sermons/[id]`,
  `announcements/[id]`, `bulletins/[id]`, `settings/notifications`. Phase 2: `directory/*`, `household/*`, `events/*`.
- Auth: `createMobileClient()` — `react-native-url-polyfill/auto` first import, `LargeSecureStore`, `lock: processLock`,
  `detectSessionInUrl: false`, AppState → `startAutoRefresh`. OTP requires the founder to add `{{ .Token }}` to the Magic Link
  email template.
- Playback: `SermonPlayer` dispatches on strategy → `expo-audio` (background, lock-screen), `expo-video`, WebView on hosted
  YouTube page, `expo-web-browser` for external.
- Push: explainer → Android channel `announcements` → `requestPermissionsAsync` → `getExpoPushTokenAsync({projectId})` →
  upsert `push_devices`; delete on sign-out; `data.url` deep-link handler.
- `app.config.ts`: `android.package` placeholder `com.churchappcld.app`, `googleServicesFile: process.env.GOOGLE_SERVICES_JSON
  ?? './google-services.json'`, `extra.eas.projectId`, scheme `churchapp`, `newArchEnabled`, plugins incl.
  `["expo-audio", {recordAudioAndroid: false, enableBackgroundPlayback: true}]`. `eas.json`: development (dev client apk),
  preview (apk), production (aab). iOS fields present but untested until Phase 3.

## 10. Phase 1 — ordered build checklist (this session)

Each step ends with `pnpm turbo lint typecheck test` (where applicable) → append `prompt_history.txt` → `git add -A && git commit`
(with the required Co-Authored-By / Claude-Session trailers) → `git push origin main` (first push `-u`). Retry pushes with
2/4/8/16 s backoff on network errors.

1. **Git + conventions** — `git checkout -b main`; `CLAUDE.md` (imports; repo map; migration rules per construct; push-to-main
   rule; "update new_session_instructions" procedure; prompt-history rule with America/New_York timestamps); copy the uploaded
   `new_session_instructions.md` verbatim; `HANDOFF.md`; `Session log/001_2026-09-01/prompt_history.txt` (kickoff prompt +
   the two AskUserQuestion answer sets, each with its timestamp); `session_log.md` stub; `scripts/session/new-session.sh`
   (max+1, letter suffix on collision, quoted path); `.gitignore`; `README.md` stub. Commit `chore: session conventions and repo bootstrap`.
2. **Monorepo scaffold** — root `package.json`, `pnpm-workspace.yaml` (hoisted, `onlyBuiltDependencies`, catalog), `turbo.json`,
   `tsconfig.base.json`, `.nvmrc`, prettier/editorconfig, `.env.example`, `tooling/*`, empty packages, `vercel.json`,
   `.github/workflows/ci.yml`, `docs/ENV.md`. `pnpm install`; extend `onlyBuiltDependencies` from warnings. Commit.
3. **Database** — `supabase/config.toml`, `9999_init.sql` (complete §4), `seed/dev_seed.sql` (guarded), `tests/00_shim.sql`
   (roles anon/authenticated/service_role NOLOGIN + `churchapp_owner` NOSUPERUSER BYPASSRLS; `extensions` schema with
   pgcrypto/citext; `auth.users`, `auth.uid()/jwt()/role()`; `storage.buckets/objects/foldername`), `tests/helpers.sql`
   (`app_test.login(uid)`, `login_anon()`, `logout()`, `assert_count`, `assert_raises`, `assert_denied`), `tests/rls/01_tenancy …
   09_grants.sql`, `scripts/db/*.sh`, `supabase/README.md`, `docs/MIGRATIONS.md`, `docs/RLS.md`. Run `local-up.sh`
   (`pg_ctlcluster 16 main start` as postgres, else `initdb` in scratchpad), `apply-migrations.sh` **twice**,
   `check-rerunnable.sh`, `test.sh` green. Commit `feat(db): initial schema, RLS, RPCs, tests`.
4. **Shared packages** — `packages/domain` (permissions, audiences, media-links, limits, dates, errors, schemas/*, fixtures,
   Vitest), `packages/db` (`gen-types.sh` output, `rpc.ts`, `queries/*`, `keys.ts`, enum-parity type test),
   `packages/supabase-client` (web, mobile, large-secure-store). Commit.
5. **Web foundation & auth** — Next app, `proxy.ts`, layouts, `(public)` + `(auth)` pages, `src/lib/supabase/*`,
   `src/lib/auth/require-*.ts`, shadcn components. Commit.
6. **Web super admin** — `/admin/*` pages + `src/features/orgs/*`, `src/lib/stripe/*`, webhook + billing routes, webhook unit
   tests (idempotency, out-of-order, missing secret → 503). Commit.
7. **Web org admin: users & settings** — `/users`, `/users/[id]`, `/invitations`, `/settings`, `/settings/billing`;
   `PermissionGrid`, `InviteDialog`, `CreateAccountDialog`, `MembershipActions`, `create-direct.ts`, `email/resend.ts`. Commit.
8. **Web sermons & share links** — sermons pages, `ResumableUpload` (tus), `SermonForm`, `LinkPreview`, `SermonPlayer`,
   `ShareLinksPanel`, `/s/[token]`, unlock route, `/embed/yt/[id]`, `share/{cookie,token}.ts` + tests. Commit.
9. **Web announcements, bulletins, push, cron** — pages + features, `push/{expo,dispatch}.ts` (+ tests with mocked SDK),
   `api/cron/tick`, Playwright smoke (`e2e/`) with mock env; `pnpm --filter web build` green. Commit.
10. **Mobile** — Expo app per §9 (versions via `npx expo install`), `docs/MOBILE_BUILD.md`, `docs/MEDIA.md`;
    `npx expo-doctor` and `npx expo export --platform android` clean. Commit `feat(mobile): Expo app — auth, feed, sermons, push`.
11. **Wrap-up Phase 1** — `docs/CHECKLIST_SECURITY.md`, full `README.md`, `HANDOFF.md` (env vars, founder action items in
    bootstrap order, empty applied-migrations ledger, feature checklist, plan-added extras), update `session_log.md`. Commit.

**Cut list if context runs short (bottom-up):** mobile Dropbox/other native stream (keep upload + YouTube) → mobile
notification-preferences screen → web OTP sign-in (keep password) → `/invitations` list page → Playwright smoke.
**Never cut:** migration + tests, users/permissions grid + invite/direct-create, sermons, announcements + push, share links,
Stripe webhook, mobile auth + feed + push registration.

## 11. Phase 2 — continue in this session after Phase 1 is pushed

Ordered: (1) `/o/[slug]/directory/*` households/persons admin CRUD + leader notes + privacy toggles (direction rule) +
photo upload; (2) mobile `directory/*` (Our congregation | Fellowship tabs grouped via `org_directory_info`), `household/*`
self-service (`save_household`/`save_person`/`set_household_privacy`), ArrayBuffer photo upload; (3) `/calendars`,
`/events/pending` approval queue, mobile `events/*` (submit → pending, push on approval); (4) `/documents` + mobile;
(5) `/groups` custom audience groups; (6) join codes + join requests (RPCs `redeem_join_code`/`approve_join_request`, pages,
mobile `join`/`pending`); (7) Android App Links (`assetlinks.json`), YouTube oEmbed re-check, CSV directory import.
Each numbered item is its own commit + push; add RLS tests for the directory matrix and Playwright coverage as UI lands.
Phase 3 (later session): surveys UI, audit UI, account-deletion UI + privacy policy + Play Data Safety, iOS/TestFlight.
Phase 4 ideas (founder to confirm): anonymous surveys, birthday reminders, recurring events, offline downloads, printed
directory PDF export, German strings.

## 12. Verification

- **DB**: `scripts/db/local-up.sh` → `apply-migrations.sh` twice (re-runnability) → `check-rerunnable.sh` (static rules:
  `drop … if exists` before every policy/trigger/view; guarded `create type`; `if not exists` on tables/indexes; functions
  `create or replace` or preceded by drop; every function `security definer set search_path = ''`; no unqualified
  `crypt/gen_salt/gen_random_bytes/digest`; no `add value` used in the same file; policy names `ca_`; no `force row level
  security`) → `test.sh` runs `tests/rls/*.sql` with `psql -v ON_ERROR_STOP=1`, each in `begin … rollback`. Assertions include:
  org A member gets 0 rows from org B; 12 permissions positive/negative; `sermons.link` can insert youtube but not upload; last
  manager cannot be stripped; `users.create`-only cannot mint an invitation with permissions; admin can set
  `hide_from_fellowship` true but not false, household adult both; admin-created household hidden from fellowship by default;
  fellowship user sees no minors unless opted in; `select birthdate from persons` → 42501; disabled membership absent from
  `srv_audience_user_ids`; `anon` cannot call any RPC; `authenticated` cannot execute `srv_*`; share link fails after org
  disables sharing; 10 wrong passwords lock the token; per-household survey double-response rejected; member event forced to
  pending/push=false; suspended org rejects mutating RPCs; no 42P17 on any table.
- **Types**: `gen-types.sh` → `packages/db/src/database.types.ts`; enum-parity type test.
- **Unit (Vitest)**: permissions, audience derivation (shared fixtures), `parseMediaLink` table tests, schemas, Stripe webhook,
  push dispatch, share token/cookie.
- **Web**: `pnpm --filter web build`; Playwright smoke with mock env (pages render, validation, unauth redirects, `/s/unknown`
  404, security headers). Full E2E documented for when `E2E_*` env exists.
- **Mobile**: `typecheck`, `npx expo-doctor`, `npx expo export --platform android`.
- **Manual (founder)**: `docs/CHECKLIST_SECURITY.md`; founder action items in HANDOFF: create Supabase project (Pro, US East)
  → paste `9999_init.sql` (record in ledger) → edit Magic Link template `{{ .Token }}`, OTP expiry, custom SMTP → Vercel env
  (Node 22, Pro) → deploy → sign up → `super_admins` INSERT → create first church → Expo account, `eas init`, Firebase,
  `google-services.json` as EAS file env var, FCM v1 key → `eas build -p android --profile preview` → Stripe test keys.

## 13. Remaining open questions for the founder (defaults ship as stated; recorded in HANDOFF.md)

1. Should a family also be able to hide from its **own congregation**? (Column exists; UI toggle hidden.)
2. Fellowship viewers see phones/emails too, or names + address only? (Default: everything the congregation sees minus birth
   year, anniversary year, notes.)
3. Men's/Women's include youth 13+ by default (`adult_groups_include_youth = true`); adults 18+ for fellowship visibility. OK?
4. Accept the permission mapping in §4, or add toggles later?
5. Share links: stream only (no download); min password 8; available to `sermons.upload` holders as well as `sermons.link`. OK?
6. Push on every bulletin upload (per-church toggle, default on)?
7. Billing: flat monthly price? trial length (default 30 days)? Does `past_due` restrict anything? (Default: only `suspended`
   blocks writes.)
8. One phone per household: may a household adult answer per-person surveys for a spouse without an account? (Phase 3.)
9. App display name, Android package id (placeholder `com.churchappcld.app`), brand colours, production domain.
10. Supabase region/plan (US East, Pro) and Vercel Pro at launch.

### Founder answers (2026-09-03, session 002)

1. **Yes** — families may also hide from their own congregation; `hide_from_congregation` gets a UI toggle.
2. **Default** — fellowship viewers see everything the congregation sees minus birth year, anniversary year and notes.
3. **Each church sets its own youth age** — `youth_min_age` / `youth_max_age` / `adult_min_age` and the related toggles are editable in org settings (defaults 13 / 25 / 18).
4. _(no answer)_ — the mapping ships as the default; toggles may be added later by migration.
5. **Downloads allowed when the church allows it** — new `organization_settings.sermon_share_allow_download` (default false) in `9999_init.sql`; the rest as planned.
6. **Yes** — push on bulletin upload, per-church toggle default on.
7. **$50 per month per church, flat**; usage-based billing later. Trial 30 days; only `suspended` blocks writes.
8. **Head of house** (`household_role = 'head'`, or a designated adult when there is no father) answers per-person surveys for household members without accounts (Phase 3).
9. **`com.Anacast.app`**, display name **Anacast** (lowercase `com.anacast.app` recommended; brand colours and domain still open).
10. **Supabase Free** (US East), **Vercel Pro** at launch — sermon uploads capped at 50 MB until Pro.

The build order that implements this plan, with a ready-to-paste prompt per step, is `docs/TODO.md`.
