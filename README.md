# ChurchAppCLD

Church management platform for Anabaptist/Mennonite congregations: sermons (uploaded or linked), push-notified
announcements, bulletins and documents, a privacy-controlled member directory, church calendars, and surveys.

- `apps/web` — Next.js 16 (Vercel): super admin and organization admin
- `apps/mobile` — Expo SDK 57: congregation member app (Android first)
- `supabase/` — Postgres schema, RLS, RPCs (hand-pasted migrations, descending numbering)

See `HANDOFF.md` for current state and founder to-dos, `docs/` for environment, migrations, RLS, media and
mobile build notes. Sessions follow `new_session_instructions.md` (loaded via `CLAUDE.md`).
