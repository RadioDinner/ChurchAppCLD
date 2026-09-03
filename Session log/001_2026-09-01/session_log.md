# Session 001 — 2026-09-01 (continued 2026-09-03)

## Shipped
- `92956bf` chore: session conventions and repo bootstrap (new_session_instructions.md verbatim, CLAUDE.md, HANDOFF.md, Session log/, new-session script)
- `7db4f3f` chore: monorepo scaffold and plan documents (docs/PLAN.md, docs/DESIGN.md) — scaffold portion reverted below
- `9e56491` chore(session): update prompt history
- (this commit) revert the scaffold; keep only the plan, design document and session conventions

## Directional decisions
- Mobile: Expo / React Native in a pnpm monorepo with the Next.js web app; EAS Build for Android first.
- Billing: Stripe subscriptions per church, webhook-synced; also manual/free billing modes.
- Sermon media: Supabase Storage uploads AND external links (unlisted YouTube, Dropbox, Google Drive, any https).
- Git: push to `main` directly.
- "All attendees" = everyone who attends, members included.
- Fellowship directory: adults only by default; family opts children in; admin-entered households hidden until a family adult confirms; leaders can only make a family more private.
- Timezone America/New_York for logs and default church timezone.
- No Supabase Edge Functions / pg_cron: Next.js Route Handlers + DB triggers + one Vercel Cron.

## Open questions / next step
- Next session: start plan step 2 (monorepo scaffold) and step 3 (`supabase/migrations/9999_init.sql` + local PG16 shim + RLS tests) per `docs/PLAN.md` §10.
- Founder open questions are listed in `HANDOFF.md` and `docs/PLAN.md` §13.

## Notes
- This session's mandate was planning only. The founder's "merge this to main" meant commit the plan; a monorepo scaffold was started by mistake and removed. No application code or migrations exist yet.
- Local PostgreSQL 16 is installed in the dev container (cluster down, Docker unavailable): the plan's local verification path uses it via `scripts/db/local-up.sh`.
- The design document `docs/DESIGN.md` is the long-form reference; `docs/PLAN.md` is the executable summary.
