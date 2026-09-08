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

actor_label = {'agent': 'Agent', 'founder': 'Founder', 'founder+agent': 'Founder + agent'}

out = []
w = out.append
w('# ChurchAppCLD build to-do list with a prompt for every step\n')
w('_Generated from `docs/PLAN.md` and `docs/DESIGN.md`; skeleton and step 0.1/1.1 written in session 002 (2026-09-03), the remaining steps drafted, critiqued and revised in session 003 (2026-09-04). Source of truth for build order; tick the boxes as steps land._\n')
w('## How to use this list\n')
w('1. Work top to bottom. Every step lists what it depends on; do not start a step before its dependencies are ticked.')
w('2. **Agent steps**: open a fresh Claude Code session in this repository and paste the whole text inside the step\'s prompt box. Add one line at the top if the session must work on a branch other than `main`. The agent ticks its own checkbox in this file, updates `HANDOFF.md`, commits and pushes.')
w('3. **Founder steps** are manual (Supabase dashboard, Vercel, Stripe, Expo). Follow the checklist, then tick the box yourself. Some founder steps end with a small helper prompt an agent can run to verify your work.')
w('4. After a step fails or an agent reports a deviation, use the reusable fix prompt (step 3.10) with the observations pasted in. Do not skip verification steps.')
w('5. Checkpoints: **A** (step 2.5) you are signed in on Vercel as super admin; **B** (step 3.9) the finished web app is trialled on Vercel; **C** (step 4.5) the Android preview build works. Everything after C completes Phases 2 and 3 of the plan.\n')
w('Sizes are one agent session each: S under an hour, M a few hours, L most of a session, XL a full long session (may need a follow-up session to finish verification).\n')
w('## Decisions these prompts assume\n')
w('Founder answers of 2026-09-03 (recorded in `HANDOFF.md`) and drafting decisions of 2026-09-04 (`Session log/003_2026-09-04/todo-drafts/orchestrator-decisions.md`). Change one of these and the affected prompts must change too.\n')
for line in [
    'App display name **Anacast**; Android package id `com.anacast.app` (founder wrote `com.Anacast.app`; lowercase recommended and immutable after the first Play upload; confirm in step 0.1); deep-link scheme `anacast`; brand colours and production domain deferred (neutral theme, `NEXT_PUBLIC_APP_URL`).',
    'Supabase **Free** plan (US East): 50 MB per upload (`NEXT_PUBLIC_MAX_UPLOAD_MB=50`, `sermon-media` bucket limit 50 MiB until Pro), project pauses after 7 idle days. Vercel **Pro** at launch (cron `*/5 * * * *`).',
    'Billing: flat **US$50 per church per month** via one Stripe Price (`STRIPE_PRICE_ID`); 30-day trial; only `suspended` blocks writes, `past_due` shows a banner.',
    'Families may hide from their own congregation (`hide_from_congregation` UI toggle) and from the fellowship; leaders may only make a family more private; fellowship viewers see everything the congregation sees minus birth year, anniversary year and leader notes.',
    'Each church sets its own youth/adult ages in settings (defaults 13 / 25 / 18; married excluded from youth; men\'s/women\'s include youth).',
    'Share links: password min 8, stream by default, **downloads allowed for uploaded media when `sermon_share_allow_download` is on**, available to `sermons.link` and `sermons.upload` holders.',
    'Push on every bulletin upload (per-church toggle, default on). Announcements & bulletins UI (3.5) ships before the push dispatcher (3.6): publishing queues notifications, 3.6 delivers them.',
    'Head of house: at most one `household_role = head` per household (partial unique index in `9999_init.sql`); in Phase 3 the head answers per-person surveys for household members without accounts.',
    'The 12-toggle permission mapping in `docs/RLS.md` ships as the default (not explicitly confirmed by the founder).',
    'Monorepo: Vercel Root Directory `apps/web`, `apps/web/vercel.json`, package names `web` / `mobile` / `@church/*`; `@types/react` follows the 19.2 line.',
    '`9999_init.sql` may still be edited until the founder pastes it into the hosted project (step 2.4); after that every change is a new `9998_*` file.',
]:
    w('- ' + line)
w('')

# master checklist
w('## Master checklist\n')
for ms, (title, blurb) in MILESTONES.items():
    ms_steps = [s for s in steps if milestone_of(s) == ms]
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
    ms_steps = [s for s in steps if milestone_of(s) == ms]
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
