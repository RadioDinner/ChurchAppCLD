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

## Added 2026-09-08 (session 009, orchestrator decision memo before the global review)

These settle the cross-group items collected in the group files' `open_issues` and `proposed_additional_steps`
after all fourteen groups were drafted. Numbering fixes were applied directly to the group JSON files on
2026-09-08 (see session 009 `session_log.md`); prompt-level consequences are the global fixers' work and are
marked **fixer**. The founder may veto any of them.

20. **Super admin access to `/o/<slug>/*`: the pass-through rule wins.** G7's 3.1 stands: `requireOrgMember(slug)`
    admits an `active` membership OR a super admin with `membership_status = null` (RLS already accepts super-admin
    writes), with the "Viewing as super admin" strip. The founder's Checkpoint B objective ("trial the finished web app
    as the super admin") requires it. **Fixer:** G5 2.1a drops the `notFound()` rule and the comment pointing at
    proposed 3.11; 2.1b/2.2b drop the invite-yourself workaround from the founder to-dos; G6 2.5's checklist stops
    inviting the founder into the first church; G10 3.7b may sign in as the super admin for `/o/*` checks. Mobile is
    unchanged: the app is for members, so the founder still trials it as a member (4.1b hint, 4.5 item 2). Proposals
    G5 3.11 and G10 3.11 are rejected as absorbed.
21. **Migration numbers.** `9999_init.sql` is unfrozen until step 2.4 pastes it, so every schema correction discovered
    while drafting goes into 9999 through the G2/G3 fixers, not into a later migration: decision-15 archival columns
    and RPCs (6.3a's names); G9's three notification fixes (`srv_claim_notifications(org_id, max_rows)`,
    `app.on_content_publish` moving `scheduled_for` when `publish_at` changes, `ca_notifications_select` also for
    `bulletins.upload` where `kind = 'bulletin'`); G12's five directory/events gaps (atomic `set_head_of_house`,
    household-adult head designation, `events_require_approval` honoured, `calendars.members_can_submit`, leader
    branch in `ca_events_insert`) — the rejected 5.8 prompt is the specification; G13's `app.guard_system_audience_groups`
    trigger and the explicit `my_context()` / pending-membership behaviour; G8's cookie-verified share-link load as a
    service RPC (`srv_load_unlocked_share_link(link_id)` — name flagged) so 3.4b stops re-validating in TypeScript;
    `bulletins.publish_at` / `documents.publish_at` explicitly nullable; `documents.description`; FK actions on
    `announcements.document_id` / `audience_group_id`. **Reserved after the paste:** `9998_join_codes.sql` (5.6a),
    `9997_surveys_head_of_house.sql` (6.1a), `9996_account_archival.sql` (6.3a, case B only). Anything else that lands
    after the paste (a 3.10 round, the 3.5b `publish_at` fallback, 5.7c's optional indexes, the Pro bucket-limit raise)
    takes the next free number **from 9995 downward** and never 9998/9997/9996. The docs' worked example is renamed
    `9995_storage_limit.sql` (applied in 1.4a, 1.5, 2.4, 5.6a). **Fixer:** 3.10 and 3.5b say "next free number below
    the reserved block"; docs/MIGRATIONS.md (1.5) carries the reservation table; 5.6a/6.1a lose the "if 9998 is taken,
    shift" contingencies.
22. **RLS test files:** `10_surveys_head_of_house.sql` (6.1a), `11_join_codes.sql` (5.6a), `12_directory_matrix_phase2.sql`
    (5.7c), `13_account_deletion.sql` (6.3a — renamed from `11_`; applied in 6.3a, 6.3b, 6.2a, 5.7c). Later files take
    14 upward. Every migration step appends its own `\i` line to `08_rerunnable.sql` and extends `09_grants.sql`.
23. **Playwright layout.** Feature smoke specs are `apps/web/e2e/<feature>.smoke.spec.ts`, collected by 3.7a's
    `testMatch: /smoke\.spec\.ts/` — applied: `directory.smoke.spec.ts`, `events.smoke.spec.ts` (G12 and 5.7b/5.7c),
    `legal.smoke.spec.ts` (6.6, moved out of `e2e/smoke/`), alongside G13's `documents/groups/join/app-links.smoke.spec.ts`.
    Full specs are `apps/web/e2e/full/NN-<name>.spec.ts`: `01-acceptance`, `02-security` (3.7b), `03-phase2` (5.7c),
    `04-directory-import` (5.7b, optional), `05-surveys` (6.1b) — applied. 5.7c's widening of `testMatch` stays as a
    safety net. **Fixer:** simplify 5.7b's "if listed / if NOT listed" conditional and 5.7c's wording.
24. **Proposed steps — disposition (numbering fixed in the JSON files).**
    - Dropped: G1's 6.5 (already a real step in G14).
    - **Adopted, prompts still to draft** (the paragraphs here are the briefs, as decision 16 did for 6.6):
      **2.7** "Hosted smoke test script for the deployed web app" (agent, S, after 2.5; merges G6 2.7 and G10 3.12:
      `scripts/web/smoke-hosted.sh <URL>` — status codes, redirects, security headers, secret-leak grep, expected
      503/404s — plus a GitHub Actions job on `workflow_dispatch` and `deployment_status` that runs it against
      production; 2.6, 3.7a, 3.9 and 3.10 reuse it; 3.7a depends on it).
      **5.8** "Web join landing page `/join/[code]`, QR code on the printable sheet, `/join/*` Android App Link"
      (agent, M, after 5.6b, 5.6c, 5.7a; renumbered from G13's 5.9).
      **5.9** "FOUNDER Checkpoint D — Phase 2 trial" (founder, M, after 5.7c and 5.8; renumbered from G13's 5.10; the
      checklist starts with pasting `9998_join_codes.sql` and recording it in the ledger, then the new preview APK with
      App Links, assetlinks fingerprints in Vercel, Phase 2 web acceptance and the Android device checklist).
      **6.7** "FOUNDER — paste the Phase 3 migrations and record the ledger" (founder, S, after 6.1a and 6.3a;
      renumbered from G14's 6.1p; `9997_surveys_head_of_house.sql` and, in 6.3a's case B, `9996_account_archival.sql`;
      6.4 and 6.5 depend on it so store builds run against the hosted schema).
      **6.8** "Production release: Play closed test → production, App Store review submission" (founder+agent, M,
      after 6.4, 6.5, 6.6, 6.7; includes Google's 14-day closed-test rule for new personal accounts).
    - **Adopted and promoted now:** **4.6** "Mobile post-Checkpoint-C polish round (reusable template)" (G11's full
      prompt validated; moved into `steps`).
    - **Rejected:** G2 1.8 (folded into 2.4 as an optional dry-run item, **fixer**; 9999 is frozen only after a
      successful paste and ledger entry); G5/G10 3.11 (decision 20); G8 3.11, G9 3.12, G12 5.8 (decision 21);
      G14 6.1d (mobile is the Phase 3 responder); G14 6.7 super admin ops view (post-launch; **fixer** adds a cron
      health / failed pushes / storage backlog row to 6.3b's monitoring runbook; its id is freed for the paste step).
25. **Stale dependencies fixed:** 1.6a `1.4` → `1.4c`; 3.1 `2.2` → `2.2b`. The assembler's only remaining unknown
    dependencies are the adopted-but-undrafted steps 2.7 (from 3.7a) and 6.7 (from 6.4, 6.5); they clear when those
    steps are drafted.
26. **Over-length prompts accepted as written:** 1.2 (4040 words), 1.4a (4465), 1.5 (4141), 2.3 (3851), 5.6a (3974)
    and 6.3a (3392). They are SQL- or checklist-heavy steps where precision beats brevity; the fixers may remove
    repetition but must not cut content. No further splits.
27. **4.4's `com.churchappcld` mention is intentional** (a consistency grep that removes the old placeholder); the
    validator no longer warns when the mention sits inside a `git grep` command.
28. **`sharp` is allowed as a root devDependency** for store-asset generation (6.4/6.5), invoked from a Node script
    under `scripts/assets/`; the agent falls back to committing SVG sources if the install fails.
29. **Record-keeping for proposals.** Every remaining entry in `proposed_additional_steps` carries a `decision`
    field (adopted as …, rejected because …, folded into 9999); the assembler prints it in the appendix. Adopted
    steps without prompts stay in `proposed_additional_steps` under their final ids until a drafting bite writes
    them (`workflow-groups.js` `stage: draft, steps: [...]`); `workflow-groups.js` group entries list them.

30. **G2 prompt lengths after revision (2026-09-08, session 009).** The G2 reviser folded the decision-15/21 schema work into 1.2
    (5415 words), 1.3a (4564) and 1.3b (4708). Decision 26 is extended to 1.3a and 1.3b as written. 1.2 is the one candidate for
    a split: the global fixer for G2 first removes repetition without cutting content; if 1.2 still exceeds ~4500 words it
    splits into 1.2a (harness, shim, scripts, sections 0–2) and 1.2b (sections 3–4, seed of the section skeleton) per
    decision 13, repointing 1.3a's `depends_on`. The head-of-house rule is settled as the reviser applied it: the column
    guard stays strict; the only way to move the head is the atomic `set_head_of_house(hh, new_head, previous_head_role)`
    RPC (admitted through `app.can_edit_household`, running under the `app.trusted_rpc` flag), which satisfies decision 6.

31. **Founder answers, 2026-09-08 (session 009 wrap).** (a) **Production domain: none yet** — the web app lives on Vercel's
    generated `*.vercel.app` domains until the features work. Prompts keep `<DOMAIN>` / `NEXT_PUBLIC_APP_URL` / `EXPO_PUBLIC_WEB_URL`
    as the only source of the URL; 2.5 records the Vercel URL in HANDOFF; 5.7a's Android App Links, 5.8's `/join/*` links, 6.6's
    privacy-policy URL and the store listings (6.4/6.5) use whatever URL HANDOFF holds at the time and note that changing the domain
    later means re-verifying `assetlinks.json`, re-issuing the store privacy URL and updating the Supabase Auth redirect list — the
    global fixer adds that sentence where a step bakes the URL in. (b) **Legal entity: not decided** — candidates "Elevare Holdings
    LLC" or "CodeFuse Solutions"; `<LEGAL_ENTITY_NAME>` and the other 6.6 placeholders stay until the founder picks one. (c) The
    permission-mapping question was re-asked with the table from DESIGN §5 because `docs/RLS.md` does not exist yet (step 1.5
    writes it); answer pending.

32. **Founder answers, 2026-09-08 (final).** (a) **30-day deletion grace confirmed** (decision 15 stands; the self-restore-on-sign-in
    default stands unless the founder says otherwise). (b) **Brand palette token roles confirmed** as suggested in decision 17
    (`primary` Imperial Blue, `primaryDark` Deep Navy, `ink` Prussian Blue, `accent` Bright Marine, `tint` Icy Blue) — prompts may
    drop the "founder may veto" caveat. (c) **Do not merge to `main` until the founder says so**; all TODO.md work stays on
    `claude/project-status-todo-plan-leghlm`. (d) **Stale branches: delete approved** (`claude/plan-todo-prompts-ia7gkd`, fully merged; `claude/plan-todo-prompts-w3madd`,
    record-only — its session-002 prompt history is preserved at `Session log/002_2026-09-03/prompt_history.w3madd-branch.txt`).
    The session's git proxy refuses branch deletion (`git push --delete` → "remote end hung up"), so the founder deletes them in
    GitHub → Branches, or a later session with direct access does. The
    founder asked not to be asked these again; the permission-mapping yes/no (decision 31c) is the only question still open.

33. **Permission mapping accepted (founder, 2026-09-08: "Good with permission toggles").** The DESIGN §5 capability → toggle table
    ships as-is; `docs/RLS.md` (step 1.5) and the checkbox tooltips document it. HANDOFF founder-answer row 4 is now answered.
    No founder questions remain open.
