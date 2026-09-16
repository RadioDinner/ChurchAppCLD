#!/usr/bin/env python3
"""Assemble docs/TODO.md from the per-group JSON files written by the workflow."""
import json, glob, re, sys, os
from collections import OrderedDict

SCRATCH = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/user/ChurchAppCLD/docs/TODO.md'

MILESTONES = OrderedDict([
    ('M0', ('Prerequisites (founder)', 'Accounts and decisions only; no code.')),
    ('M1', ('Foundation and data layer', 'Monorepo, the complete `9999_init.sql` with RLS and tests, shared packages.')),
    ('M2', ('Web foundation, super admin, first deployment', 'Ends at **Checkpoint A**: you sign in on Vercel as super admin and create a church.')),
    ('M3', ('Web org admin: the finished web app', 'Ends at **Checkpoint B**: the complete web app on Vercel, trialled as super admin and as a church admin.')),
    ('M4', ('Android app (Phase 1 completion)', 'Ends at **Checkpoint C**: preview APK signs in, plays sermons, receives push.')),
    ('M5', ('Phase 2: directory, calendars, documents, groups, join codes', '')),
    ('M6', ('Phase 3: surveys, audit, account deletion, iOS', '')),
])

def id_key(sid):
    m = re.match(r'^(\d+)\.(\d+)([a-z]?)$', sid)
    if not m:
        return (999, 999, sid)
    return (int(m.group(1)), int(m.group(2)), m.group(3))

def milestone_of(step):
    ms = step.get('milestone') or ''
    if ms in MILESTONES:
        return ms
    return 'M' + step['id'].split('.')[0]

def fence_for(text):
    longest = 0
    for run in re.findall(r'`+', text or ''):
        longest = max(longest, len(run))
    return '`' * max(3, longest + 1)

steps = []
proposed = []
open_issues = []
for path in sorted(glob.glob(os.path.join(SCRATCH, 'groups', 'G*.json'))):
    if path.endswith('.draft.json'):
        continue
    with open(path) as f:
        data = json.load(f)
    for s in data.get('steps', []):
        s['_group'] = data.get('group', os.path.basename(path))
        steps.append(s)
    for p in data.get('proposed_additional_steps', []) or []:
        p['_group'] = data.get('group')
        proposed.append(p)
    for o in data.get('open_issues', []) or []:
        open_issues.append(f"{data.get('group')}: {o}")

# de-duplicate ids (keep first, report)
seen = {}
for s in steps:
    if s['id'] in seen:
        print(f"WARNING duplicate step id {s['id']} in {s['_group']} and {seen[s['id']]}", file=sys.stderr)
    seen.setdefault(s['id'], s['_group'])
steps.sort(key=lambda s: id_key(s['id']))
ids = {s['id'] for s in steps}
for s in steps:
    for d in s.get('depends_on', []) or []:
        if d not in ids:
            print(f"WARNING {s['id']} depends on unknown {d}", file=sys.stderr)


def topo(ms_steps):
    """Dependency order within a milestone (a step never prints before a step it depends on), stable by id."""
    by_id = {s['id']: s for s in ms_steps}
    done, out = set(), []
    pending = sorted(ms_steps, key=lambda s: id_key(s['id']))
    while pending:
        ready = [s for s in pending if all(d in done or d not in by_id for d in (s.get('depends_on') or []))]
        if not ready:  # cycle guard: fall back to id order for the rest
            ready = [pending[0]]
        nxt = ready[0]
        out.append(nxt); done.add(nxt['id']); pending.remove(nxt)
    return out

actor_label = {'agent': 'Agent', 'founder': 'Founder', 'founder+agent': 'Founder + agent'}

out = []
w = out.append
w('# ChurchAppCLD build to-do list with a prompt for every step\n')
w('_Generated from `docs/PLAN.md` and `docs/DESIGN.md`. Skeleton and steps 0.1/1.1 written in session 002 (2026-09-03); the remaining steps drafted, critiqued and revised in sessions 003–009 (2026-09-04 … 2026-09-08); founder decisions recorded through 2026-09-08; global review and fixes in session 010 (2026-09-15). Source of truth for build order; tick the boxes as steps land._\n')
w('## How to use this list\n')
w('0. **Branch**: this file, the kit and `HANDOFF.md` were merged into `main` on 2026-09-16 (founder: "merge it"). Every agent prompt says "Work on `main` unless I have named another branch in this session" — so nothing to add unless you deliberately want a step built on a side branch.')
w('1. Work top to bottom. Within each milestone the steps are printed in dependency order (a step never appears before a step it depends on; ties keep id order), so ids can look out of sequence — for example 6.6 and 6.7 print before 6.4 and 6.5. Every step lists what it depends on; do not start a step before its dependencies are ticked.')
w('2. **Agent steps**: open a fresh Claude Code session in this repository and paste the whole text inside the step\'s prompt box. The agent ticks its own checkbox in this file, updates `HANDOFF.md`, commits and pushes. Some prompts are templates with a fenced fill-in block — replace every `<…>` before pasting. A prompt may stop and ask you a question; answer it in that same session.')
w('3. **Founder steps** are manual work in a browser console (Supabase, Vercel, Stripe, Expo/EAS, Firebase, Google Play Console, Apple Developer). Follow the numbered checklist, record what it tells you to record (HANDOFF ledger, env vars, password manager), then tick the box yourself. Some founder steps end with a small helper prompt an agent can run to verify your work.')
w('4. **Founder + agent steps** (6.4, 6.5, 6.6, 6.8) run in three passes: paste the agent prompt (first pass), follow the founder checklist, then paste the same prompt again with the mode line the prompt names (for example `review`, `release`, or the results you collected) for the second pass.')
w('5. **Never type a key, password, token or real email address into a Claude Code prompt or chat.** `prompt_history.txt` is committed verbatim. Keep secrets in your password manager and in Vercel/EAS environment settings; a URL is the only value you paste.')
w('6. **When something goes wrong**, use the prompt that owns that situation:')
w('   | Situation | Use |')
w('   |---|---|')
w('   | An agent step ends with failing checks or an unfinished step (any milestone) | Open a fresh session, paste the same prompt again, and add at the end: "Previous attempt ended with: <paste the agent\'s final message>. Continue from the current state of the branch; do not start over." |')
w('   | Deployment, build, email or paused-Supabase-project problems after 2.5 | Step 2.6 (post-deploy triage) |')
w('   | Web bugs or polish after Checkpoint B | Step 3.10 (fix/polish round) |')
w('   | Android build or device problems | Step 4.5\'s helper prompt, then 4.6 |')
w('   | Phase 2 trial problems | Step 5.9\'s helper prompt |')
w('   | Store listing / TestFlight / release problems | The second passes of 6.4, 6.5 and 6.8 |')
w('   After every step, read the agent\'s final message and the "Deviations from plan" section of `HANDOFF.md`. A question left there is yours to answer before the next step; a deviation you veto goes into the owning step\'s notes and that step is re-run. Do not skip verification steps.')
w('7. Checkpoints: **A** (step 2.5) you are signed in on Vercel as super admin; **B** (step 3.9) the finished web app is trialled on Vercel; **C** (step 4.5) the Android preview build works; **D** (step 5.9) the Phase 2 features (directory, calendars, documents, join codes) are trialled on web and Android. Everything after D completes Phase 3 (surveys, audit, account deletion, iOS, store release).\n')
w('Sizes are one agent session each: S under an hour, M a few hours, L most of a session, XL a full long session (may need a follow-up session to finish verification).\n')
w('## Decisions these prompts assume\n')
w('Founder answers of 2026-09-03 … 2026-09-08 (recorded in `HANDOFF.md`) and orchestrator decisions 1–33 (`Session log/003_2026-09-04/todo-drafts/orchestrator-decisions.md`). Change one of these and the affected prompts must change too.\n')
for line in [
    'App display name **Anacast**; Android package id `com.anacast.app` (lowercase confirmed by the founder 2026-09-07; immutable after the first Play upload); deep-link scheme `anacast`; Expo slug `anacast`.',
    'Brand palette (confirmed 2026-09-08): Prussian Blue `#00072d` = `ink`, Deep Navy `#001c55` = `primaryDark`, Imperial Blue `#0a2472` = `primary`, Bright Marine `#0e6ba8` = `accent`, Icy Blue `#a6e1fa` = `tint` (never as text on white). One token file per app; store assets use the same values.',
    'No production domain yet: the web app runs on Vercel\'s generated URL via `NEXT_PUBLIC_APP_URL` / `EXPO_PUBLIC_WEB_URL` until the features work. Changing the domain later means re-verifying `assetlinks.json` (5.7a), re-issuing the store privacy URL (6.6) and updating the Supabase Auth redirect list.',
    'Supabase **Free** plan (US East): 50 MB per upload (`NEXT_PUBLIC_MAX_UPLOAD_MB=50`, `sermon-media` bucket limit 50 MiB until Pro), project pauses after 7 idle days (restore from the dashboard). Vercel **Pro** at launch (cron `*/5 * * * *`).',
    'Billing: flat **US$50 per church per month** via one Stripe Price (`STRIPE_PRICE_ID`); 30-day trial; only `suspended` blocks writes, `past_due` shows a banner.',
    'Families may hide from their own congregation (`hide_from_congregation` UI toggle) and from the fellowship; leaders may only make a family more private; fellowship viewers see everything the congregation sees minus birth year, anniversary year and leader notes.',
    'Each church sets its own youth/adult ages in settings (defaults 13 / 25 / 18; married excluded from youth; men\'s/women\'s include youth).',
    'Share links: password min 8, stream by default, **downloads allowed for uploaded media when `sermon_share_allow_download` is on**, available to `sermons.link` and `sermons.upload` holders.',
    'Push on every bulletin upload (per-church toggle, default on). Announcements & bulletins UI (3.5) ships before the push dispatcher (3.6): publishing queues notifications, 3.6 delivers them.',
    'Head of house: at most one `household_role = head` per household (partial unique index); the head moves only through the atomic `set_head_of_house` RPC; in Phase 3 the head answers per-person surveys for household members without accounts.',
    'The 12-toggle permission mapping in `docs/RLS.md` was **accepted by the founder on 2026-09-08**; extra toggles would be a later migration.',
    'Super admins pass through to every church\'s `/o/<slug>/*` pages (a "Viewing as super admin" strip is shown); the founder never has to invite himself into a church.',
    'Accounts: the self-service action is **Deactivate** (reversible archive, super admin can restore); a real **Delete account** exists on web and mobile because Google Play requires it, with a 30-day grace during which the user or the super admin can cancel. A placeholder privacy policy ships in `docs/legal/`; step 6.6 replaces it with the lawyers\' text before the store listings (legal entity still undecided).',
    'Monorepo: Vercel Root Directory `apps/web`, `apps/web/vercel.json`, package names `web` / `mobile` / `@church/*`; `@types/react` follows the 19.2 line.',
    'Migrations: `9999_init.sql` may still be edited until the founder pastes it into the hosted project (step 2.4); after that it is frozen. Reserved numbers: `9998_join_codes.sql` (5.6a), `9997_surveys_head_of_house.sql` (6.1a), `9996_account_archival.sql` (6.3a, case B); every other later migration takes the next free number counting down from 9995 (worked example `9995_storage_limit.sql`).',
]:
    w('- ' + line)
w('')

# master checklist
w('## Master checklist\n')
for ms, (title, blurb) in MILESTONES.items():
    ms_steps = topo([s for s in steps if milestone_of(s) == ms])
    if not ms_steps:
        continue
    w(f'### {ms} — {title}\n')
    if blurb:
        w(blurb + '\n')
    w('| Done | Step | Title | Who | Depends on | Size |')
    w('|---|---|---|---|---|---|')
    for s in ms_steps:
        deps = ', '.join(s.get('depends_on') or []) or '—'
        w(f"| [ ] | {s['id']} | {s['title']} | {actor_label.get(s.get('actor'), s.get('actor'))} | {deps} | {s.get('estimated_session','')} |")
    w('')

# detailed steps
w('---\n')
w('## Steps and prompts\n')
for ms, (title, blurb) in MILESTONES.items():
    ms_steps = topo([s for s in steps if milestone_of(s) == ms])
    if not ms_steps:
        continue
    w(f'## {ms} — {title}\n')
    for s in ms_steps:
        w(f"### {s['id']} — {s['title']}\n")
        w(f"- **Who:** {actor_label.get(s.get('actor'), s.get('actor'))}")
        deps = ', '.join(s.get('depends_on') or []) or 'none'
        w(f"- **Depends on:** {deps}")
        if s.get('reads'):
            w(f"- **Read first:** {', '.join(s['reads'])}")
        if s.get('estimated_session'):
            w(f"- **Size:** {s['estimated_session']}")
        if s.get('commit_message'):
            w(f"- **Commit:** `{s['commit_message']}`")
        w('')
        if s.get('goal'):
            w('**Goal.** ' + s['goal'].strip() + '\n')
        if s.get('actor') in ('founder', 'founder+agent') and s.get('founder_checklist'):
            w('**Founder checklist**\n')
            w(s['founder_checklist'].strip() + '\n')
        if s.get('prompt'):
            label = 'Prompt (paste into a fresh Claude Code session)' if s.get('actor') == 'agent' else 'Agent prompt'
            f = fence_for(s['prompt'])
            w(f'**{label}**\n')
            w(f + 'text')
            w(s['prompt'].strip())
            w(f + '\n')
        if s.get('helper_prompt'):
            f = fence_for(s['helper_prompt'])
            w('**Helper prompt for an agent (optional)**\n')
            w(f + 'text')
            w(s['helper_prompt'].strip())
            w(f + '\n')
        if s.get('done_when'):
            w('**Done when**\n')
            for d in s['done_when']:
                w(f'- [ ] {d}')
            w('')
        if s.get('notes'):
            w('**Notes.** ' + s['notes'].strip() + '\n')
        w('---\n')

if proposed or open_issues:
    w('## Appendix: proposals and open issues from drafting\n')
    if proposed:
        w('### Proposed additional steps and the orchestrator decision on each\n')
        for p in proposed:
            dec = f" — **{p['decision']}**" if p.get('decision') else ''
            w(f"- **{p.get('id','?')} {p.get('title','')}** ({p.get('_group')}){dec}: {p.get('reason','')}")
        w('')
    if open_issues:
        w('### Open issues noted by drafters\n')
        for o in open_issues:
            w(f'- {o}')
        w('')

text = '\n'.join(out)
with open(OUT, 'w') as f:
    f.write(text)
print(f"wrote {OUT}: {len(steps)} steps, {len(text)} bytes, {len(text.split())} words")
