#!/usr/bin/env python3
"""Validate one or more group JSON files against the skeleton's shape and the prompt-writing rules.
Usage: validate.py groups/G2.json [more...]   (exit 1 on any error; warnings do not fail)"""
import json, re, sys
REQ = ['id','title','actor','milestone','depends_on','goal','prompt','founder_checklist','helper_prompt','done_when','commit_message','reads','estimated_session','notes']
OPEN = 'You are working in the ChurchAppCLD repository. CLAUDE.md loads `new_session_instructions.md` and `HANDOFF.md` automatically'
SECTIONS = ['## Goal','## Inputs / prior state','## Build','## Constraints','## Verify','## Finish']
errors, warns = [], []
def err(m): errors.append(m)
def warn(m): warns.append(m)
for path in sys.argv[1:]:
    try:
        data = json.load(open(path))
    except Exception as e:
        err(f'{path}: invalid JSON: {e}'); continue
    if not re.match(r'^G\d+$', str(data.get('group',''))): err(f'{path}: group must be like G7')
    steps = data.get('steps') or []
    if not steps: err(f'{path}: no steps')
    for s in steps:
        sid = s.get('id','?')
        for k in REQ:
            if k not in s: err(f'{path} {sid}: missing key {k}')
        if not re.match(r'^\d+\.\d+[a-z]?$', str(sid)): err(f'{path} {sid}: bad id')
        actor = s.get('actor')
        if actor not in ('agent','founder','founder+agent'): err(f'{path} {sid}: bad actor {actor}')
        if s.get('milestone') != 'M' + str(sid).split('.')[0]: err(f'{path} {sid}: milestone must be M{str(sid).split(".")[0]}')
        if not isinstance(s.get('depends_on'), list): err(f'{path} {sid}: depends_on must be a list')
        if s.get('estimated_session') not in ('S','M','L','XL'): err(f'{path} {sid}: estimated_session must be S|M|L|XL')
        dw = s.get('done_when') or []
        if len(dw) < 4: err(f'{path} {sid}: need >= 4 done_when items (have {len(dw)})')
        p = s.get('prompt') or ''
        words = len(p.split())
        if actor == 'agent':
            if not p.startswith(OPEN): err(f'{path} {sid}: prompt must start with the standard opening line')
            if f'step {sid} ' not in p and f'step {sid}"' not in p and f'{sid} "' not in p: warn(f'{path} {sid}: prompt does not name its own step id near the top')
            for sec in SECTIONS:
                if sec not in p: err(f'{path} {sid}: prompt lacks section "{sec}"')
            if words < 1200: err(f'{path} {sid}: agent prompt too short ({words} words; need >= 1200)')
            if words > 3400: warn(f'{path} {sid}: agent prompt long ({words} words)')
            if not s.get('commit_message'): err(f'{path} {sid}: agent step needs commit_message')
            if 'pnpm turbo lint typecheck test' not in p: err(f'{path} {sid}: prompt must include `pnpm turbo lint typecheck test`')
            if 'HANDOFF.md' not in p or 'docs/TODO.md' not in p or 'session_log.md' not in p: err(f'{path} {sid}: Finish block must mention HANDOFF.md, docs/TODO.md and session_log.md')
        if actor in ('founder','founder+agent'):
            fc = s.get('founder_checklist') or ''
            if len(fc.split()) < 150: err(f'{path} {sid}: founder_checklist too short ({len(fc.split())} words)')
            if not re.search(r'^\s*1\.', fc, re.M): err(f'{path} {sid}: founder_checklist must be a numbered list')
        if actor == 'founder+agent':
            if words < 600: err(f'{path} {sid}: founder+agent step needs an agent prompt of >= 600 words')
        hp = s.get('helper_prompt') or ''
        if hp and not hp.startswith(OPEN): err(f'{path} {sid}: helper_prompt must start with the standard opening line')
        for bad in re.findall(r'(?i)(sk_live_|sk_test_[A-Za-z0-9]{8,}|eyJhbGci|@gmail\.com)', p + hp + (s.get('founder_checklist') or '')):
            err(f'{path} {sid}: looks like a secret or real email: {bad}')
        for m in re.findall(r'(?i)\b(claude|opus|sonnet|gpt-?4|anthropic)\b', p + hp):
            if m.lower() == 'claude' : continue  # "Claude Code session" is allowed
            err(f'{path} {sid}: model name in prompt: {m}')
        if re.search(r'(?i)supabase db (push|reset)', p) and not re.search(r'(?i)(never|do not|don.t)[^.\n]{0,40}supabase db (push|reset)', p): err(f'{path} {sid}: mentions supabase db push/reset without forbidding it')
        if re.search(r'(?i)pro recommended', p + (s.get('founder_checklist') or '')): err(f'{path} {sid}: says "Pro recommended" (Supabase is Free)')
        if re.search(r'churchapp\b', p, re.I) and 'com.churchappcld' in p: warn(f'{path} {sid}: mentions the old com.churchappcld placeholder')
    for p in data.get('proposed_additional_steps') or []:
        if not p.get('id') or not p.get('reason'): err(f'{path}: proposed step needs id and reason')
for w in warns: print('WARN', w)
for e in errors: print('ERROR', e)
print(f'{len(errors)} errors, {len(warns)} warnings')
sys.exit(1 if errors else 0)
