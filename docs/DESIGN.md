# ChurchAppCLD — Final Architecture & Implementation Plan (rev. 2, critique applied)

## 1. Summary of approach

1. **One Supabase project is the whole backend** (Postgres + Auth + Storage). Authorization lives in Postgres: RLS on every table and on `storage.objects`; `anon` has zero table grants and zero function grants; **every function's default `EXECUTE` to `PUBLIC` is revoked** and re-granted explicitly per role; all helpers are `security definer` with `set search_path = ''`; secrets (share-link token hashes, bcrypt password hashes, invitation token hashes) live in a non-API `private` schema. Cross-org integrity is enforced by `app.assert_same_org()` triggers on every child table, not just by policies. **No `force row level security`**: policies call security-definer helpers that read the same tables, which terminates only because the owner bypasses RLS; the migration asserts `rolbypassrls` for the owner on first paste and the local shim uses a non-superuser `bypassrls` owner so parity is real.
2. **Permissions are exactly the founder's 12 toggles**, stored as rows in `org_membership_permissions` (enum `permission_key`), checked in RLS by `app.has_perm(org_id, perm)` and, for hot paths, by `org_id = any((select app.perm_org_ids('…')))` (evaluated once per statement). A TS 12-tuple in `packages/domain` is held in parity with the generated DB enum by a type test. Surveys, custom groups, event approval and directory administration are **mapped onto** existing permissions (no 13th toggle) — §5 lists the mapping. `users.create` can never grant permissions it does not hold; only `users.edit_permissions` can mint permissions.
3. **Directory privacy is one DB function**, `app.household_view_level(org_id, household_id, hide_from_congregation, hide_from_fellowship)` → `none | fellowship | congregation | household | admin`, derived from `organization_settings`, fellowship links, and the household's own flags. **Sensitive columns are not on the client-readable surface at all**: `authenticated` gets column-level `select` on `persons`/`households` that excludes `birthdate`/`anniversary` (so PostgREST filters on them are rejected with 42501), leaders-only notes live in separate admin-only tables, and all directory reads go through the **security-definer, security-barrier views** `directory_persons` / `directory_households` that filter and mask (birth-year masking, adults-only for fellowship). All directory writes go through RPCs (`save_household`, `save_person`, `set_household_privacy`, …). The family override is absolute *and* reachable for families without smartphones: org admins can move privacy flags **only toward more privacy**; only a household adult (or super admin) can move them toward less. Admin-created households default to `hide_from_fellowship = true` until a family adult confirms.
4. **Households are the unit**: `persons.household_id` is `NOT NULL`, so directory listing, visibility, opt-out and per-household surveys are uniform. `member` vs `attendee` is an explicit leader-set status; youth/men/women are derived predicates with per-org age settings (`youth_min_age`, `youth_max_age`, `adult_min_age`) and a per-person override; every derived group excludes `inactive` and deceased persons; minors (by `household_role='child'` or age) are never in men/women and never shown to other congregations unless the household opts in.
5. **Sermons** are uploaded to a private bucket (TUS resumable uploads, signed URLs; exact-path write policies; no client update/delete on `storage.objects`) or linked (YouTube / Dropbox / Google Drive / other) via a **pure TypeScript URL parser** shared by both apps. YouTube on mobile plays through a **web page we host** (`/embed/yt/[id]`) inside `react-native-webview`, which supplies the referer YouTube now requires — no third-party YouTube RN library. Public share links use 32-byte tokens hashed in Node before they reach SQL, optional bcrypt passwords (min 8 chars), DB-side rate limits, and are re-validated against the org's *current* `sermons_shareable` setting and the sermon's published state on every hit; the resolve RPC is `public.srv_resolve_share_link`, executable by `service_role` only.
6. **Server code = Next.js Route Handlers / Server Actions + DB triggers + one Vercel Cron. Zero Supabase Edge Functions, no pg_cron, no pg_net.** Everything the server calls is a `public.srv_*` function (PostgREST only exposes `public`) with `execute` granted only to `service_role`. Scheduled publishing is a `publish_at` column enforced in RLS, not a job. Push fan-out is resolved once, in SQL (`srv_audience_user_ids`, which joins **active memberships** so removed members never receive pushes), and dispatched by a Route Handler (synchronously on publish, retried by the cron) with `for update skip locked` claiming; deleting content cancels its scheduled notifications.
7. **Billing**: Stripe Customer (created up front) + Subscription per church, synced by webhook into `billing_customers` / `billing_subscriptions` / `stripe_events` with correct failure semantics (500 on handler error so Stripe retries; out-of-order events ignored by `event_created`); `organizations.billing_mode` (`stripe | manual | free`) and `trial_ends_at`; super admin decides suspension. All Stripe code no-ops with a banner when keys are absent; the webhook returns 503 (never skips verification) when the secret is missing.
8. **Verification without Docker or a hosted project**: PostgreSQL 16 is installed locally (cluster `main`, currently down; Docker down). `scripts/db/local-up.sh` starts the cluster or falls back to a user-owned `initdb` in the scratchpad; a local `auth`/`storage`/`extensions` shim lets `scripts/db/apply-migrations.sh` apply `9999_init.sql` **twice** (proving re-runnability) and run plain-SQL RLS assertion files that later run verbatim (`begin … rollback`) in the hosted SQL editor. `supabase gen types --db-url` gives typed clients. Vitest for domain logic, Playwright smoke for web, `expo export --platform android` + `expo-doctor` for mobile.
9. **Monorepo hygiene**: pnpm `catalog:` for web-shared runtime deps only (RN-native deps are literal versions from `npx expo install`, never `npm view`); `onlyBuiltDependencies` allow-list for pnpm 10; packages exported as TS source (no build step); Turborepo; TS 5.9 pinned; ESLint 9 (eslint-config-expo is not validated on 10); Next 16 `proxy.ts`.
10. **Phase 1 is trimmed, ordered, and pushed to `main` after every step**: conventions + git init, monorepo, full schema + RLS + local tests, domain/db packages, super-admin + org-admin web (users/permissions with invite **and direct account creation**, settings, sermons upload+link, share links, announcements + push dispatch, bulletins, Stripe behind env), and an Android app with auth, feed, sermon playback and push registration. Join codes, directory/calendar UI, member web are Phase 2; surveys, audit UI, account deletion UI, iOS are Phase 3; anonymous surveys, birthday reminders, German strings are Phase 4 ideas.

## 2. Monorepo layout

```
ChurchAppCLD/
├─ CLAUDE.md                          # line 1: @new_session_instructions.md ; line 2: @HANDOFF.md ; then repo map + "update new_session_instructions" procedure
├─ new_session_instructions.md        # founder's session conventions (reconstructed from the kickoff brief; replace via "update new_session_instructions") + repo procedures
├─ HANDOFF.md                         # live cross-session state: what exists, env status, applied-migrations ledger, feature checklist, plan-added extras, founder to-dos
├─ README.md                          # setup, env vars, paste-migration flow, APK build
├─ Session log/
│  └─ 001_2026-09-01/
│     ├─ prompt_history.txt           # every prompt verbatim, "--- YYYY-MM-DD HH:MM ---" separators (America/New_York)
│     └─ session_log.md               # fixed template, written last
├─ package.json                       # private; scripts delegate to turbo; "db:*" and "session:new" scripts
├─ pnpm-workspace.yaml                # packages: apps/*, packages/*, tooling/* ; nodeLinker: hoisted ; onlyBuiltDependencies ; catalog: (web-shared deps only)
├─ turbo.json                         # tasks: build, dev, lint, typecheck, test
├─ tsconfig.base.json                 # strict, noUncheckedIndexedAccess, verbatimModuleSyntax, moduleResolution bundler
├─ .prettierrc  .editorconfig  .gitignore (.env*, !.env.example, google-services.json, Session log/** is NOT ignored)  .nvmrc (22)  .env.example
├─ vercel.json                        # crons: /api/cron/tick "0 12 * * *" (Hobby); Pro line documented in comments/README
├─ .github/workflows/ci.yml           # single non-blocking workflow: pnpm i --frozen-lockfile → turbo lint typecheck test → web build → expo-doctor + expo export → db tests (PG service) → check-rerunnable → types drift
├─ docs/
│  ├─ ENV.md            # every env var: who fills it, where it lives (Vercel / EAS / local), local + mock + E2E values
│  ├─ MIGRATIONS.md     # descending numbering, paste order, re-runnability rules per construct, enum-add rule, "9999 frozen after first production paste"
│  ├─ RLS.md            # policy catalogue + directory visibility matrix + permission mapping + known consequences
│  ├─ MEDIA.md          # link providers, playback strategies, size limits, provider caveats (Dropbox bandwidth, Drive sign-in, YouTube private/embedding-disabled)
│  ├─ MOBILE_BUILD.md   # Expo account → eas init → Firebase → google-services.json → FCM v1 key → preview build; iOS untested until Phase 3
│  └─ CHECKLIST_SECURITY.md
├─ apps/
│  ├─ web/                            # Next.js 16 App Router (Vercel)
│  │  ├─ app/                         # route groups: (public) (auth) (super) (org) api/ — see §9 ((me) is Phase 2)
│  │  ├─ proxy.ts                     # Next 16 middleware: refresh Supabase session cookie, auth redirects; matcher excludes /api/stripe/webhook, /api/cron/tick, /s/*, /embed/*
│  │  ├─ src/lib/supabase/{server.ts,client.ts,service.ts}   # @supabase/ssr factories; service.ts is server-only
│  │  ├─ src/lib/auth/{require-user.ts,require-org.ts,require-perm.ts,require-super.ts}
│  │  ├─ src/lib/stripe/{client.ts,sync.ts}
│  │  ├─ src/lib/push/{expo.ts,dispatch.ts}
│  │  ├─ src/lib/share/{cookie.ts,token.ts}   # jose-signed HttpOnly unlock cookie; sha256(token) → token_hash
│  │  ├─ src/lib/users/create-direct.ts       # auth.admin.createUser + srv_attach_user
│  │  ├─ src/features/<domain>/       # forms, tables, hooks per domain
│  │  ├─ src/components/ui/           # shadcn/ui generated components
│  │  ├─ e2e/                         # Playwright
│  │  ├─ next.config.ts  postcss.config.mjs  vitest.config.ts  .env.example
│  └─ mobile/                         # Expo SDK 57, expo-router
│     ├─ app/                         # (auth)/ (app)/(tabs)/ + stacks — see §10
│     ├─ src/{lib,features,components,hooks}
│     ├─ app.config.ts                # EXPO_PUBLIC_* env; android.package; scheme "churchapp"; googleServicesFile from env
│     ├─ eas.json                     # development / preview (apk) / production (aab)
│     ├─ metro.config.js              # watchFolders=[workspaceRoot]
│     └─ .env.example
├─ packages/
│  ├─ domain/                         # @church/domain — pure TS, dep only zod: permissions.ts, audiences.ts, media-links.ts, schemas/*.ts, limits.ts, dates.ts, errors.ts; fixtures/persons.json
│  ├─ db/                             # @church/db — database.types.ts (generated), rpc.ts (typed RPC wrappers), queries/<domain>.ts, keys.ts, type-tests/enum-parity.test-d.ts
│  └─ supabase-client/                # @church/supabase-client — createWebBrowserClient, createMobileClient (LargeSecureStore + processLock)
├─ tooling/
│  ├─ eslint-config/                  # flat config (ESLint 9): base, next, expo
│  └─ tsconfig/                       # base.json, nextjs.json, react-native.json, library.json
├─ supabase/
│  ├─ config.toml                     # for `gen types` / future `supabase start`; never `db push`
│  ├─ migrations/
│  │  ├─ 9999_init.sql                # complete schema, functions, RLS, storage, triggers — re-runnable; frozen after first production paste
│  │  └─ (9998_*.sql, 9997_*.sql …)   # descending; lowest number = newest; enum-add pastes are their own file (9998a_enum / 9998b_use)
│  ├─ seed/dev_seed.sql               # guarded; 1 fellowship, 3 orgs, households, persons, one of each content type
│  ├─ tests/
│  │  ├─ 00_shim.sql                  # local-only: roles (incl. non-superuser bypassrls owner `churchapp_owner`), auth.uid()/jwt(), storage.buckets/objects/foldername, extensions schema
│  │  ├─ helpers.sql                  # app_test.login(uid), login_anon(), logout(), assert_count(), assert_raises(), assert_denied()
│  │  └─ rls/01_tenancy.sql … 09_grants.sql
│  └─ README.md                       # paste order; bootstrap order (deploy → sign up → super_admins INSERT); OTP template edit; env vars
└─ scripts/
   ├─ db/local-up.sh                  # pg_ctlcluster 16 main start → fallback initdb in scratchpad on a free port; createdb; apply shim; prints DATABASE_URL
   ├─ db/apply-migrations.sh          # applies supabase/migrations/*.sql in DESCENDING numeric order as churchapp_owner
   ├─ db/test.sh                      # psql -v ON_ERROR_STOP=1 -f each tests/rls/*.sql
   ├─ db/gen-types.sh                 # npx supabase gen types typescript --db-url "$DATABASE_URL?sslmode=disable" --schema public > packages/db/src/database.types.ts
   ├─ db/check-rerunnable.sh          # static rules in §12
   └─ session/new-session.sh          # creates "Session log/NNN_YYYY-MM-DD" (max+1; letter suffix a,b,… if that name exists)
```

Tooling decisions:
- **pnpm workspaces + Turborepo** (`turbo` 2.10.12). `pnpm-workspace.yaml` holds `nodeLinker: hoisted` (single source; no `.npmrc` duplicate) and `onlyBuiltDependencies: [esbuild, "@swc/core", sharp, unrs-resolver, "@tailwindcss/oxide", protobufjs, core-js]` — extended after the first install from the "Ignored build scripts" warning.
- **pnpm `catalog:`** pins only deps shared by web and mobile that `expo install` does not manage: `react`/`react-dom` **19.2.3** (Expo SDK 57's exact pin; Next 16 peer `^19`), `@types/react ~19.2`, `typescript ~5.9.3`, `zod`, `@supabase/supabase-js`, `@tanstack/react-query`, `date-fns`. All `expo-*` / `react-native-*` versions are literals in `apps/mobile/package.json` produced by `npx expo install`.
- **Packages are TS source**: `"exports": { ".": "./src/index.ts" }`; Next uses `transpilePackages`; Metro (RN 0.86) resolves package exports by default.
- **TypeScript `~5.9.3`** — npm latest is 7.0.2 (Go port); `typescript-eslint` peer is `<6.1`. Recorded in HANDOFF.md.
- **ESLint 9.x flat config** + `typescript-eslint` 8 + `eslint-config-next` 16.3.4 + `eslint-config-expo` 57.0.2; Prettier 3.9.6. Upgrade to ESLint 10 only when `eslint-config-expo` loads cleanly under it (HANDOFF note).

## 3. Stack & pinned versions

Verified with `npm view` / Expo `bundledNativeModules.json` on 2026-09-01:

| Area | Package | Version |
|---|---|---|
| Web | `next` | 16.3.4 (App Router, Turbopack, `proxy.ts`) |
| React (catalog) | `react`, `react-dom` | **19.2.3** (Expo SDK 57 exact pin) · `@types/react ~19.2` |
| Web UI | `tailwindcss` 4.3.3 (+ `@tailwindcss/postcss`), shadcn/ui CLI 4.19.1, `lucide-react` 1.39.0, `class-variance-authority` 0.7.1, `tailwind-merge` 3.6.0, `sonner` |
| Forms | `react-hook-form` 7.87.0, `@hookform/resolvers` 5.9.1 (`zod ^4` supported; import `@hookform/resolvers/zod`) |
| Validation (catalog) | `zod` | 4.5.4 |
| Data (catalog) | `@tanstack/react-query` 5.102.8, `@tanstack/query-async-storage-persister` 5.102.8 |
| Dates (catalog) | `date-fns` 4.4.0, `@date-fns/tz` |
| Supabase | `@supabase/supabase-js` 2.112.4 (engines node ≥22), `@supabase/ssr` 0.12.5, CLI `supabase` 2.116.0 (npx) |
| Uploads | `tus-js-client` 4.3.1 |
| Billing | `stripe` 22.6.1 (`apiVersion` pinned to the SDK's bundled version in `stripe/client.ts`) |
| Push | `expo-server-sdk` 7.2.0 (server), `expo-notifications` 57.0.16, `expo-device` 57.0.1, `expo-constants` 57.0.17 |
| Share links | `jose` 6.2.10 (signed unlock cookie); bcrypt done in DB via `extensions.crypt()`; `bcryptjs` 3.0.3 only for unit-test parity |
| Email | `resend` 6.25.0 (optional; invite link shown for copy when key absent) |
| Mobile core | `expo` 57.0.19, **`react-native` 0.86.3**, `expo-router` ~57.0.18, `@expo/metro-runtime` ~57.0.15, `react-native-screens` ~4.26.0, `react-native-safe-area-context` ~5.7.0, `react-native-reanimated` 4.5.1, `react-native-worklets` 0.10.1, `react-native-gesture-handler` ~2.32.0 |
| Mobile media | `expo-video` 57.0.3, `expo-audio` 57.0.4 (never `expo-av`), **`react-native-webview` 13.16.1** (hosted YouTube embed page + Drive preview on web only). No `react-native-youtube-iframe` (stale since 2025-07; referer issues). |
| Mobile storage/auth | `expo-sqlite` 57.0.2 (`expo-sqlite/kv-store`), `expo-secure-store` 57.0.3, `expo-crypto`, `aes-js` 3.1.2 (Supabase `LargeSecureStore` pattern), `react-native-url-polyfill` 4.0.0 |
| Mobile misc | `expo-file-system` 57.0.6, `expo-image` 57.0.4, `expo-image-picker` 57.0.15, `expo-image-manipulator`, `expo-linking` 57.0.9, `expo-web-browser` 57.0.2, `expo-sharing`, `expo-intent-launcher`, `expo-dev-client` 57.0.18, `expo-build-properties` 57.0.16 |
| Mobile UI | `react-native-paper` 5.15.3 |
| Monorepo | `pnpm` 10.33, `turbo` 2.10.12, `typescript` ~5.9.3, `eslint` 9.x, `typescript-eslint` 8.69, `prettier` 3.9.6, `tsx` |
| Tests | `vitest` 4.1.11, `@testing-library/react` 16.3.3, `jsdom` 30.0.1, `@playwright/test` 1.62.1 |
| Build | `eas-cli` 23.2.0 via `npx eas-cli`; CI runs `npx expo-doctor` |

Rule (docs/MOBILE_BUILD.md + HANDOFF): mobile native deps come from `npx expo install <pkg>`; `expo install --fix` cannot rewrite `catalog:` entries, hence the catalog contains no RN-native packages.

Environment: Node 22.22, pnpm 10.33; PostgreSQL 16.13 installed (cluster `main`, down); Docker down; no Android SDK (EAS Build only); Playwright + Chromium present.

## 4. Data model

Conventions: schema `public` for tables, views and **all RPCs** (client `public.*` and server-only `public.srv_*` — PostgREST exposes only `public`); schema `app` for SQL-only helpers used by policies/triggers (not exposed); schema `private` for secrets (no client grants). PKs `uuid default gen_random_uuid()`. `created_at`/`updated_at` with trigger `app.touch_updated_at`. Every tenant table has `org_id … on delete cascade` + index. Emails `extensions.citext` (compared as `lower(x::text)` inside `search_path=''` functions). Every policy is named `ca_<table>_<op>_<who>` so a migration can drop all `ca_%` policies at the top and recreate them. **Hard org deletion is forbidden** (super admin sets `cancelled`; a cron purges after 30 days with the service role); child FKs that must not cascade use `on delete no action`.

### 4.1 Enums
`permission_key` (12 values, §5) · `org_status` (`trial, active, past_due, suspended, cancelled`) · `billing_mode` (`stripe, manual, free`) · `subscription_status` (Stripe's set + `none` + `unknown`) · `membership_status` (`pending, active, disabled`) · `congregation_status` (`member, attendee, inactive`) · `sex` (`male, female`) · `marital_status` · `household_role` (`head, spouse, child, other`) · `birthdate_visibility` (`full, month_day, hidden`) · `media_kind` (`upload, youtube, dropbox, google_drive, url`) · `audience_kind` (`everyone, members, attendees, youth, men, women, custom`) · `calendar_kind` (`all, youth, men, women, custom`) · `event_status` · `survey_status` (`draft, open, closed`) · `response_mode` (`per_person, per_household`) · `question_kind` · `notification_kind` (`announcement, event, survey, bulletin`) · `notification_status` · `push_platform` · `join_request_status`.

### 4.2 Tables (38 public + 3 private)

**Tenancy & identity**
| Table | Key columns / constraints |
|---|---|
| `organizations` | `id, slug citext unique, name, status org_status default 'trial', billing_mode default 'manual', trial_ends_at timestamptz, contact_email citext, created_by`. Super-admin-owned. |
| `organization_settings` | `org_id pk fk`, `timezone text default 'America/New_York'` (validated by trigger), `logo_path`, `directory_share_in_congregation bool default true`, `directory_share_with_fellowship bool default false`, `fellowship_directory_adults_only bool default true`, `sermons_shareable bool default false`, `sermon_share_requires_password bool default true`, `youth_min_age int default 13`, `youth_max_age int default 25`, `adult_min_age int default 18`, `youth_excludes_married bool default true`, `adult_groups_include_youth bool default true`, `members_can_submit_events bool default true`, `events_require_approval bool default true`, `push_on_bulletin bool default true`. Checks: youth range; `adult_min_age between youth_min_age and 21`; `(not directory_share_with_fellowship) or directory_share_in_congregation`. Governed by `org.settings`. Created by `app.on_org_created`. |
| `fellowships` | `id, slug citext unique, name, description`. Super-admin managed. |
| `fellowship_memberships` | `fellowship_id fk, org_id fk, joined_at`; PK `(fellowship_id, org_id)`. (No per-link `share_directory` — the org-level setting decides.) |
| `profiles` | `user_id pk fk auth.users cascade, display_name, email citext, last_org_id`. Created by trigger on `auth.users` insert; email synced by trigger on update. |
| `super_admins` | `user_id pk fk auth.users, granted_by, created_at`. Bootstrapped by one INSERT **after the founder signs up**. |
| `org_memberships` | `id, org_id, user_id, status default 'pending', invited_by, approved_by, approved_at, disabled_at`; `unique(org_id, user_id)`; index `(user_id, status)`. |
| `org_membership_permissions` | `membership_id fk cascade, permission permission_key, granted_by, granted_at`; PK `(membership_id, permission)`. Trigger `app.guard_last_org_manager` (on this table **and** on `org_memberships` status/delete) blocks removing the last active `users.edit_permissions` holder; skipped when `pg_trigger_depth() > 0` or `current_setting('app.cascade', true) = 'on'` (deletion cron), which then writes an audit row "org has no manager". |
| `invitations` | `id, org_id, email citext, person_id fk null, permissions permission_key[] default '{}', invited_by, expires_at default now()+14d, accepted_at, accepted_by, revoked_at`; secret in `private.invitation_secrets(invitation_id pk, token_hash bytea unique)`. |
| `join_codes`, `join_requests` | Schema shipped in 9999 (as before: 8-char code, `auto_approve`, `expires_at`, `max_uses`; pending-unique requests); **RPCs and UI are Phase 2**. |
| `account_deletion_requests` | `user_id pk, requested_at, processed_at`. Play Store requirement; processed by the cron. |

**Directory**
| Table | Key columns / constraints |
|---|---|
| `households` | `id, org_id, name, address_line1/2, city, region, postal_code, country default 'US', home_phone, photo_path, anniversary date, sort_key`, privacy: `hide_from_fellowship bool default false`, `hide_from_congregation bool default false`, `show_children_in_fellowship bool default false`, `privacy_confirmed_by uuid, privacy_confirmed_at timestamptz`, `created_via text` (`admin|invitation|self`). Check `photo_path is null or photo_path like org_id::text || '/households/' || id::text || '/%'`. |
| `household_leader_notes` | `household_id pk fk cascade, org_id, notes text, updated_by, updated_at`. Directory-admin only. |
| `persons` | `id, org_id, household_id fk NOT NULL on delete no action, user_id fk auth.users null on delete set null, first_name, last_name, preferred_name, sex, birthdate date, birthdate_visibility default 'month_day', marital_status default 'unknown', household_role default 'other', congregation_status default 'attendee', member_since, youth_override bool null, directory_listed bool default true, email citext, mobile_phone, work_phone, photo_path, deceased_on`. Partial unique `(org_id, user_id) where user_id is not null`; indexes `(org_id, household_id)`, `(org_id, birthdate)`; photo_path check as above. |
| `person_leader_notes` | `person_id pk fk cascade, org_id, notes, updated_by, updated_at`. Directory-admin only. |

**Content**
| Table | Key columns / constraints |
|---|---|
| `sermons` | as before + checks: media shape; `external_url ~ '^https://' and length(external_url) <= 2048`; `storage_path like org_id::text || '/sermons/' || id::text || '/%'`; unique index on `storage_path`. `publish_at null` = draft. Delete trigger enqueues `storage_deletions`. |
| `sermon_share_links` | `id, org_id, sermon_id fk cascade, label, requires_password, expires_at, max_views, view_count default 0, revoked_at, created_by`; index `(sermon_id)`; secrets in `private.share_link_secrets(link_id pk, token_hash bytea unique, password_hash text)`. |
| `announcements` | `id, org_id, title, body, audience_group_id null, document_id null, publish_at default now(), expires_at, pinned, push default true, push_enqueued_at, created_by, updated_by`. |
| `bulletins` | `id, org_id, title, starts_on, ends_on check >=, storage_path (path check + unique), mime_type, file_size_bytes, publish_at default now(), created_by`. |
| `documents` | same shape with `category, audience_group_id`; path check + unique. |

**Audiences, calendars, events** — `audience_groups` (six system rows per org), `audience_group_members` (index `(person_id)`), `calendars` (four defaults), `events` (index `(org_id) where status='pending'`; trigger `force_event_pending` also forces `push=false` unless `announcements.create`).

**Surveys** (schema in 9999; UI Phase 3; **no anonymous mode in Phase 1** — `anonymous` column omitted, added in Phase 4 by its own migration)
| Table | Key columns / constraints |
|---|---|
| `surveys` | `id, org_id, title, description, audience_group_id fk not null on delete no action, response_mode default 'per_person', allow_edit default true, status default 'draft', opens_at, closes_at, push default true, created_by`. Trigger forbids changing `response_mode`/`audience_group_id` once `status <> 'draft'`. |
| `survey_questions` | `…, unique(survey_id, position), unique(id, survey_id)`. |
| `survey_responses` | `id, survey_id, org_id, person_id null, household_id null, submitted_by_user_id, scope_key text not null, submitted_at, updated_at`; `unique(survey_id, scope_key)`. Trigger `stamp_response_scope` overwrites ids/scope from caller identity; raises `no_person_linked` when `my_person_id` is null. |
| `survey_answers` | `id, response_id fk cascade, question_id, survey_id, org_id fk, value jsonb`; composite FK `(question_id, survey_id) → survey_questions(id, survey_id)`; `unique(response_id, question_id)`. |

**Notifications & devices** — `push_devices`, `notification_preferences (user_id, org_id, announcements, bulletins, events, surveys)`, `notifications` (index `(status, scheduled_for)`), `notification_deliveries` (`user_id fk auth.users`, index `(notification_id)`).

**Billing & ops** — `billing_customers`, `billing_subscriptions` (`status subscription_status` + `status_raw text` + `event_created bigint`; trigger mirrors → `organizations.status` only when `billing_mode='stripe'`), `stripe_events (id pk, type, event_created bigint, received_at, processed_at, error)`, `audit_log` (append-only; trigger-fed on `organizations`, `organization_settings`, `org_memberships`, `org_membership_permissions`, `households` privacy columns, `persons` status/link columns, `sermon_share_links`, `sermons` delete, `invitations`, `super_admins`; never stores leader notes), `storage_deletions`, `private.rate_limits` (pruned by cron).

### 4.3 Derivation rules (`app.person_in_kind(person_id, audience_kind)`)
Age uses the org's timezone (`organization_settings.timezone`). Base predicate **for every kind**: `congregation_status in ('member','attendee') and deceased_on is null`.
- `app.is_minor(p)` = `household_role = 'child' or (birthdate is not null and age < adult_min_age)`; `app.is_adult(p)` = `household_role in ('head','spouse') or (birthdate is not null and age >= adult_min_age)`. A person with role `other` and no birthdate is neither (UI badge "add birthdate or role"; excluded from fellowship view; counted in men/women only if not minor, i.e. yes — documented).
- `everyone` = base · `members` = base ∧ `member` · `attendees` = base ∧ `attendee` (open question 1)
- `youth` = base ∧ `coalesce(youth_override, birthdate is not null and age between youth_min_age and youth_max_age and (not youth_excludes_married or marital_status <> 'married'))`
- `men` = base ∧ `sex='male'` ∧ `not is_minor` ∧ `(adult_groups_include_youth or not youth)`; `women` symmetric.
- `custom` = base ∧ row in `audience_group_members`.
`app.user_in_group(group_id)` = `group is null or person_in_group(my_person_id(org), group)`; `public.srv_audience_user_ids(group, org)` returns distinct `persons.user_id` **joined to `org_memberships … status='active'`** and requires `app.org_writable(org)`. Mirrored in `packages/domain/src/audiences.ts`; both SQL test `05_audiences.sql` and Vitest consume `packages/domain/fixtures/persons.json` (includes deceased member, inactive youth, child without birthdate, married youth, timezone edge).

### 4.4 Initial migration sketch — `supabase/migrations/9999_init.sql`

Structure (every later migration follows the same skeleton): (0) owner assertion → (1) extensions/schemas → (2) enums (guarded) → (3) tables (`if not exists`; later changes via `alter table … add column if not exists`) → (4) drop all `ca_%` policies in `public`/`storage` and our views → (5) functions (`create or replace`; `drop function if exists` only when a signature changes, preceded by step 4 which already removed dependents) → (6) views → (7) triggers (`drop … if exists` + `create`) → (8) policies → (9) grants/revokes → (10) storage buckets → (11) commented bootstrap.

```sql
-- 9999_init.sql  (re-runnable; paste into the Supabase SQL editor as many times as needed)
-- (0) the policy/helper scheme requires the owner to bypass RLS
do $$ begin
  if not (select rolbypassrls or rolsuper from pg_roles where rolname = current_user) then
    raise exception 'migration must run as a role with BYPASSRLS (postgres on Supabase)'; end if; end $$;

-- (1)
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext   with schema extensions;
create schema if not exists app;      -- SQL-only helpers for policies/triggers (not exposed by PostgREST)
create schema if not exists private;  -- secrets
revoke all on schema private from public, anon, authenticated;
revoke all on schema app     from public, anon;
grant usage on schema app to authenticated;              -- functions granted individually below
-- default privileges: nothing is executable/readable unless we say so
alter default privileges in schema public  revoke execute on functions from public, anon;
alter default privileges in schema app     revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;
alter default privileges in schema public  revoke all on tables from anon;

-- (2) enums: same guarded pattern for each type
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where t.typname='permission_key' and n.nspname='public') then
    create type public.permission_key as enum (
      'sermons.upload','sermons.delete','sermons.link',
      'announcements.create','announcements.delete','announcements.edit','bulletins.upload','documents.upload',
      'users.create','users.delete','users.edit_permissions','org.settings');
  end if;
  -- … org_status, billing_mode, subscription_status (+ 'none','unknown'), membership_status, congregation_status, sex,
  --   marital_status, household_role, birthdate_visibility, media_kind, audience_kind, calendar_kind, event_status,
  --   survey_status, response_mode, question_kind, notification_kind ('announcement','event','survey','bulletin'),
  --   notification_status, push_platform, join_request_status  — identical guard each
end $$;

-- (3) tables — pattern (real file lists every table from §4.2)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique, name text not null,
  status public.org_status not null default 'trial', billing_mode public.billing_mode not null default 'manual',
  trial_ends_at timestamptz, contact_email extensions.citext, created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.organization_settings (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  timezone text not null default 'America/New_York', logo_path text,
  directory_share_in_congregation boolean not null default true,
  directory_share_with_fellowship boolean not null default false,
  fellowship_directory_adults_only boolean not null default true,
  sermons_shareable boolean not null default false, sermon_share_requires_password boolean not null default true,
  youth_min_age int not null default 13, youth_max_age int not null default 25, adult_min_age int not null default 18,
  youth_excludes_married boolean not null default true, adult_groups_include_youth boolean not null default true,
  members_can_submit_events boolean not null default true, events_require_approval boolean not null default true,
  push_on_bulletin boolean not null default true, updated_at timestamptz not null default now(),
  constraint youth_range check (youth_min_age >= 5 and youth_min_age < youth_max_age and youth_max_age <= 40),
  constraint adult_range check (adult_min_age >= youth_min_age and adult_min_age <= 21),
  constraint fellowship_implies_congregation check ((not directory_share_with_fellowship) or directory_share_in_congregation));
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, address_line1 text, address_line2 text, city text, region text, postal_code text,
  country text not null default 'US', home_phone text, photo_path text, anniversary date, sort_key text,
  hide_from_fellowship boolean not null default false, hide_from_congregation boolean not null default false,
  show_children_in_fellowship boolean not null default false,
  privacy_confirmed_by uuid, privacy_confirmed_at timestamptz, created_via text not null default 'admin',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint households_photo_path check (photo_path is null or photo_path like org_id::text || '/households/' || id::text || '/%'));
create table if not exists public.household_leader_notes (
  household_id uuid primary key references public.households(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  notes text, updated_by uuid, updated_at timestamptz not null default now());
create table if not exists public.persons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete no action,
  user_id uuid references auth.users(id) on delete set null,
  first_name text not null, last_name text not null, preferred_name text,
  sex public.sex, birthdate date, birthdate_visibility public.birthdate_visibility not null default 'month_day',
  marital_status public.marital_status not null default 'unknown', household_role public.household_role not null default 'other',
  congregation_status public.congregation_status not null default 'attendee', member_since date,
  youth_override boolean, directory_listed boolean not null default true,
  email extensions.citext, mobile_phone text, work_phone text, photo_path text, deceased_on date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint persons_photo_path check (photo_path is null or photo_path like org_id::text || '/persons/' || id::text || '/%'));
create unique index if not exists persons_org_user_unique on public.persons (org_id, user_id) where user_id is not null;
create table if not exists public.person_leader_notes (
  person_id uuid primary key references public.persons(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  notes text, updated_by uuid, updated_at timestamptz not null default now());
create table if not exists public.sermons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null, speaker text, preached_on date, series text, scripture_refs text[], description text,
  media_kind public.media_kind not null, storage_path text, mime_type text, file_size_bytes bigint, duration_seconds int,
  external_url text, external_id text, publish_at timestamptz, created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint sermons_media_shape check (
    (media_kind = 'upload' and storage_path is not null and external_url is null) or
    (media_kind <> 'upload' and external_url is not null and storage_path is null)),
  constraint sermons_external_https check (external_url is null or (external_url ~ '^https://' and length(external_url) <= 2048)),
  constraint sermons_storage_path check (storage_path is null or storage_path like org_id::text || '/sermons/' || id::text || '/%'));
create unique index if not exists sermons_storage_path_unique on public.sermons (storage_path) where storage_path is not null;
create table if not exists public.billing_subscriptions (
  stripe_subscription_id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  status public.subscription_status not null default 'unknown', status_raw text not null, event_created bigint not null default 0,
  price_id text, quantity int, current_period_start timestamptz, current_period_end timestamptz,
  cancel_at_period_end boolean, trial_end timestamptz, canceled_at timestamptz, raw jsonb, updated_at timestamptz not null default now());
-- … remaining tables per §4.2 (same style); private.invitation_secrets, private.share_link_secrets, private.rate_limits

-- (4) drop everything we own that depends on functions, so functions/views can change shape
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies
           where policyname like 'ca\_%' and schemaname in ('public','storage') loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop; end $$;
drop view if exists public.directory_persons;
drop view if exists public.directory_households;
drop view if exists public.org_directory_info;

-- (5) helper functions — every one: security definer, set search_path = '' ; pgcrypto/citext calls schema-qualified
create or replace function app.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.super_admins where user_id = auth.uid()) $$;

-- viewer facts evaluated ONCE per statement (used as  org_id = any((select app.member_org_ids())) )
create or replace function app.member_org_ids() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select case when app.is_super_admin() then (select coalesce(array_agg(id), '{}') from public.organizations)
  else (select coalesce(array_agg(org_id), '{}') from public.org_memberships where user_id = auth.uid() and status = 'active') end $$;

create or replace function app.perm_org_ids(perm public.permission_key) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select case when app.is_super_admin() then (select coalesce(array_agg(id), '{}') from public.organizations)
  else (select coalesce(array_agg(m.org_id), '{}') from public.org_memberships m
        join public.org_membership_permissions p on p.membership_id = m.id
        where m.user_id = auth.uid() and m.status = 'active' and p.permission = perm) end $$;

create or replace function app.directory_admin_org_ids() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select array(select unnest(app.perm_org_ids('users.create')) union select unnest(app.perm_org_ids('org.settings'))) $$;

create or replace function app.my_household_ids() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(household_id), '{}') from public.persons where user_id = auth.uid() $$;

create or replace function app.fellowship_visible_org_ids() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct fo.org_id), '{}')
  from public.fellowship_memberships fo
  join public.organization_settings s on s.org_id = fo.org_id and s.directory_share_with_fellowship
  join public.organizations o on o.id = fo.org_id and o.status in ('trial','active','past_due')
  join public.fellowship_memberships fm on fm.fellowship_id = fo.fellowship_id and fm.org_id <> fo.org_id
  join public.org_memberships me on me.org_id = fm.org_id and me.user_id = auth.uid() and me.status = 'active' $$;

create or replace function app.is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select org = any(app.member_org_ids()) $$;
create or replace function app.has_perm(org uuid, perm public.permission_key) returns boolean
language sql stable security definer set search_path = '' as $$ select org = any(app.perm_org_ids(perm)) $$;
create or replace function app.has_any_perm(org uuid, perms public.permission_key[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from unnest(perms) k where org = any(app.perm_org_ids(k))) $$;
create or replace function app.is_directory_admin(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select org = any(app.directory_admin_org_ids()) $$;
create or replace function app.org_writable(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organizations o where o.id = org and o.status in ('trial','active','past_due')) $$;
create or replace function app.require_writable(org uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin if not app.org_writable(org) then raise exception 'organization is suspended' using errcode = '42501'; end if; end $$;
create or replace function app.require_user() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if; return auth.uid(); end $$;

-- takes row columns: no re-fetch of the household per row
create or replace function app.household_view_level(org uuid, hh uuid, hide_cong boolean, hide_fell boolean) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when org = any(app.directory_admin_org_ids()) then 'admin'
    when hh  = any(app.my_household_ids()) then 'household'
    when org = any(app.member_org_ids()) and s.directory_share_in_congregation and not hide_cong then 'congregation'
    when not hide_cong and not hide_fell and org = any(app.fellowship_visible_org_ids()) then 'fellowship'
    else 'none' end
  from public.organization_settings s where s.org_id = org $$;

create or replace function app.person_age(birth date, org uuid) returns int
language sql stable security definer set search_path = '' as $$
  select date_part('year', age((now() at time zone s.timezone)::date, birth))::int
  from public.organization_settings s where s.org_id = org $$;
create or replace function app.is_minor(role public.household_role, birth date, org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select role = 'child' or (birth is not null and app.person_age(birth, org) < (select adult_min_age from public.organization_settings where org_id = org)) $$;
create or replace function app.is_adult(role public.household_role, birth date, org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select role in ('head','spouse') or (birth is not null and app.person_age(birth, org) >= (select adult_min_age from public.organization_settings where org_id = org)) $$;

-- can_edit_household(hh): directory admin of that org (writable) OR head/spouse with an account in that household (writable)
-- person_in_kind / person_in_group / user_in_group / my_person_id(org) — per §4.3
-- trigger fns (ALL security definer, search_path=''): touch_updated_at, assert_same_org(fk_col, parent),
--   audit_row, on_org_created (settings + 6 groups + 4 calendars), on_auth_user_created (profiles), on_auth_user_updated (email sync),
--   guard_last_org_manager, guard_persons_columns (insert+update), guard_household_privacy_columns (direction rule),
--   force_event_pending (+push=false), freeze_survey_shape, stamp_response_scope, validate_timezone,
--   enqueue_storage_deletion (sermons/bulletins/documents/photos), cancel_notifications_on_delete, on_content_publish (→ notifications),
--   mirror_subscription_status, rate_limit_hit(key, limit, window) → private.rate_limits

-- (6) views: security DEFINER (owner bypasses RLS) + security_barrier, so they filter AND mask themselves, evaluated once
create view public.directory_households with (security_barrier = true) as
  select h.id, h.org_id, h.name, h.address_line1, h.address_line2, h.city, h.region, h.postal_code, h.country, h.home_phone,
         h.photo_path, h.sort_key,
         case when l.lvl in ('admin','household') then to_char(h.anniversary, 'YYYY-MM-DD')
              when l.lvl = 'congregation' then to_char(h.anniversary, 'MM-DD') end as anniversary_display,
         case when l.lvl in ('admin','household') then h.hide_from_fellowship end as hide_from_fellowship,
         case when l.lvl in ('admin','household') then h.hide_from_congregation end as hide_from_congregation,
         case when l.lvl in ('admin','household') then h.show_children_in_fellowship end as show_children_in_fellowship,
         case when l.lvl in ('admin','household') then h.privacy_confirmed_at end as privacy_confirmed_at,
         l.lvl as view_level
  from public.households h
  cross join lateral (select app.household_view_level(h.org_id, h.id, h.hide_from_congregation, h.hide_from_fellowship) as lvl) l
  where l.lvl <> 'none';
create view public.directory_persons with (security_barrier = true) as
  select p.id, p.org_id, p.household_id, p.first_name, p.last_name, p.preferred_name, p.sex, p.household_role,
         p.congregation_status, p.directory_listed, p.photo_path, p.email, p.mobile_phone, p.work_phone, p.deceased_on,
         p.marital_status, p.birthdate_visibility,
         case when l.lvl in ('admin','household') then p.birthdate end as birthdate,
         case when p.birthdate is null or p.birthdate_visibility = 'hidden' and l.lvl not in ('admin','household') then null
              when l.lvl in ('admin','household') then to_char(p.birthdate, 'YYYY-MM-DD')
              when l.lvl = 'congregation' and p.birthdate_visibility = 'full' then to_char(p.birthdate, 'YYYY-MM-DD')
              else to_char(p.birthdate, 'MM-DD') end as birthday_display,
         case when l.lvl = 'admin' then p.youth_override end as youth_override,
         case when l.lvl = 'admin' then p.member_since end as member_since,
         l.lvl as view_level
  from public.persons p
  join public.households h on h.id = p.household_id
  join public.organization_settings s on s.org_id = p.org_id
  cross join lateral (select app.household_view_level(p.org_id, p.household_id, h.hide_from_congregation, h.hide_from_fellowship) as lvl) l
  where l.lvl <> 'none'
    and (l.lvl in ('admin','household') or (p.directory_listed and p.deceased_on is null and p.congregation_status <> 'inactive'))
    and (l.lvl <> 'fellowship' or (
          (not s.fellowship_directory_adults_only or h.show_children_in_fellowship)
          or app.is_adult(p.household_role, p.birthdate, p.org_id)));
create view public.org_directory_info with (security_barrier = true) as
  select o.id, o.name, o.slug, s.logo_path from public.organizations o join public.organization_settings s on s.org_id = o.id
  where o.id = any(app.member_org_ids()) or o.id = any(app.fellowship_visible_org_ids());
grant select on public.directory_households, public.directory_persons, public.org_directory_info to authenticated;

-- (7) triggers — pattern
drop trigger if exists persons_assert_same_org on public.persons;
create trigger persons_assert_same_org before insert or update on public.persons
  for each row execute function app.assert_same_org('household_id', 'households');

-- (8) RLS baseline + policies
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);   -- NO force: owner bypass is required by the helper scheme
  end loop; end $$;
revoke all on all tables in schema public from anon;
-- client-readable base tables get column-level select only (sensitive columns excluded → PostgREST filters on them are rejected)
revoke all on public.persons, public.households from authenticated;
grant select (id, org_id, household_id, user_id, first_name, last_name, preferred_name, sex, household_role, congregation_status,
              directory_listed, photo_path, email, mobile_phone, work_phone, deceased_on, marital_status, birthdate_visibility,
              created_at, updated_at) on public.persons to authenticated;
grant select (id, org_id, name, address_line1, address_line2, city, region, postal_code, country, home_phone, photo_path,
              sort_key, created_at, updated_at) on public.households to authenticated;
-- writes to persons/households/leader notes and to every RPC-only table happen through public.* RPCs
revoke insert, update, delete on public.persons, public.households, public.household_leader_notes, public.person_leader_notes,
  public.org_memberships, public.org_membership_permissions, public.invitations, public.join_codes, public.join_requests,
  public.sermon_share_links, public.billing_customers, public.billing_subscriptions, public.stripe_events, public.notifications,
  public.notification_deliveries, public.audit_log, public.storage_deletions, public.account_deletion_requests, public.super_admins
  from authenticated;

-- policy pattern (real file: full catalogue in §6; every name starts with ca_)
drop policy if exists ca_sermons_select_members on public.sermons;
create policy ca_sermons_select_members on public.sermons for select to authenticated
  using (org_id = any((select app.member_org_ids()))
         and (publish_at <= now()
              or org_id = any((select app.perm_org_ids('sermons.upload')))
              or org_id = any((select app.perm_org_ids('sermons.link')))
              or org_id = any((select app.perm_org_ids('sermons.delete')))));
drop policy if exists ca_sermons_insert_by_kind on public.sermons;
create policy ca_sermons_insert_by_kind on public.sermons for insert to authenticated
  with check (app.org_writable(org_id) and (
    (media_kind = 'upload' and org_id = any((select app.perm_org_ids('sermons.upload')))) or
    (media_kind <> 'upload' and org_id = any((select app.perm_org_ids('sermons.link'))))));
drop policy if exists ca_persons_select_visible on public.persons;
create policy ca_persons_select_visible on public.persons for select to authenticated
  using (exists (select 1 from public.directory_persons d where d.id = persons.id));   -- base table only through the view's rule
drop policy if exists ca_orgs_select_fellowship on public.organizations;
create policy ca_orgs_select_fellowship on public.organizations for select to authenticated
  using (id = any((select app.member_org_ids())) or id = any((select app.fellowship_visible_org_ids())));
drop policy if exists ca_profiles_select_org_admin on public.profiles;
create policy ca_profiles_select_org_admin on public.profiles for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.org_memberships m where m.user_id = profiles.user_id
         and (m.org_id = any((select app.perm_org_ids('users.create'))) or m.org_id = any((select app.perm_org_ids('users.delete')))
              or m.org_id = any((select app.perm_org_ids('users.edit_permissions'))))));

-- (9) function grants: revoke PUBLIC default on everything, then grant precisely
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema app    from public, anon, authenticated;
grant execute on function app.is_super_admin(), app.member_org_ids(), app.perm_org_ids(public.permission_key),
  app.directory_admin_org_ids(), app.my_household_ids(), app.fellowship_visible_org_ids(), app.is_org_member(uuid),
  app.has_perm(uuid, public.permission_key), app.has_any_perm(uuid, public.permission_key[]), app.is_directory_admin(uuid),
  app.org_writable(uuid), app.household_view_level(uuid, uuid, boolean, boolean), app.person_age(date, uuid),
  app.is_minor(public.household_role, date, uuid), app.is_adult(public.household_role, date, uuid),
  app.can_edit_household(uuid), app.my_person_id(uuid), app.user_in_group(uuid) to authenticated;
-- client RPCs (each begins with perform app.require_user(); mutating ones also app.require_writable(org)):
grant execute on function public.my_context(), public.set_membership_permissions(uuid, public.permission_key[]),
  public.set_membership_status(uuid, public.membership_status), public.remove_membership(uuid),
  public.create_invitation(uuid, text, uuid, public.permission_key[]), public.revoke_invitation(uuid), public.accept_invitation(text),
  public.save_household(jsonb), public.save_person(jsonb), public.delete_person(uuid), public.set_household_privacy(uuid, boolean, boolean, boolean),
  public.save_leader_notes(text, uuid, text), public.set_congregation_status(uuid, public.congregation_status, date),
  public.create_share_link(uuid, text, text, timestamptz, int), public.revoke_share_link(uuid),
  public.submit_survey_response(uuid, jsonb), public.request_account_deletion() to authenticated;
-- server-only RPCs (public schema so supabase.rpc() reaches them; service_role only):
grant execute on function public.srv_resolve_share_link(bytea, text, text), public.srv_audience_user_ids(uuid, uuid),
  public.srv_enqueue_due_notifications(), public.srv_claim_notifications(int), public.srv_attach_user(uuid, uuid, uuid, text, public.permission_key[]),
  public.srv_process_account_deletions(), public.srv_housekeeping() to service_role;

-- (10) storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('sermon-media','sermon-media', false, 2147483648, array['audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/x-m4a','video/mp4','video/quicktime','video/webm']),
  ('bulletins','bulletins', false, 26214400, array['application/pdf','image/jpeg','image/png']),
  ('documents','documents', false, 52428800, array['application/pdf','image/jpeg','image/png','text/plain',
      'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('directory-photos','directory-photos', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('org-assets','org-assets', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
-- storage.objects: ca_storage_select (app.can_read_object) and ca_storage_insert (app.can_write_object, exact path) ONLY —
-- no update/delete policies for authenticated (see §7)

-- (11) bootstrap — paste AFTER signing up once on the deployed site:
-- insert into public.super_admins (user_id) select id from auth.users where email = 'founder@example.com' on conflict do nothing;
```

RPC semantics (bodies in the real file):
- `my_context()` → `{is_super_admin, orgs:[{org_id, slug, name, status, membership_status, person_id, household_id, permissions[]}]}`.
- `set_membership_permissions(membership_id, perms[])` — org derived from the membership row; requires `users.edit_permissions`; last-manager guard; audits diff.
- `set_membership_status(id, status)` — `disabled` needs `users.delete`, `active` needs `users.create`. `remove_membership(id)` — `users.delete`; hard-deletes membership + permissions, nulls `persons.user_id`, deletes that user's `push_devices`/`notification_preferences` for the org.
- `create_invitation(org, email, person_id, perms[])` — `users.create`; **`perms` non-empty requires `users.edit_permissions`**; returns raw token once. `accept_invitation(token)` — verifies hash/expiry/email; grants recorded perms only if the inviter *still* holds `users.edit_permissions` (else grants none and audits); creates a one-person household + person (`created_via='invitation'`, `attendee`) when `person_id` is null; for an existing member merges permissions and links `person_id` instead of failing.
- `save_household(jsonb)` / `save_person(jsonb)` / `delete_person(id)` — caller must satisfy `app.can_edit_household`; non-admins cannot set `congregation_status`, `member_since`, `youth_override`, `user_id` (other than own uid / null), `household_role` beyond `child|other`, and cannot link a `user_id` to a minor (COPPA); a person may edit own contact fields; `set_congregation_status` is admin-only; `set_household_privacy(hh, hide_fell, hide_cong, show_children)` — household adults any direction (stamps `privacy_confirmed_*`), directory admins only toward more privacy, super admin any; audited. Admin-created households get `hide_from_fellowship = true` by default.
- `save_leader_notes(kind, id, notes)` — directory admin only.
- `create_share_link(sermon, label, password, expires_at, max_views)` — `sermons.link|upload`, org `sermons_shareable`, sermon published, forces password when org requires, `length(password) >= 8`, `extensions.crypt(pw, extensions.gen_salt('bf', 10))`, `sha256(token)` stored; returns raw token once.
- `srv_resolve_share_link(token_hash, password, ip_hash)` — checks link, `revoked_at`, `expires_at`, `max_views`, org `sermons_shareable`, sermon `publish_at <= now()`; returns `needs_password_reset` when org now requires a password but `password_hash is null`; rate limits 10 failures / 15 min per token hash and per ip hash; increments `view_count` **only on successful unlock**.
- `srv_attach_user(user_id, org_id, person_id, display_name, perms[])` — used by direct account creation: active membership + person link/creation.
- `srv_housekeeping()` — prunes `rate_limits`, expires invitations, deletes upload-kind draft rows > 7 days without objects, flips `trial → past_due` when `trial_ends_at` passed (`billing_mode in ('stripe','manual')`), purges `cancelled` orgs > 30 days (enqueueing every `org_id/` prefix into `storage_deletions`).

## 5. Auth, tenancy & permissions

- **Supabase Auth**: email + password and **email OTP (6-digit)**; mobile is OTP-first. **Founder must edit the Magic Link email template to include `{{ .Token }}`** (otherwise `signInWithOtp` sends a link); mobile calls `verifyOtp({ email, token, type: 'email' })`; web PKCE callback remains for password reset and invites. Web sessions via `@supabase/ssr` cookies refreshed in `proxy.ts` (`cookies()` is async in Next 16; `setAll` wrapped in try/catch for Server Components). Mobile: `createMobileClient()` with `import 'react-native-url-polyfill/auto'` first, `auth: { storage: LargeSecureStore, lock: processLock, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }`; `AppState` → `startAutoRefresh/stopAutoRefresh`.
- **Tenancy**: `org_memberships (org_id, user_id, status)`; a user may belong to many orgs; clients filter by active `org_id` (`profiles.last_org_id`).
- **12 permissions**, grouped exactly as the founder listed (Sermon manager / Announcement manager / Organization manager). DB `app.has_perm`; TS `PERMISSION_KEYS` 12-tuple + `PERMISSION_GROUPS`; enum-parity type test. No "admin" flag.
- **Mapping of unnamed capabilities** (documented in `docs/RLS.md` and checkbox tooltips):
  | Capability | Permission used |
  |---|---|
  | Directory admin (edit any household/person, member status, link users, leader notes) | `users.create` **or** `org.settings` |
  | Invite users, create accounts directly, approve join requests (Phase 2) | `users.create` (granting permissions additionally needs `users.edit_permissions`) |
  | Remove a user's access | `users.delete` (disable or remove) |
  | Approve/reject member-submitted events; manage calendars | `announcements.edit` (approve), `org.settings` (calendar CRUD) |
  | Custom audience groups | `announcements.create` or `org.settings` |
  | Surveys (create/close/results) | `announcements.create` / `.edit` / `.delete` |
  | Sermon share links | `sermons.link` **or** `sermons.upload` |
  | View billing status, audit log | `org.settings` |
  Known consequence: survey managers who are not directory admins see "Hidden household" instead of names for households they cannot view.
- **Super admin**: `super_admins` row, DB-checked (`app.is_super_admin()`), never a JWT claim. **Bootstrap order**: create Supabase project → paste `9999_init.sql` → set Vercel env → deploy → sign up at `/login` → run the `super_admins` INSERT in the SQL editor → create the first church.
- **Getting accounts** (Phase 1 paths):
  1. **Invitation**: `create_invitation` → link `https://APP_URL/invite/{token}` (Resend if configured, else copy/paste). Emailed links are always https (custom-scheme links are not clickable in mail clients); the web invite page offers "Open in app" → `churchapp://invite/{token}`.
  2. **Direct account creation** (`users.create`): Server Action `createUserDirect({ email, tempPassword, personId | newHousehold, permissions })` → `auth.admin.createUser({ email, password, email_confirm: true })` → `srv_attach_user(...)`; permissions only if the actor holds `users.edit_permissions`. Covers members without personal email or with one shared household email; one auth account may be shared by a household (linked to one person only — open question 12).
  3. **Admin-created directory first**, then invite/create with `person_id` preselected.
  Phase 2 adds join codes (schema already present).
- **Household self-service** via RPCs (rules in §4.4). Family privacy override: adults flip any direction; org admins only toward privacy; super admin any; audited.
- **Suspended orgs**: `app.org_writable` required by every write policy **and** called (`app.require_writable`) at the top of every mutating RPC; reads stay available.
- **Account deletion**: `request_account_deletion()` (Phase 3 UI); `srv_process_account_deletions()` deletes the auth user with `app.cascade = 'on'`.

## 6. Row Level Security strategy

Baseline: every public table `enable row level security` (no `force`); owner-bypass asserted; `anon` no table/function grants; PUBLIC execute revoked on all functions in `public`/`app`; write-only-via-RPC tables have no write grants; `persons`/`households` have column-level select; all helpers `security definer set search_path = ''`; every trigger function `security definer`. Policies named `ca_*`, split per operation, use `= any((select app.xxx_org_ids()))` so viewer facts are InitPlans evaluated once per statement. Cross-org integrity via `app.assert_same_org` triggers on every child table.

Policy catalogue:

| Table | select | insert | update | delete |
|---|---|---|---|---|
| `organizations` | member or fellowship-visible (`ca_orgs_select_fellowship`) | super | super | — (never; `cancelled` + purge) |
| `organization_settings` | member | trigger | `org.settings` | — |
| `fellowships`, `fellowship_memberships` | member of a linked org | super | super | super |
| `profiles` | own row, or org admin of a shared org | own | own | — |
| `super_admins` | super | — | — | — |
| `org_memberships`, `org_membership_permissions` | own row or `users.*` | RPC | RPC | RPC |
| `invitations`, `join_codes`, `join_requests` | `users.create` (join_requests also own) | RPC | RPC | RPC |
| `households` (base, column-limited) | `exists in directory_households` | RPC | RPC | RPC |
| `persons` (base, column-limited) | `exists in directory_persons` | RPC | RPC | RPC |
| `household_leader_notes`, `person_leader_notes` | directory admin | RPC | RPC | RPC |
| views `directory_*`, `org_directory_info` | definer + barrier, self-filtering | — | — | — |
| `audience_groups` | member | `announcements.create` or `org.settings` | same | same |
| `audience_group_members` | `announcements.create` or `org.settings` only | same | — | same |
| `calendars` | member ∧ `user_in_group(view_audience_group_id)` | `org.settings` | `org.settings` | `org.settings` |
| `events` | member ∧ calendar visible ∧ (`approved` ∨ own ∨ `announcements.edit`) | member ∧ `members_can_submit_events` ∧ `user_in_group(submit group)` ∧ `submitted_by = auth.uid()` ∧ writable; trigger forces `pending`/`push=false` unless `announcements.create` | own while pending (no status change) or `announcements.edit` | `announcements.delete` or own pending |
| `sermons` | member ∧ (`publish_at <= now()` ∨ any `sermons.*`) | by `media_kind` | same split | `sermons.delete` |
| `sermon_share_links` | `sermons.link` or `sermons.upload` | RPC | RPC | — |
| `announcements` | member ∧ published ∧ not expired ∧ `user_in_group`, or `announcements.*` | `announcements.create` | `announcements.edit` | `announcements.delete` |
| `bulletins` | member ∧ published, or `bulletins.upload` | `bulletins.upload` | same | same |
| `documents` | member ∧ published ∧ `user_in_group`, or `documents.upload` | `documents.upload` | same | same |
| `surveys`, `survey_questions` | member ∧ `open` ∧ in window ∧ in audience, or `announcements.create` | `announcements.create` | `announcements.edit` (shape frozen after draft) | `announcements.delete` |
| `survey_responses`, `survey_answers` | own (person/household) or managers | member ∧ open ∧ in window ∧ in audience; scope stamped | own while open ∧ `allow_edit`; per_household → any adult | — |
| `push_devices`, `notification_preferences` | `user_id = auth.uid()` all ops | | | |
| `notifications` | `announcements.*` managers | trigger/service | service | — |
| `notification_deliveries`, `stripe_events`, `storage_deletions` | — / super | service | service | — |
| `billing_customers`, `billing_subscriptions` | `org.settings`, super | service | service | — |
| `audit_log` | `org.settings` or super | trigger | — | — |
| `account_deletion_requests` | own | RPC | service | — |

**Directory rule, stated once**: a Church A member sees a Church B household iff B's `directory_share_with_fellowship = true` (which requires `directory_share_in_congregation = true`), B is not suspended/cancelled, A and B share a fellowship, the household has neither `hide_from_fellowship` nor `hide_from_congregation`, the person is `directory_listed`, not inactive/deceased, and is an adult unless the household set `show_children_in_fellowship`. Fellowship level never sees birth years, anniversary years, privacy flags or leader notes. Within a congregation, members see listed households unless `directory_share_in_congregation = false` or `hide_from_congregation`; `birthdate_visibility = 'full'` shows the year to the congregation; directory admins and the household itself see everything (leader notes: admins only). Nothing is cached in tokens.

**Storage policies** (`storage.objects`): `ca_storage_select` → `app.can_read_object(bucket_id, name)` (sermon media iff the sermon row is visible; photos iff the household/person appears in `directory_*`; bulletins/documents iff member (+ `user_in_group`); org-assets iff `org_directory_info` visible); `ca_storage_insert` → `app.can_write_object(bucket_id, name)` = a row exists whose `storage_path`/`photo_path` **equals `name` exactly** and the caller holds the matching permission (or `can_edit_household`); path segments are validated with a uuid regex before casting. **No update/delete policies for `authenticated`**: deletions only via `storage_deletions` + service role. Orphan objects > 24 h are swept by the cron.

## 7. Storage & media

| Bucket | Path | Limit | MIME |
|---|---|---|---|
| `sermon-media` | `{org_id}/sermons/{sermon_id}/{uuid}.{ext}` | 2 GiB (Pro + raised global limit; Free = 50 MB → clear "exceeds plan limit" error mapping) | audio/*, mp4, mov, webm |
| `bulletins` | `{org_id}/bulletins/{bulletin_id}/{uuid}.{pdf,jpg,png}` | 25 MiB | pdf, jpeg, png |
| `documents` | `{org_id}/documents/{document_id}/{uuid}.{ext}` | 50 MiB | allow-list (pdf, office, images, txt) |
| `directory-photos` | `{org_id}/households/{id}/{uuid}.jpg`, `{org_id}/persons/{id}/{uuid}.jpg` | 10 MiB | jpeg, png, webp |
| `org-assets` | `{org_id}/logo/{uuid}.png` | 5 MiB | jpeg, png, webp (no SVG) |

All buckets private; signed URLs (1 h) under the user's session; TanStack Query caches them 50 min; players re-mint on 403; Range requests work. The share page never proxies media.

**Uploads**: TUS via `tus-js-client` → `${SUPABASE_URL}/storage/v1/upload/resumable`, `chunkSize: 6*1024*1024`, `uploadDataDuringCreation: true`, `removeFingerprintOnSuccess: true`, headers `authorization: Bearer <access_token>`, `x-upsert: 'false'`, metadata `bucketName/objectName/contentType(from the File)/cacheControl`. Flow: insert row with `publish_at = null` and the exact planned path → upload → update size/mime/duration → set `publish_at`. Mobile photos (Phase 2): `expo-image-manipulator` → `new File(uri).arrayBuffer()` (or `fetch(uri).arrayBuffer()`) → `upload(path, arrayBuffer, { contentType: 'image/jpeg' })` — never a Blob on RN.

**External links** — `packages/domain/src/media-links.ts` `parseMediaLink(url, platform: 'web'|'mobile')` → `{ kind, externalId?, canonicalUrl, embedUrl?, streamUrl?, strategy: 'youtube_hosted_embed'|'native_stream'|'webview'|'open_external' }`, pure, table-driven Vitest. No server-side probing in Phase 1; YouTube oEmbed "Re-check link" is Phase 2.
- YouTube: 11-char id → web `<iframe src="https://www.youtube-nocookie.com/embed/{id}">`; mobile loads **our hosted page** `https://APP_URL/embed/yt/{id}` in `react-native-webview` (`allowsInlineMediaPlayback`, `mediaPlaybackRequiresUserAction: false`), which provides a valid referer; "Open in YouTube" fallback. Helper text: unlisted works; private and embedding-disabled videos do not. No background audio (ToS).
- Dropbox: `dl=0` → `raw=1` (redirects to `dl.dropboxusercontent.com`, Range OK); mp3/m4a/aac/mp4/m4v → `native_stream`, else `open_external`. UI/MEDIA.md warn: Basic accounts get links disabled at 20 GB/day.
- Google Drive: web → iframe `/file/d/{id}/preview` (needs "Anyone with the link"); **mobile → `open_external`** in Phase 1 (preview player demands sign-in/cookies in WebViews).
- Other https: mp3/m4a/mp4/m3u8 → `native_stream`, else `open_external`; `http://` rejected by Zod and by the DB check.

**Share link + password flow**: `create_share_link` → raw token shown once as `${APP_URL}/s/{token}`. `/s/[token]` (Node runtime, service client): Node computes `token_hash = sha256(token)` and `ip_hash = sha256(ip + SHARE_LINK_COOKIE_SECRET)` → `srv_resolve_share_link(token_hash, null, ip_hash)`; if `needs_password` and no valid cookie → form → `POST /api/share/[token]/unlock` → RPC with password → jose-signed HttpOnly `Secure SameSite=Lax` cookie `share_{linkId}` (24 h, `Path=/s/{token}`). Unlocked: uploaded → 1 h signed URL into `<audio>/<video>`; external → embed. Headers: `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer`, CSP `frame-src youtube-nocookie.com drive.google.com`. Documented: signed URLs / provider links remain reachable ≤ 1 h after revocation.

**Android PDF (bulletins)**: download signed URL to `FileSystem.cacheDirectory`, open via `expo-intent-launcher` (`ACTION_VIEW`, content URI). iOS renders natively (Phase 3). Web: iframe/new tab.

## 8. Server-side logic

| Concern | Where | Notes |
|---|---|---|
| All CRUD | user-scoped Supabase client under RLS (`@church/db/queries/*`) | UIs never hold elevated keys |
| Multi-row invariants | `public.*` RPCs (definer, `search_path=''`, `require_user()`, `require_writable()`, explicit permission checks, `raise … using errcode` mapped in `@church/domain/errors.ts`) | SQL-testable |
| Invariants that must not be bypassable | DB triggers (all `security definer`) | `updated_at`, audit, same-org, org defaults, event pending/push, survey shape freeze + scope, column/privacy guards, storage deletion queue, notification cancel on delete, Stripe mirror, timezone validation |
| Direct user creation | Server Action `createUserDirect` (`users.create` verified with the user client) → service `auth.admin.createUser` → `srv_attach_user` | Password shown once to the admin |
| Stripe Checkout / Portal | `POST /api/billing/checkout`, `POST /api/billing/portal` (super admin; creates the Stripe Customer first and passes `customer=`; idempotency key = org id; `metadata.org_id`) | No-op + banner without `STRIPE_SECRET_KEY` |
| Stripe webhook | `POST /api/stripe/webhook`: Node runtime, `dynamic = 'force-dynamic'`, `raw = await req.text()`, `constructEvent`; **503 if secret missing**; insert `stripe_events {id, type, event_created, processed_at null}` (duplicate with `processed_at not null` → 200; duplicate unprocessed → reprocess); resolve org by `stripe_customer_id` then `metadata.org_id`; fetch the subscription from Stripe (authoritative) and ignore events older than stored `event_created`; on error set `error`, return 500 | Excluded from `proxy.ts` matcher |
| Share resolve/unlock | `/s/[token]` page + `POST /api/share/[token]/unlock` → `srv_resolve_share_link` | Only path to that RPC |
| YouTube embed host | `GET /embed/yt/[id]` (public, `noindex`, exempt from `X-Frame-Options`) | Used by mobile WebView |
| Invitations email | Server Action after `create_invitation`: Resend if configured, else return link | Zero-key Phase 1 |
| Push fan-out | `apps/web/src/lib/push/dispatch.ts`: `srv_claim_notifications(limit)` (`for update skip locked`); re-reads the referenced row (skip if missing/unpublished); recipients = `srv_audience_user_ids` (active members only) ∩ preferences ∩ enabled devices; `expo-server-sdk` chunks of 100; tickets → `notification_deliveries`; `attempts ≤ 5`. Called synchronously from publish Server Actions (`maxDuration = 60`) and by the cron | No Edge Functions |
| Enqueue | Trigger `app.on_content_publish` on announcements/bulletins/approved events/opened surveys; future-dated rows via `srv_enqueue_due_notifications()` in the cron | Fan-out resolved once in SQL |
| Single cron | `GET /api/cron/tick` (`Authorization: Bearer $CRON_SECRET`, `maxDuration = 60`): enqueue due → dispatch → receipts > 15 min (`DeviceNotRegistered` → disable device) → drain `storage_deletions` → sweep orphan objects > 24 h → `srv_housekeeping()` → `srv_process_account_deletions()`. Schedule: Hobby `0 12 * * *` committed; Pro `*/5 * * * *` documented. Idempotent under concurrency | One route |

Env vars (`.env.example`, `docs/ENV.md`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`; code reads `?? `), `SUPABASE_DB_URL` (typegen, hosted), `NEXT_PUBLIC_APP_URL`, `SHARE_LINK_COOKIE_SECRET`, `CRON_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `RESEND_API_KEY`/`RESEND_FROM` (optional), `EXPO_ACCESS_TOKEN` (optional); mobile: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_WEB_URL`; EAS: `EAS_PROJECT_ID`, `GOOGLE_SERVICES_JSON` (EAS file env var; `google-services.json` gitignored). Local/test: `DATABASE_URL=postgresql://churchapp_owner@localhost:5432/churchapp?sslmode=disable` (or the fallback port printed by `local-up.sh`), Playwright mock values (`NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`, dummy key), `E2E_SUPABASE_URL`/`E2E_SUPABASE_KEY`/`E2E_SUPER_EMAIL`/`E2E_SUPER_PASSWORD` for the full suite.

## 9. Web app (Next.js on Vercel)

Route map (`apps/web/app`):
- `(public)`: `/` (landing + sign in), `/s/[token]` (+ `unlock/route.ts`), `/embed/yt/[id]`, `/privacy`, `/terms`.
- `(auth)`: `/login` (password + OTP), `/signup`, `/auth/callback/route.ts`, `/auth/reset`, `/invite/[token]` (with "Open in app").
- `(super)` `/admin/*` — `requireSuperAdmin()`: `/admin` (churches: status, billing_mode, subscription badge, trial end), `/admin/churches/new`, `/admin/churches/[orgId]` (Details, Settings, Fellowships, Admins → invite/create first admin with all 12, Billing → checkout / portal / billing_mode / trial), `/admin/fellowships`, `/admin/fellowships/[id]`, `/admin/super-admins` (list + SQL instructions).
- `(org)` `/o/[orgSlug]/*` — `requireOrgMember(slug)`; every admin page and Server Action `requirePerm`: `/dashboard`, `/sermons`, `/sermons/new` (Upload | Link tabs), `/sermons/[id]` (edit, share-links panel), `/announcements`, `/announcements/new`, `/announcements/[id]/edit`, `/bulletins` ("This Sunday" / "Quarter" presets), `/users` (12-checkbox grid under three role headers; Invite dialog; **Create account** dialog; disable/remove), `/users/[membershipId]`, `/invitations`, `/settings` (sharing, directory, youth/adult ages, adult groups include youth, events, timezone, logo), `/settings/billing` (read-only). Phase 2 adds `/documents`, `/calendars`, `/events/pending`, `/directory/*`, `/groups`, `/join-codes`, `/join-requests`; Phase 3 adds `/surveys/*`, `/audit`, `/admin/audit`.
- `api/`: `stripe/webhook`, `billing/checkout`, `billing/portal`, `share/[token]/unlock`, `cron/tick`.

Guards: `proxy.ts` refreshes the session cookie and redirects unauthenticated `(super)/(org)` requests to `/login?next=`; matcher excludes `/api/stripe/webhook`, `/api/cron/tick`, `/s/*`, `/embed/*`, static assets. `require-*.ts` use the user-scoped server client (`React.cache`) and `my_context()`. Server Actions validate with Zod from `@church/domain`, write with the user client; the service client only for Stripe/push/share/cron/direct-create. Security headers in `next.config.ts`: CSP (`frame-src` youtube-nocookie + drive; `media-src` Supabase host), `X-Frame-Options: DENY` except `/s/*` and `/embed/*`, HSTS, `Referrer-Policy`. Vercel Node 22 runtime. Vercel **Pro** required at launch (Hobby forbids commercial use; cron cadence).

UI: Tailwind v4 + shadcn/ui, RHF + `zodResolver`, TanStack Query, `sonner`. Permission grid: rows = users, 12 checkboxes with role-header select-all, debounced call to `set_membership_permissions`, optimistic update; checkboxes disabled (tooltip) when the actor lacks `users.edit_permissions`. Directory privacy toggle `hide_from_congregation` hidden in UI until open question 4 is answered (column exists).

## 10. Mobile app (Expo)

Screen map (`apps/mobile/app`):
- `(auth)/sign-in` (OTP-first, password link), `verify-otp`, `invite/[token]` (deep link), `no-church` ("Ask your church to invite you or create your account"; Phase 2 adds join code entry + `pending`).
- `(app)/_layout.tsx` — requires session + ≥1 active membership; org switcher if >1.
- `(app)/(tabs)/home` (pinned + recent announcements, current bulletin card), `sermons`, `more` (Bulletins, Notification settings, Switch church, Sign out; Phase 2/3 add Directory, Calendar, Documents, Surveys, My household, Delete account).
- Stacks: `sermons/[id]`, `announcements/[id]`, `bulletins/[id]`, `settings/notifications`; Phase 2+: `events/*`, `directory/*`, `household/*`, `person/*`, `surveys/*`, `documents/*`.
- **Auth**: `createMobileClient()` (§5). Deep-link scheme `churchapp://`; Phase 2 adds `android.intentFilters` + `/.well-known/assetlinks.json` (SHA-256 from `eas credentials`) for https App Links.
- **Caching**: TanStack Query + async-storage persister on `expo-sqlite/kv-store` (`staleTime` 5 min, `gcTime` 7 days); signed URLs never persisted; read-mostly.
- **Playback**: `SermonPlayer` dispatches on `parseMediaLink(url, 'mobile').strategy` — `expo-audio` (`setAudioModeAsync({ shouldPlayInBackground: true, playsInSilentMode: true })`, lock-screen controls), `expo-video` (`VideoView`, fullscreen, PiP), `react-native-webview` on the hosted YouTube page, `expo-web-browser` for `open_external`.
- **Push**: after first sign-in an explainer → create Android channel `announcements` (importance high) → `requestPermissionsAsync` (POST_NOTIFICATIONS on 13+) → `getExpoPushTokenAsync({ projectId: Constants.expoConfig?.extra?.eas?.projectId })` → upsert `push_devices`; delete row on sign-out. `data.url` handled by `addNotificationResponseReceivedListener` → switch org → `router.push`. Android push requires the dev client / EAS build (not Expo Go).
- **EAS**: `eas.json` profiles `development` (dev client, apk), `preview` (apk — founder sideloads), `production` (aab, `autoIncrement`). `app.config.ts`: `android.package = "com.churchappcld.app"` (placeholder), `android.googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json'`, `extra.eas.projectId: process.env.EAS_PROJECT_ID`, `scheme: 'churchapp'`, `newArchEnabled: true`, plugins `expo-router`, `expo-notifications` (icon/color), `expo-secure-store`, `expo-video` (`supportsBackgroundPlayback`), `["expo-audio", { recordAudioAndroid: false, enableBackgroundPlayback: true }]` (plugin sets `UIBackgroundModes`; no manual infoPlist line), `expo-build-properties`. iOS fields (`ios.bundleIdentifier`) are present but **untested until Phase 3** (docs/MOBILE_BUILD.md). Build order: Expo account → `eas init` → Firebase project → download `google-services.json` (baked into the APK at build time) → upload FCM v1 service-account key (`eas credentials`) → `npx eas-cli build -p android --profile preview`.

## 11. Phasing

### Phase 1 — one long session: conventions, data layer, admin web, Android skeleton
**Ordered build checklist.** Each step ends with `git add -A && git commit && git push origin main` (first push `-u`). `prompt_history.txt` is appended before every commit.

1. **Git + conventions** — `git symbolic-ref HEAD refs/heads/main`; create `CLAUDE.md` (line 1 `@new_session_instructions.md`, line 2 `@HANDOFF.md`, repo map, and: "When the user says `update new_session_instructions`: edit `new_session_instructions.md`, commit `Update new_session_instructions: <summary>`, then update CLAUDE.md if anything it summarizes changed"), `new_session_instructions.md` (header: "reconstructed from the kickoff brief — replace via `update new_session_instructions`"; sections: session folder rule (max+1, letter suffix on name collision, quoted path), `prompt_history.txt` rule (append every prompt verbatim immediately, incl. the kickoff prompt, `--- YYYY-MM-DD HH:MM ---` in America/New_York, never edit past entries, included in every commit), `session_log.md` template (`## Shipped` one line per commit with short hash / `## Directional decisions` / `## Open questions / next step` / `## Notes`), git rule (push to `main` after every step), migration rules (descending numbering; per-construct re-runnability: policies/triggers `drop if exists`+`create`, functions `create or replace` (drop only on signature change after dropping dependents), views `drop view if exists`+`create`, enums guarded and values added in a separate paste), "Changing these instructions" section), `HANDOFF.md` (sections: State, Env status, **Applied migrations (hosted)** ledger `file | pasted on | by`, Founder's feature checklist with "not yet in UI" markers, **Added by plan (veto-able)** list, Founder to-dos, Decisions/pins), `Session log/001_2026-09-01/prompt_history.txt` (kickoff prompt), `Session log/001_2026-09-01/session_log.md` (stub), `scripts/session/new-session.sh`, `.gitignore`, `README.md` (stub). Commit `chore: session conventions and repo bootstrap`, push `-u origin main`.
2. **Monorepo scaffold** — `package.json`, `pnpm-workspace.yaml` (nodeLinker hoisted, onlyBuiltDependencies, catalog), `turbo.json`, `tsconfig.base.json`, `.nvmrc`, `.prettierrc`, `.editorconfig`, `.env.example`, `tooling/tsconfig/{base,nextjs,react-native,library}.json`, `tooling/eslint-config/{base,next,expo}.js`, empty `packages/{domain,db,supabase-client}/package.json` + `src/index.ts`, `vercel.json`, `.github/workflows/ci.yml`, `docs/ENV.md`. `pnpm install` → extend `onlyBuiltDependencies` from warnings. Commit `chore: pnpm/turbo monorepo scaffold`.
3. **Database** — `supabase/config.toml`, `supabase/migrations/9999_init.sql` (complete per §4), `supabase/seed/dev_seed.sql`, `supabase/tests/00_shim.sql` (roles `anon`/`authenticated`/`service_role` NOLOGIN, `churchapp_owner` NOSUPERUSER BYPASSRLS; `extensions` schema with pgcrypto/citext; `auth.users`, `auth.uid()/jwt()/role()`; `storage.buckets/objects/foldername`; skipped when `auth.uid` exists), `supabase/tests/helpers.sql`, `supabase/tests/rls/01_tenancy.sql … 09_grants.sql`, `scripts/db/{local-up.sh,apply-migrations.sh,test.sh,gen-types.sh,check-rerunnable.sh}`, `supabase/README.md`, `docs/MIGRATIONS.md`, `docs/RLS.md`. Run `local-up.sh`, `apply-migrations.sh` twice, `check-rerunnable.sh`, `test.sh` green. Record in HANDOFF which PG start path worked. Commit `feat(db): initial schema, RLS, RPCs, tests`.
4. **Shared packages** — `packages/domain/src/{permissions.ts,audiences.ts,media-links.ts,limits.ts,dates.ts,errors.ts,schemas/{org.ts,sermon.ts,announcement.ts,bulletin.ts,directory.ts,users.ts,share.ts}.ts}`, `packages/domain/fixtures/persons.json`, `packages/domain/src/**/*.test.ts`, `packages/domain/vitest.config.ts`; `packages/db/src/{database.types.ts (generated),client.ts,rpc.ts,keys.ts,queries/{sermons,announcements,bulletins,users,orgs,settings,notifications}.ts}`, `packages/db/type-tests/enum-parity.test-d.ts`; `packages/supabase-client/src/{index.ts,web.ts,mobile.ts,large-secure-store.ts}`. `pnpm turbo lint typecheck test` green. Commit `feat(packages): domain, db, supabase-client`.
5. **Web — foundation & auth** — `apps/web/{package.json,next.config.ts,postcss.config.mjs,tsconfig.json,vitest.config.ts,.env.example}`, `apps/web/proxy.ts`, `apps/web/app/{layout.tsx,globals.css}`, `app/(public)/page.tsx`, `app/(public)/privacy/page.tsx`, `app/(public)/terms/page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/(auth)/auth/callback/route.ts`, `app/(auth)/auth/reset/page.tsx`, `app/(auth)/invite/[token]/page.tsx`, `src/lib/supabase/{server,client,service}.ts`, `src/lib/auth/{require-user,require-org,require-perm,require-super}.ts`, `src/components/ui/*` (shadcn init + button/input/card/dialog/checkbox/table/tabs/select/badge/toast), `src/features/auth/*`. Commit `feat(web): app shell, auth, guards`.
6. **Web — super admin** — `app/(super)/admin/{layout.tsx,page.tsx}`, `app/(super)/admin/churches/new/page.tsx`, `app/(super)/admin/churches/[orgId]/page.tsx` (+ `src/features/orgs/{ChurchForm,SettingsForm,FellowshipLinks,FirstAdminDialog,BillingPanel}.tsx`), `app/(super)/admin/fellowships/{page.tsx,[id]/page.tsx}`, `app/(super)/admin/super-admins/page.tsx`, `src/lib/stripe/{client,sync}.ts`, `app/api/stripe/webhook/route.ts`, `app/api/billing/{checkout,portal}/route.ts`, `src/lib/stripe/__tests__/webhook.test.ts` (fixtures, idempotency, out-of-order). Commit `feat(web): super admin, Stripe behind env`.
7. **Web — org admin: users & settings** — `app/(org)/o/[orgSlug]/{layout.tsx,dashboard/page.tsx}`, `users/page.tsx`, `users/[membershipId]/page.tsx`, `invitations/page.tsx`, `settings/page.tsx`, `settings/billing/page.tsx`, `src/features/users/{PermissionGrid,InviteDialog,CreateAccountDialog,MembershipActions}.tsx`, `src/features/users/actions.ts`, `src/lib/users/create-direct.ts`, `src/lib/email/resend.ts`, `src/features/settings/{SettingsForm,actions}.ts(x)`. Commit `feat(web): users, permissions grid, invitations, direct accounts, settings`.
8. **Web — sermons & share links** — `sermons/page.tsx`, `sermons/new/page.tsx`, `sermons/[id]/page.tsx`, `src/features/uploads/{ResumableUpload.tsx,tus.ts}`, `src/features/sermons/{SermonForm,LinkPreview,SermonPlayer,ShareLinksPanel,actions}.ts(x)`, `app/(public)/s/[token]/page.tsx`, `app/api/share/[token]/unlock/route.ts`, `app/(public)/embed/yt/[id]/page.tsx`, `src/lib/share/{cookie,token}.ts` (+ tests). Commit `feat(web): sermons upload/link, share links, hosted YouTube embed`.
9. **Web — announcements, bulletins, push, cron** — `announcements/{page.tsx,new/page.tsx,[id]/edit/page.tsx}`, `bulletins/page.tsx`, `src/features/announcements/*`, `src/features/bulletins/*`, `src/lib/push/{expo,dispatch}.ts` (+ `dispatch.test.ts` with mocked SDK), `app/api/cron/tick/route.ts`. `apps/web/e2e/{playwright.config.ts,smoke.spec.ts}` (mock env: pages render, validation, unauth redirects, `/s/unknown` 404, headers). `pnpm --filter web build` green. Commit `feat(web): announcements, bulletins, push dispatch, cron`.
10. **Mobile** — `apps/mobile/{package.json (versions via npx expo install),app.config.ts,eas.json,metro.config.js,babel.config.js,tsconfig.json,.env.example}`, `app/_layout.tsx`, `app/(auth)/{sign-in,verify-otp,no-church}.tsx`, `app/(auth)/invite/[token].tsx`, `app/(app)/_layout.tsx`, `app/(app)/(tabs)/{_layout,home,sermons,more}.tsx`, `app/(app)/sermons/[id].tsx`, `app/(app)/announcements/[id].tsx`, `app/(app)/bulletins/[id].tsx`, `app/(app)/settings/notifications.tsx`, `src/lib/{supabase.ts,query-client.ts,push.ts,deep-links.ts,signed-url.ts}`, `src/features/sermons/SermonPlayer.tsx` (+ `players/{Audio,Video,YouTubeWebView,External}.tsx`), `src/features/feed/*`, `src/features/bulletins/OpenPdf.ts`, `docs/MOBILE_BUILD.md`, `docs/MEDIA.md`. `npx expo-doctor` and `npx expo export --platform android` clean. Commit `feat(mobile): Expo app — auth, feed, sermons, push`.
11. **Wrap-up** — `docs/CHECKLIST_SECURITY.md`, `README.md` (full), `HANDOFF.md` (env vars to fill, founder action items in bootstrap order, applied-migrations ledger empty, feature checklist, plan-added extras), `Session log/001_2026-09-01/session_log.md`. Commit `docs: handoff and session log`.

**Cut list (bottom-up):** (a) mobile Dropbox/other `native_stream` (keep upload + YouTube), (b) mobile notification-preferences screen, (c) OTP sign-in on web (keep password), (d) `/invitations` list page (invite dialog stays), (e) Playwright smoke. Never cut: migration + tests, users/permissions grid + invite/direct-create, sermons, announcements + push, share links, Stripe webhook, mobile auth + feed + push registration.

**Acceptance (Phase 1):** `pnpm install --frozen-lockfile && pnpm turbo lint typecheck test` green; `local-up.sh && apply-migrations.sh && apply-migrations.sh` succeeds and `08_rerunnable.sql` asserts identical object counts and zero non-`security definer` trigger functions; `check-rerunnable.sh` passes; `test.sh` passes: org A member gets 0 rows from org B; each of the 12 permissions positive/negative; `sermons.link` can insert youtube but not upload; last manager cannot be stripped (permissions or status); `users.create`-only cannot mint an invitation with permissions; org admin can set `hide_from_fellowship` true but not false; household adult can set both; admin-created household is hidden from fellowship by default; fellowship user sees no minors unless opted in; `directory_persons` hides birth year at fellowship level and `select birthdate from persons` → 42501 for authenticated; `directory_share_with_fellowship` without congregation sharing is rejected; disabled membership disappears from `srv_audience_user_ids`; `anon` cannot read tables or call any RPC; `authenticated` cannot execute `srv_*`; `srv_resolve_share_link` fails after org disables sharing or sermon unpublished; 10 wrong passwords lock the token; survey per_household second adult cannot double-respond; event insert by member forced to `pending` and `push=false`; suspended org rejects every mutating RPC; no policy-bearing table raises 42P17. `pnpm --filter web build` succeeds; Playwright smoke passes with mock env; `expo-doctor` + `expo export` clean. Founder can: paste `9999_init.sql`, deploy, sign up, insert his `super_admins` row, create a church, invite/create an org admin, build the preview APK.

**Founder action items after Phase 1 (in order):** create Supabase project (Free plan per founder decision 10 — 50 MB upload cap, pauses after 7 idle days; US East) → paste `9999_init.sql` (record in HANDOFF ledger) → edit Magic Link template to include `{{ .Token }}`, set OTP expiry, enable secure email change, configure custom SMTP or Resend → set Vercel env vars (Node 22, **Pro** plan) → deploy → sign up → run the `super_admins` INSERT → create first church → Expo account, `eas init`, Firebase project, `google-services.json` as EAS file env var, FCM v1 key via `eas credentials` → `eas build -p android --profile preview` → Stripe test keys + `stripe listen --forward-to` → choose app name / package id / domain / brand colours.

### Phase 2 — Directory, calendars, join codes, member self-service, member web
Households/persons CRUD (admin + self-service via RPCs), photos (ArrayBuffer upload), privacy toggles UI, fellowship linking UI, `directory_*` consumption in both apps with fellowship tab grouped via `org_directory_info`, custom groups UI, calendars/events (submit, approval queue, push on approval), documents UI, join codes + join requests (RPCs `redeem_join_code`/`approve_join_request`, `/join-codes`, `/join-requests`, printable page, mobile `join`/`pending`), Resend emails, YouTube oEmbed "Re-check link", CSV directory import, Android App Links (`assetlinks.json`), `(me)` web routes (optional — not founder-requested), directory performance test (`explain analyze` with a 5k-row synthetic fixture and an upper bound). Acceptance: full directory matrix in RLS tests + Playwright; push lands on a physical Android device and deep-links; Stripe test-mode checkout updates the badge via webhook.

### Phase 3 — Surveys, audit UI, account deletion, hardening, iOS
Survey builder/responder/results (per person/household, CSV; a household adult may answer `per_person` on behalf of another person in the household — pending open question 12), scheduled announcements UI, `/audit` + `/admin/audit`, account-deletion UI + privacy policy + Play Data Safety form, Sentry, `CHECKLIST_SECURITY.md` run-through, iOS: Apple Developer account, APNs key, `eas build -p ios`, TestFlight. Acceptance: survey uniqueness tests; cron idempotent under concurrent invocation; Play internal-testing build; TestFlight build.

### Phase 4 — Ideas (all plan-added; founder to confirm)
Anonymous surveys (salted hashed scope keys, `submitted_on` date granularity, participations table), birthday reminders (congregation-only, honoring privacy flags), recurring events, offline sermon downloads, image transforms, search, printed-directory PDF export honouring privacy flags, per-org data export, German UI strings, JWT claims hook if RLS latency warrants, PITR verification.

## 12. Verification & testing

- **Local DB without Docker**: `scripts/db/local-up.sh` tries `pg_ctlcluster 16 main start`; on failure runs `initdb -D "$SCRATCH/pg"` as the current user, picks a free port, `pg_ctl start`, and prints/exports `DATABASE_URL`; then `createdb churchapp`, applies `00_shim.sql`, and runs migrations as `churchapp_owner` (NOSUPERUSER, BYPASSRLS — mirrors Supabase's `postgres`). With Docker (founder's machine): `npx supabase start` + the same scripts against `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
- **RLS tests** (`supabase/tests/rls/*.sql`, `psql -v ON_ERROR_STOP=1`, each `begin; … rollback;`; `helpers.sql` defines `app_test.login(uid)`, `login_anon()`, `logout()`, `assert_count`, `assert_raises`, `assert_denied` (expects 42501)): `01_tenancy` (incl. no 42P17 on any table), `02_permissions` (12 × positive/negative, escalation via invitation), `03_directory_visibility` (matrix incl. column-level denial, direction rule, adults-only, admin-created default), `04_sermons_share_links`, `05_audiences` (fixtures shared with Vitest), `06_events_surveys`, `07_storage_billing_audit` (calls `app.can_read_object`/`can_write_object` directly; suspended org vs RPCs), `08_rerunnable` (re-apply + object counts + all trigger fns `prosecdef`), `09_grants` (anon: every RPC denied; authenticated: `srv_*` denied; `has_function_privilege` listing equals the intended client RPC set). The same files run verbatim in the hosted SQL editor.
- **Re-runnability guard** (`scripts/db/check-rerunnable.sh`): fails if any `create policy`/`create trigger` lacks a preceding `drop … if exists`; any `create type` outside a `do $$ if not exists` guard; any `create table`/`create index` lacking `if not exists`; any `create function` that is neither `create or replace` nor preceded by `drop function if exists`; any `create view` without a preceding `drop view if exists`; any function lacking `security definer` + `set search_path = ''`; any unqualified `crypt(`, `gen_salt(`, `gen_random_bytes(`, `digest(`; a file containing both `add value` and a literal of that value; any policy name not starting with `ca_`; any `force row level security`.
- **Type generation**: `gen-types.sh` → `npx supabase gen types typescript --db-url "$DATABASE_URL" --schema public`; CI `git diff --exit-code`.
- **Unit tests (Vitest 4)**: `packages/domain` — permissions, audience derivation (fixtures), `parseMediaLink` (web/mobile strategies, rejects), schemas, limits; `packages/db` — enum-parity (`vitest --typecheck`); `apps/web/src/lib` — Stripe webhook (idempotency, out-of-order, missing secret → 503), push dispatch (claiming, chunking, skip unpublished), share cookie/token hashing.
- **Playwright**: smoke with mock env; full suite when `E2E_*` set (super admin creates church → creates admin directly → admin toggles permissions → uploads small mp3 → password share link → anonymous unlock → org disables sharing → 404).
- **Mobile**: `typecheck`, `npx expo-doctor`, `npx expo export --platform android` in CI; device checklist in `docs/MOBILE_BUILD.md`.
- **Manual security checklist** (`docs/CHECKLIST_SECURITY.md`): secret key only in Vercel server env; anon grants none; `has_function_privilege` audit; every definer function `search_path=''`; buckets private; `srv_*` service-role only; share page `noindex`; CSP; custom SMTP; webhook verified; audit rows on permission/privacy changes; account deletion works.

## 13. Risks, pitfalls, and open questions for the founder

Risks / pitfalls:
1. **Descending migration numbering vs Supabase CLI**: never `supabase db push/reset`; only the apply script and hand-paste. `9999_init.sql` is frozen after the first production paste; later changes are `9998_*` with `add column if not exists` and backfill loops. HANDOFF ledger is the only record of hosted DB state.
2. **Enum additions** need their own paste (`9998a_enum.sql` / `9998b_use.sql`); the check script enforces it.
3. **Owner-bypass dependency**: the helper scheme requires the migration owner to have BYPASSRLS (true for `postgres` on Supabase; asserted on paste). Tables must always be created by that role.
4. **Supabase Free plan**: 50 MB upload cap; Pro + raised global limit for sermon media. Egress is the main variable cost; "link your own" is the lever. Dropbox Basic disables links at 20 GB/day.
5. **Expo push needs `google-services.json` at build time and the FCM v1 key in EAS**; Android push does not work in Expo Go.
6. **Vercel Hobby**: daily cron, imprecise minute, no commercial use → Pro at launch. Synchronous dispatch on publish covers the common case meanwhile.
7. **Supabase default SMTP** is rate-limited and the OTP template must be edited before mobile sign-in works.
8. **External links are only as private as the provider**; signed URLs live ≤ 1 h after revocation; Drive preview is web-only.
9. **Children's data**: no accounts; hidden from other congregations by default; a privacy policy and Play Data Safety form are mandatory before public listing.
10. **Very recent stack** (Next 16, Expo 57/RN 0.86, Zod 4, Tailwind 4): exact pins; ESLint 9; TS 5.9; `expo install` is the only source of native versions.
11. **RLS cost**: viewer facts are InitPlans, but `directory_persons` still evaluates one settings lookup per row; measured in Phase 2 with a 5k-row fixture; JWT claims hook is the escape hatch.
12. **Time zones**: age and "today" use `organization_settings.timezone` (validated); a wrong value shifts birthdays by a day.
13. **Local verification limits**: the shim proves SQL/RLS/grants; real Auth/Storage/TUS/push are verified only once a hosted project exists.
14. **Column-level grants + PostgREST**: `select *` on `persons`/`households` base tables fails for clients — all directory reads must use the views (enforced by the query layer; documented).
15. **Admin-created households default to hidden-from-fellowship**: fellowship directories stay sparse until families confirm privacy in the app — deliberate, see open question 5.

Rejected / deferred critique findings (with reason):
- *Column-level `grant update` on `persons` with `Prefer: return=minimal` for household edits* — replaced by `save_person`/`save_household` RPCs (one testable path for both apps; avoids `returning` failures on revoked columns).
- *Salted hashed survey `scope_key` and participations table for anonymous surveys* — deferred to Phase 4 with anonymous surveys themselves (not requested; Phase 1 ships no anonymous mode, so the leak does not exist).
- *Birthday-reminder privacy filters* — moot; birthday reminders removed from Phases 1–3 (not requested), design notes kept under Phase 4.
- *`household_in_group` for announcement visibility* — not implemented; recorded as open question 12 because it changes audience semantics the founder specified per person.
- *Keep `react-native-youtube-iframe` with `baseUrlOverride`* — dropped in favour of the hosted `/embed/yt/[id]` page in `react-native-webview` (fewer moving parts; library unmaintained since 2025-07).
- *Drop GitHub Actions CI* — kept as one non-blocking workflow; identical commands run locally, so it costs nothing to keep.
- *`billing_subscriptions.status` as plain text* — kept the enum (adds `unknown`) plus `status_raw text` so unknown Stripe statuses never fail the insert but the UI keeps a typed badge.
- *Per-fellowship `share_directory` on `fellowship_memberships`* — removed as redundant with the org-level setting; if an org in two fellowships needs per-fellowship control later, it is a one-column `9998` migration.

Open questions for the founder (defaults in parentheses are what Phase 1 ships):
1. "All attendees": everyone who attends, or non-member attendees only? (Two groups exist — `everyone` and `attendees` = non-members.)
2. Men's/Women's groups include youth (13+)? (Yes.) Adults are 18+ for fellowship visibility (`adult_min_age = 18`) — OK? Persons with role `other` and no birthdate are excluded from fellowship view and counted in men/women — OK?
3. Fellowship directory: adults only by default, children only if the family opts in? (Yes.) Fellowship viewers see phones/emails, or names + address only? (Everything the congregation sees, minus birth year, anniversary year and notes.)
4. Should a family also be able to hide from its **own congregation**? (Column exists; toggle hidden in UI until you answer.)
5. Admin-entered households start hidden from the fellowship until a family adult confirms in the app; leaders can only make a family *more* private. Acceptable, or should leaders be able to un-hide on a family's verbal request?
6. Accept the permission mapping in §5, or add toggles later?
7. Sermon share links for `Upload sermons` holders too? (Both.) Stream only, no download? (Stream only.) Minimum password length 8? (Yes.)
8. Push on every bulletin upload? (On, per-church toggle.) Birthday reminders wanted at all? (Not built.)
9. Billing: flat monthly price? Trial length (`trial_ends_at`, default 30 days)? Churches paying by check → `manual`. Should `past_due` restrict anything? (No — only `suspended` blocks writes.)
10. Fellowships created only by you? (Yes.) Reciprocal sharing required? (No.)
11. Sign-in: email OTP + password only? (Yes.) Members without email: admin-created accounts with a shared household email — acceptable?
12. One phone per household is common: should a household adult be able to answer per-person surveys for their spouse, and should per-person announcements (e.g. Women's) reach the household's account when the woman has none? (Not built; Phase 3 design note.)
13. App display name, Android package id (placeholder `com.churchappcld.app`), brand colours, production domain (affects deep links, invite emails, share URLs).
14. Supabase region (US East) and plan (Pro from day one); Vercel Pro at launch.
15. `prompt_history.txt` timestamps in America/New_York — correct timezone?
16. Directory tables are shipped without join codes in the UI (Phase 2); is invitation + direct account creation enough for the first congregation?

**Founder answers (2026-09-03)** to the plan-level questions are recorded in `HANDOFF.md` ("Founder answers to the plan's open questions") and `docs/PLAN.md` §13. Design deltas: `organization_settings.sermon_share_allow_download boolean default false` (share page offers Download for uploaded media when on); `hide_from_congregation` gets a UI toggle; youth/adult ages are church-configurable in settings (already modelled); billing is a flat $50 / month / church; head of house (`household_role = 'head'`) answers per-person surveys for household members without accounts (Phase 3); app name Anacast, package id `com.Anacast.app` (lowercase recommended); Supabase Free plan (50 MB upload cap) and Vercel Pro.
