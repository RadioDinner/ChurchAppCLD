export const meta = {
  name: 'todo-md-global',
  description: 'Assemble docs/TODO.md, run global reviewers (coverage, consistency, dependencies, founder experience), fix per group, loop until no blockers',
  phases: [
    { title: 'Assemble', detail: 'validate.py + assemble.py' },
    { title: 'Global review', detail: 'four lenses over the whole list' },
    { title: 'Fix', detail: 'one fixer per affected group' },
  ],
}

const REPO = '/home/user/ChurchAppCLD'
const KIT = `${REPO}/Session log/003_2026-09-04/todo-drafts`
const Q = (p) => `"${p}"`
const MAX_ROUNDS = (args && args.rounds) || 2
const STAGE = (args && args.stage) || 'all'          // 'all' | 'review' (lenses only, findings saved to reviews/global.<lens>.json) | 'fix' (fixers read the saved findings)
const ONLY_LENSES = (args && args.lenses) || []        // review: subset of coverage, consistency, dependencies, founder
const ONLY_GROUPS = (args && args.groups) || []        // fix: only these groups' fixers run
const ROUND_TAG = (args && args.round) || 1            // fix/review: label for saved files (findings of round N are reviews/global.<lens>.rN.json)

const COMMON = `Repository: ${REPO}. Drafting kit: ${Q(KIT)} (path contains a space — always quote it).
Read first: ${Q(KIT + '/skeleton.md')} (brief, standing orders, founder decisions, prompt rules, fixed step list), ${Q(KIT + '/orchestrator-decisions.md')} (cross-group decisions that override the skeleton). The per-group sources are ${Q(KIT + '/groups/')}G1.json … G14.json; the assembled document is ${REPO}/docs/TODO.md. The plan is ${REPO}/docs/PLAN.md and ${REPO}/docs/DESIGN.md; live state is ${REPO}/HANDOFF.md.
Exact names must come from PLAN/DESIGN. Never write a real email address, key, token or model name into any prompt. Validator: python3 ${Q(KIT + '/validate.py')} <files> must print "0 errors".`

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: { type: 'string', description: 'step id such as 3.4, or NEW for a proposed new step' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          category: { type: 'string' },
          quote: { type: 'string' },
          problem: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['step', 'severity', 'category', 'quote', 'problem', 'fix'],
      },
    },
  },
  required: ['findings'],
}
const FIX_SUMMARY = {
  type: 'object',
  properties: {
    group: { type: 'string' },
    applied: { type: 'integer' },
    added_steps: { type: 'array', items: { type: 'string' } },
    rejected: { type: 'array', items: { type: 'object', properties: { finding: { type: 'string' }, reason: { type: 'string' } }, required: ['finding', 'reason'] } },
    validator_errors: { type: 'integer' },
  },
  required: ['group', 'applied', 'added_steps', 'rejected', 'validator_errors'],
}

const GLOBAL_LENSES = [
  { key: 'coverage', prompt: `LENS: COVERAGE OF THE WHOLE PLAN. Build a checklist from docs/PLAN.md §4 (every table, RPC, helper, view), §6–§9 (every route, screen, storage flow, server concern), §10 (every Phase 1 step and its "never cut" items), §11 (every Phase 2/3 item), §12 (every verification item) and docs/DESIGN.md §11 (every acceptance criterion) and §12. For each entry find the TODO step whose prompt/done_when covers it (grep the group files). Report every entry that no step covers, or that is covered only vaguely, as a finding assigned to the step that should own it (or step "NEW" with a proposed id). Also report any step whose prompt covers something the plan assigns to a DIFFERENT step (duplication) and any two steps that would both create the same file.` },
  { key: 'consistency', prompt: `LENS: CROSS-STEP CONSISTENCY. Across ALL group files, check that the same thing is called the same name everywhere: package names (web, mobile, @church/*), file paths (src/lib/..., app/(org)/o/[orgSlug]/...), RPC and helper names, env var names (compare with PLAN §7 list and the docs/ENV.md requirements in 1.1), bucket names, route paths, the Vercel layout (orchestrator decision 1), the package id/scheme (decision 5), upload caps (decision 4), the 3.5/3.6 ordering (decision 7), the head-of-house rule (decision 6), commit message prefixes, and the opening/Finish boilerplate. Use grep -o over the group files to list every distinct spelling of each identifier family. Report every divergence with both spellings, which is right per PLAN/DESIGN/decisions, and which steps must change.` },
  { key: 'dependencies', prompt: `LENS: DEPENDENCIES, ORDER AND HAND-OFFS. For every step: does its "Inputs / prior state" section list only things that an EARLIER step's prompt actually creates (same paths/names)? Does depends_on match those inputs? Is anything needed by a step created only by a LATER step (ordering bug)? Are the founder steps (0.1, 2.4, 2.5, 3.9, 4.5, 6.4, 6.5) placed so that no agent step before them needs a hosted service or secret? Do the three checkpoints (A at 2.5, B at 3.9, C at 4.5) genuinely deliver what the founder asked ("a finished web app that I can trial with a Vercel deployment as the super admin" at B)? Does every agent step's Finish block tick its own checkbox and update HANDOFF? Does the assembler report any unknown dependency? Report each problem as a finding with the exact fix.` },
  { key: 'founder', prompt: `LENS: THE FOUNDER'S EXPERIENCE. The founder is a non-developer who will paste each agent prompt into a fresh Claude Code session and follow founder checklists by hand. Read every founder step and every step's goal/done_when/notes. Are click-paths complete and current for Supabase, Vercel, Stripe, Expo/EAS, Firebase and Google Play (use WebSearch/WebFetch to confirm menu names where unsure)? Does each founder step say exactly what to record where (HANDOFF ledger, env vars, password manager) and what "done" looks like? Are costs and irreversible actions (package id, first paste of 9999_init.sql, Stripe live mode) called out before they happen? Is the Supabase Free-plan behaviour (50 MB cap, pause after 7 idle days, restore from dashboard) explained where it bites? Would the founder know what to do when an agent reports a deviation or a step fails (2.6, 3.10)? Is the "How to use this list" section of docs/TODO.md sufficient? Report gaps as findings with concrete fixes.` },
]

const ASSEMBLE = `Run: cd ${Q(KIT)} && python3 validate.py groups/G*.json && python3 assemble.py ${Q(REPO + '/docs/TODO.md')} — report the validator output and the assembler's step count and warnings (duplicate ids, unknown dependencies). If the validator fails, fix the JSON problem minimally (do not rewrite prompts) and re-run. Then run python3 - <<'EOF'
import json,glob,re
ids=[]
for p in sorted(glob.glob(${JSON.stringify(KIT + '/groups/G*.json')})):
    for s in json.load(open(p))['steps']: ids.append((s['id'],s['actor'],len((s.get('prompt') or '').split()),len(s.get('done_when') or [])))
print(len(ids),'steps'); print(ids)
EOF
and include that output.`

const FIXER_WORKSHEET = `STANDING FIXER WORK (orchestrator decisions 20–24 and 30, and the G2 reviser's propagation list in ${Q(KIT + '/groups/G2.json')} open_issues) applies to your group even if no global finding names it: decision 20 (super-admin pass-through — G5 2.1a/2.1b/2.2b, G6 2.5, G10 3.7b), decision 21 (schema corrections now live in 9999 via G2 1.2/1.3a/1.3b — G3 1.4a–1.5 grants/tests/shim, G4 1.6/1.7 errors and RPC wrappers, G8 3.4b srv_load_unlocked_share_link, G9 3.5b/3.6a per-org claiming, G12 5.1a/5.2b/5.3 set_head_of_house and calendar_submissions_closed, G13 5.5 system groups, G14 6.3a case A; 3.10/3.5b "next free number below the reserved block"), decision 23 (5.7b/5.7c Playwright wording), decision 24 (2.6/3.9/3.10 call scripts/web/smoke-hosted.sh; 2.4 optional dry-run item; 6.3b monitoring row; 5.7a/5.7c 'proposed 5.9' → step 5.8; 6.7 'every file the ledger does not list'; 6.5 flips PLAY_LISTING.live), decision 30 (G2: trim repetition; split 1.2 only if still > ~4500 words). Read the relevant decision text before editing; apply what touches your group's steps; list what you applied in the summary.`

const groupOf = (id) => {
  const m = String(id).match(/^(\d+)\.(\d+)/)
  if (!m) return null
  const a = +m[1], b = +m[2]
  if (a === 0 || (a === 1 && b === 1)) return 'G1'
  if (a === 1) return b <= 3 ? 'G2' : b <= 5 ? 'G3' : 'G4'
  if (a === 2) return b <= 2 ? 'G5' : 'G6'
  if (a === 3) return b <= 2 ? 'G7' : b <= 4 ? 'G8' : b <= 6 ? 'G9' : 'G10'
  if (a === 4) return 'G11'
  if (a === 5) return b <= 3 ? 'G12' : 'G13'
  if (a === 6) return 'G14'
  return null
}

let round = 0
let blockers = 1
let majors = 1
let last = null
while (round < MAX_ROUNDS && (blockers > 0 || (round === 0) || majors > 3)) {
  round++
  if (STAGE === 'fix') {
    // Bite mode: fixers only. Each fixer reads the findings a previous 'review' bite saved (no fs access in the script itself).
    if (!ONLY_GROUPS.length) throw new Error('stage "fix" needs args.groups (e.g. ["G2","G3"])')
    const savedFiles = GLOBAL_LENSES.map(l => Q(`${KIT}/reviews/global.${l.key}.r${ROUND_TAG}.json`)).join(', ')
    const RANGES = 'G1 = 0.1, 1.1; G2 = 1.2–1.3x; G3 = 1.4x–1.5; G4 = 1.6x–1.7x; G5 = 2.1x–2.2x; G6 = 2.3–2.7; G7 = 3.1–3.2x; G8 = 3.3x–3.4x; G9 = 3.5x–3.6x; G10 = 3.7x–3.10; G11 = 4.x; G12 = 5.1x–5.3x; G13 = 5.4x–5.9; G14 = 6.x'
    phase('Fix')
    const fixed = await parallel(ONLY_GROUPS.map(g => () =>
      agent(`You are the fixer for group ${g} of docs/TODO.md (file ${Q(KIT + '/groups/' + g + '.json')}), global round ${ROUND_TAG}. ${COMMON}

${FIXER_WORKSHEET}

The global reviewers' findings are saved in these JSON files (each has a "findings" array; a missing file means that lens did not run): ${savedFiles}. Read them all and select every finding whose "step" belongs to your group (${RANGES}); a finding with step "NEW" belongs to the group whose milestone the proposed id falls in. Apply every blocker and major finding and cheap minor ones by editing the JSON in place (valid JSON; do not shorten prompts except to remove repetition; keep the opening line and the six sections). Where a finding asks for a NEW step, add it to this group's "steps" with the next free id in the milestone and full content (prompt >= 1200 words for agent steps), or to proposed_additional_steps if it is genuinely optional — say which. Where a finding asks for a name change that other groups also use, change it here and list the other step ids in your summary's rejected/notes so the orchestrator can propagate. Reject findings that contradict PLAN/DESIGN, founder decisions or orchestrator decisions, with the reason. Write the file back after each step you finish (valid JSON each time). Run the validator on your file until 0 errors. Return the structured summary only.`,
        { label: `fix:${g}:r${ROUND_TAG}`, phase: 'Fix', schema: FIX_SUMMARY, effort: 'high' })
    ))
    return { stage: 'fix', round: ROUND_TAG, groups: ONLY_GROUPS, fixed: fixed.filter(Boolean) }
  }
  phase('Assemble')
  const rep = STAGE === 'review' ? 'assembled by the orchestrator before launch (bite mode)' : await agent(`${COMMON}\n\n${ASSEMBLE}\nReturn the validator summary line, the assembler output line, any warnings verbatim, and the step listing.`,
    { label: `assemble:r${round}`, phase: 'Assemble', effort: 'low' })
  log(`assemble r${round}: ${String(rep).slice(0, 400)}`)

  phase('Global review')
  const lensesNow = GLOBAL_LENSES.filter(l => !ONLY_LENSES.length || ONLY_LENSES.includes(l.key))
  const gl = await parallel(lensesNow.map(l => () =>
    agent(`You are a global reviewer of the assembled docs/TODO.md for ChurchAppCLD (round ${STAGE === 'review' ? ROUND_TAG : round} of ${MAX_ROUNDS}). ${COMMON}
Before returning, save your findings as JSON ({"findings": [...]}) to ${Q(KIT + '/reviews/global.' + l.key + '.r' + (STAGE === 'review' ? ROUND_TAG : round) + '.json')} so they survive an interruption.
Findings must name the step id so the fixer can find the group. Use grep/python over the group files rather than reading everything linearly when that is faster, but read every prompt you judge.

${l.prompt}

Findings only, each with step id, severity (blocker = a following agent would build the wrong thing or be unable to proceed; major = real gap or inconsistency; minor = polish), quote (or MISSING), problem and a directly applicable fix. Complete list, not a sample; do not report things that are already right.`,
      { label: `global:${l.key}:r${round}`, phase: 'Global review', schema: FINDINGS, effort: 'high' })
  ))
  const gfind = gl.flatMap((c, i) => c ? c.findings.map(f => ({ lens: lensesNow[i].key, ...f })) : [])
  blockers = gfind.filter(f => f.severity === 'blocker').length
  majors = gfind.filter(f => f.severity === 'major').length
  log(`global r${round}: ${gfind.length} findings, ${blockers} blockers, ${majors} major`)
  last = { round, findings: gfind.length, blockers, majors, sample: gfind.slice(0, 40).map(f => `${f.severity} ${f.step} [${f.lens}] ${f.problem}`) }
  if (STAGE === 'review') return { stage: 'review', round: ROUND_TAG, lenses: lensesNow.map(l => l.key), findings: gfind.length, blockers, majors, byLens: Object.fromEntries(lensesNow.map((l, i) => [l.key, gl[i] ? gl[i].findings.length : 'FAILED'])), sample: gfind.slice(0, 60).map(f => `${f.severity} ${f.step} [${f.lens}] ${f.problem}`) }
  if (!gfind.length) break

  const byGroup = {}
  for (const f of gfind) {
    let g = groupOf(f.step)
    if (!g) {
      // NEW steps: route by the proposed id inside fix text, else to G10 (web release docs) as proposal
      const m = String(f.fix + ' ' + f.problem).match(/\b(\d\.\d{1,2})\b/)
      g = (m && groupOf(m[1])) || 'G10'
      f.note = 'NEW/unrouted — add as a full new step in this group (keep id ordering) or as proposed_additional_step if optional'
    }
    ;(byGroup[g] = byGroup[g] || []).push(f)
  }

  phase('Fix')
  const fixed = await parallel(Object.entries(byGroup).map(([g, fs]) => () =>
    agent(`You are the fixer for group ${g} of docs/TODO.md (file ${Q(KIT + '/groups/' + g + '.json')}), round ${round}. ${COMMON}

${FIXER_WORKSHEET}

Global reviewers found these problems in your group's steps (JSON):
${JSON.stringify(fs, null, 1)}

Apply every blocker and major finding and cheap minor ones by editing the JSON in place (valid JSON; do not shorten prompts; keep the opening line and the six sections). Where a finding asks for a NEW step, add it to this group's "steps" with the next free id in the milestone (e.g. 3.11) and full content (prompt >= 1200 words for agent steps), or to proposed_additional_steps if it is genuinely optional — say which. Where a finding asks for a name change that other groups also use, change it here and list the other step ids in your summary's rejected/notes so the orchestrator can propagate. Reject findings that contradict PLAN/DESIGN, founder decisions or orchestrator decisions, with the reason. Run the validator on your file until 0 errors. Return the structured summary only.`,
      { label: `fix:${g}:r${round}`, phase: 'Fix', schema: FIX_SUMMARY, effort: 'high' })
  ))
  log(`fix r${round}: ${fixed.filter(Boolean).map(x => `${x.group}:${x.applied}${x.added_steps.length ? '+' + x.added_steps.join('/') : ''}`).join(' ')}`)
}

phase('Assemble')
const finalReport = await agent(`${COMMON}\n\n${ASSEMBLE}\nThen print the "Master checklist" section of ${REPO}/docs/TODO.md (tables only) and the "Appendix" section if present. Return: validator line, assembler line, warnings, step listing, the master checklist tables verbatim, and the appendix verbatim.`,
  { label: 'assemble:final', phase: 'Assemble', effort: 'low' })
return { rounds: round, lastReview: last, finalReport }
