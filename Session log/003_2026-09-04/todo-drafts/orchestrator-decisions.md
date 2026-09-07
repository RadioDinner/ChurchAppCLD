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

## Added 2026-09-07 (session 008, founder decisions)

15. **Account archival instead of deletion (founder decision, 2026-09-07).** The self-service action in both apps is
    **Deactivate account**, not delete: it archives the account (reversible) and signs the user out; nothing is deleted.
    Super admins restore archived accounts from `/admin` (users list → Archived → Restore); a restored account gets its
    memberships, permissions and directory visibility back. Recommended default (founder may veto): a user can also
    restore their own archived account by signing in and confirming "Restore my account".
    - Archived accounts behave like disabled memberships everywhere: the `app.*` membership helpers treat them as
      non-members (no org reads, no push, excluded from the directory and from audiences); `persons` rows stay; push
      devices are deleted at archive time. Prompts take column/RPC names from DESIGN §4 where an equivalent exists;
      otherwise use, consistently, `archived_at timestamptz`, `archived_by uuid`, `archive_reason`
      (`'user' | 'deletion_request' | 'admin'`) on the per-user table DESIGN §4 defines, client RPC
      `deactivate_account()`, service RPCs `srv_archive_account(user_id, reason)` and `srv_restore_account(user_id)`,
      and flag them in `open_issues`.
    - **Real deletion stays, in-app and on the web, because Google Play requires it.** Google Play's account-deletion
      policy (Play Console Help, "Understanding Google Play's app account deletion requirements") demands an in-app path
      plus a web link to delete the account and its associated data, and says temporary deactivation, disabling or
      freezing does not qualify. So `/account/delete` and the mobile Delete account screen remain and still call
      `request_account_deletion()`. What changes: the request archives the account immediately (reason
      `deletion_request`) and records `scheduled_for = requested_at + 30 days` (constant
      `ACCOUNT_DELETION_GRACE_DAYS = 30`, documented where it is defined); `srv_process_account_deletions()` processes
      only rows whose `scheduled_for` has passed; during the window the user (sign in → "Keep my account") or a super
      admin (`/admin`) cancels by deleting the request row and restoring the account. Super admins can also start a
      deletion request for a user who asks by email (same row, same grace). The 30-day window is a recommended default
      the founder may change.
    - UI copy distinguishes the two: "Deactivate account — hides you from your church and signs you out; your data is
      kept so an administrator can restore you later" vs "Delete account — permanently deletes your account and data
      after 30 days unless you cancel". The privacy policy, `docs/PLAY_DATA_SAFETY.md` and the App Store privacy
      answers describe both paths and the window.
    - Schema home: `9999_init.sql` is not pasted anywhere yet, so the global review's fixers add the columns, RPCs,
      policies and RLS tests to the G2/G3 prompts (1.2–1.4), and 6.3a builds only the UI, cron proof and docs on top.
      If the founder has pasted `9999_init.sql` before 6.3a runs, 6.3a ships the schema in the next free `999x_*`
      migration instead; 6.3a's prompt must state both cases. The G14 drafter's proposed 6.7 (grace period and cancel
      flow) is absorbed here and is no longer a separate step.

16. **Adopted step 6.6 — Privacy policy and terms of service (founder request, 2026-09-07).** FOUNDER+AGENT, after
    6.3a; 6.4 (App Store) and 6.5 (Play Console) depend on it because both stores require a live privacy-policy URL.
    There is no skeleton bullet; this paragraph is the brief. Founder checklist: choose and record in HANDOFF.md the
    legal entity name, postal address, governing state and privacy contact email (placeholders `<LEGAL_ENTITY_NAME>`,
    `<POSTAL_ADDRESS>`, `<STATE>`, `<FOUNDER_EMAIL>`); decide how the final text is produced — the 6.3a agent draft
    reviewed by a lawyer, a policy generator, or both; check the text covers what the app actually does (Supabase
    hosting in US East, Stripe billing for churches, push tokens, directory data shared inside the congregation and
    optionally with the fellowship, the deactivate-vs-delete paths and the 30-day window from decision 15, no ads, no
    analytics SDK, error monitoring if 6.3b's Sentry is enabled); approve the final text and its effective date; hand the
    approved text to the agent. Agent part: replace the draft in `apps/web/src/content/legal.ts` with the approved text,
    remove the draft banner and every placeholder (`LEGAL_IS_DRAFT` false), show "Last updated <date>", keep the
    deletion/deactivation paragraph word-for-word in sync with `src/features/account/deletion-copy.ts` on web and
    mobile, link `https://<DOMAIN>/privacy` and `/terms` from the mobile sign-in screen, the More tab and the web
    footer, update `docs/PLAY_DATA_SAFETY.md` with the live URL, add a smoke test that `/privacy` and `/terms` return
    200 with no "draft" or placeholder text, and record the effective date in HANDOFF.md. Done when: entity recorded,
    both pages live without placeholders, mobile links open them, the Data Safety worksheet names the URL, the smoke
    test passes. The G14 drafter's proposed super admin operations view is renumbered 6.7 (still a proposal).

17. **Brand palette (founder, 2026-09-07).** Five blues, given by the founder with their names: Prussian Blue `#00072d`,
    Deep Navy `#001c55`, Imperial Blue `#0a2472`, Bright Marine `#0e6ba8`, Icy Blue `#a6e1fa`. This replaces the
    "neutral default theme" in decision 5; the single token file rule stays (web: Tailwind tokens / `theme.ts` in 2.1a;
    mobile: `theme.ts` in 4.1a, also used for the splash `backgroundColor` and the adaptive-icon background; store
    assets in 6.4/6.5 use the same values). Recommended token roles (founder may veto): `primary` Imperial Blue
    (buttons, links, app bar), `primaryDark` Deep Navy (headers, pressed states, dark-mode surfaces), `ink` Prussian
    Blue (body text on light surfaces, darkest dark-mode surface, splash), `accent` Bright Marine (secondary buttons,
    active tab, focus rings), `tint` Icy Blue (backgrounds, badges, selected rows, hover). Measured WCAG contrast:
    white on Imperial 13.9, on Deep Navy 16.2, on Prussian 19.7, on Bright Marine 5.7 (AA pass, AAA fail — keep body
    text off Marine or use large text); Prussian on Icy 13.8; Icy on white 1.4 and Marine on Prussian 3.5 — never use
    Icy as text on white, and Marine on Prussian only for large text or non-text UI. Error/success/warning colours are
    not in the palette: use the framework defaults and note it in the token file.

18. **Android package id confirmed: `com.anacast.app`** (founder, 2026-09-07, "com.anacast.app is fine"). Decision 5's
    comment about `com.Anacast.app` becomes history; prompts use the lowercase id everywhere (app.config.ts, Firebase,
    Play Console, assetlinks) with no case caveat.

19. **Placeholder privacy policy (founder, 2026-09-07: "Make a placeholder privacy policy, I'll have my lawyers write the
    policy and exchange it before go-live").** The placeholder lives at `docs/legal/privacy-policy.md` (written from
    PLAN/DESIGN, placeholders in angle brackets, *For counsel* notes, draft banner). Step 6.3a copies that file into
    `apps/web/src/content/legal.ts` verbatim (draft banner on, "Placeholder" wording allowed only inside the banner)
    instead of writing its own privacy text; 6.3a still drafts the short terms of service. Step 6.6 replaces both with
    the lawyer-approved text before go-live and removes the banner. Keep the deletion/deactivation wording of section 5
    in sync with decision 15 whenever that changes.
