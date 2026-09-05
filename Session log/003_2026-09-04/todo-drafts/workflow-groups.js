export const meta = {
  name: 'todo-md-groups',
  description: 'Draft, critique and revise a subset of docs/TODO.md groups (args.groups) for ChurchAppCLD',
  phases: [
    { title: 'Draft', detail: 'one drafter per group writes groups/G<n>.json' },
    { title: 'Critique', detail: 'three lenses per group (fidelity, executability, completeness)' },
    { title: 'Revise', detail: 'one reviser per group applies findings, re-validates' },
  ],
}

const REPO = '/home/user/ChurchAppCLD'
const KIT = `${REPO}/Session log/003_2026-09-04/todo-drafts`
const Q = (p) => `"${p}"`

const ALL = [
  { g: 'G1', steps: ['0.1 Accounts & access (founder)', '1.1 Monorepo scaffold'], draft: false, reads: 'PLAN §2–§3, §7, §13; DESIGN §2–§3, §8, §13' },
  { g: 'G2', steps: ['1.2 Local Postgres harness + migration skeleton (9999_init.sql sections 0–4)', '1.3 Helper functions, trigger functions, views, RPCs (sections 5–7)'], draft: true, reads: 'PLAN §4, §12; DESIGN §4 (all), §5, §8, §12' },
  { g: 'G3', steps: ['1.4 RLS policies, grants, storage, tests (sections 8–11)', '1.5 Seed, typegen, DB docs'], draft: true, reads: 'PLAN §4–§6, §12; DESIGN §4.4, §6, §7, §11 acceptance, §12' },
  { g: 'G4', steps: ['1.6 @church/domain', '1.7 @church/db + @church/supabase-client'], draft: true, reads: 'PLAN §2, §4 (RPC lists), §6 (parseMediaLink); DESIGN §2, §4, §7, §9–§10' },
  { g: 'G5', steps: ['2.1 Web app shell, auth, guards', '2.2 Super admin UI'], draft: true, reads: 'PLAN §7–§8; DESIGN §2, §5, §8–§9' },
  { g: 'G6', steps: ['2.3 Stripe billing behind env', '2.4 FOUNDER Supabase project + paste 9999_init.sql + Auth settings', '2.5 FOUNDER Vercel project + Checkpoint A', '2.6 Post-deploy triage (reusable)'], draft: true, reads: 'PLAN §7, §12; DESIGN §8, §11 founder action items, §13 risks 4–7; HANDOFF Environment status' },
  { g: 'G7', steps: ['3.1 Org shell, dashboard, settings, billing read-only', '3.2 Users & permissions'], draft: true, reads: 'PLAN §4 (organization_settings, permissions), §8; DESIGN §4, §5 (permission mapping table), §9' },
  { g: 'G8', steps: ['3.3 Sermons (upload/link/edit/player/delete)', '3.4 Share links + /s/[token] + /embed/yt/[id]'], draft: true, reads: 'PLAN §6, §7, §8; DESIGN §7, §8, §9' },
  { g: 'G9', steps: ['3.5 Announcements & bulletins UI', '3.6 Push dispatch + cron'], draft: true, reads: 'PLAN §4 (notifications), §7 (push, cron), §8; DESIGN §4, §8, §9' },
  { g: 'G10', steps: ['3.7 Web QA (Playwright smoke + env-gated E2E)', '3.8 Docs & handoff for the web release', '3.9 FOUNDER Stripe + Checkpoint B', '3.10 Fix/polish round (reusable template)'], draft: true, reads: 'PLAN §12; DESIGN §11 acceptance, §12; HANDOFF' },
  { g: 'G11', steps: ['4.1 Expo scaffold + auth', '4.2 Feed & playback', '4.3 Push & deep links', '4.4 Mobile build docs + CI', '4.5 FOUNDER Expo/EAS/Firebase + Checkpoint C'], draft: true, reads: 'PLAN §3 (mobile pins), §6, §9; DESIGN §3, §7, §10, §13 risk 5' },
  { g: 'G12', steps: ['5.1 Directory admin (web)', '5.2 Mobile directory & household self-service', '5.3 Calendars & events'], draft: true, reads: 'PLAN §4 (directory, calendars), §11; DESIGN §4 (households/persons/views), §5, §6 (directory matrix), §9–§10' },
  { g: 'G13', steps: ['5.4 Documents', '5.5 Custom audience groups', '5.6 Join codes & join requests (9998_join_codes.sql)', '5.7 Phase 2 hardening'], draft: true, reads: 'PLAN §4, §11; DESIGN §4, §6, §9–§10, §13' },
  { g: 'G14', steps: ['6.1 Surveys (9997_surveys_head_of_house.sql + UI)', '6.2 Audit & scheduling UI', '6.3 Account deletion, privacy, monitoring', '6.4 FOUNDER+AGENT iOS', '6.5 FOUNDER+AGENT Google Play Console internal testing (adopted proposal — see G1.json proposed_additional_steps for the draft)'], draft: true, reads: 'PLAN §4 (surveys, audit, account deletion), §11 Phase 3; DESIGN §4, §10, §11 Phase 3, §13' },
]
const wanted = (args && args.groups) || []
const skipDraft = (args && args.skipDraft) || []
const GROUPS = ALL.filter(G => wanted.includes(G.g)).map(G => skipDraft.includes(G.g) ? { ...G, draft: false } : G)
if (!GROUPS.length) throw new Error('args.groups must name at least one group')

const COMMON = `Repository: ${REPO}. Drafting kit: ${Q(KIT)} (path contains a space — always quote it).
Read, in this order, before doing anything else:
1. ${Q(KIT + '/skeleton.md')} — the brief, standing orders, founder decisions, prompt-writing rules, the FIXED step list with dependencies, and the JSON shape.
2. ${Q(KIT + '/orchestrator-decisions.md')} — cross-group decisions that override the skeleton.
3. ${Q(KIT + '/groups/G1.json')} — the finished exemplar (format, depth, tone). Match or exceed its quality.
4. ${REPO}/docs/PLAN.md (the executable summary; §10–§12 are the build order and verification) and the relevant sections of ${REPO}/docs/DESIGN.md (long-form design with SQL sketches and the policy catalogue), plus ${REPO}/HANDOFF.md.
Exact names (tables, enums, RPCs, app.* helpers, views, routes, env vars, buckets, package names, file paths) MUST be copied from PLAN/DESIGN, never invented; if the docs lack a name, choose one, use it consistently, and list it under open_issues.
Never write a real email address, key, token or model name into any prompt. Validator: python3 ${Q(KIT + '/validate.py')} <file> must print "0 errors".`

const DRAFT_SUMMARY = {
  type: 'object',
  properties: {
    group: { type: 'string' },
    file: { type: 'string' },
    steps: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, actor: { type: 'string' }, prompt_words: { type: 'integer' } }, required: ['id', 'title', 'actor', 'prompt_words'] } },
    validator_errors: { type: 'integer' },
    open_issues: { type: 'array', items: { type: 'string' } },
    proposed_additional_steps: { type: 'array', items: { type: 'string' } },
  },
  required: ['group', 'file', 'steps', 'validator_errors', 'open_issues', 'proposed_additional_steps'],
}
const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          category: { type: 'string' },
          quote: { type: 'string', description: 'short verbatim excerpt of the problematic text, or "MISSING"' },
          problem: { type: 'string' },
          fix: { type: 'string', description: 'concrete replacement text or instruction the reviser can apply directly' },
        },
        required: ['step', 'severity', 'category', 'quote', 'problem', 'fix'],
      },
    },
  },
  required: ['findings'],
}
const REVISE_SUMMARY = {
  type: 'object',
  properties: {
    group: { type: 'string' },
    applied: { type: 'integer' },
    rejected: { type: 'array', items: { type: 'object', properties: { finding: { type: 'string' }, reason: { type: 'string' } }, required: ['finding', 'reason'] } },
    validator_errors: { type: 'integer' },
    open_issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['group', 'applied', 'rejected', 'validator_errors', 'open_issues'],
}

const LENSES = [
  { key: 'fidelity', prompt: `LENS: FIDELITY TO THE DOCS AND FOUNDER DECISIONS. For every step in the file, check each table/enum/column/RPC/helper/view/route/env var/bucket/package/file path named in the prompt against docs/PLAN.md and docs/DESIGN.md (grep them). Flag every invented or misspelled name, every version pin that contradicts PLAN §3 / DESIGN §3 (or orchestrator decision 3), every place a founder decision (skeleton "Founder decisions" 1–10, orchestrator decisions 4–8) is missing, contradicted or misquoted, every place the prompt would make the agent violate a standing order (migration re-runnability, descending numbering, security definer + search_path, no elevated keys client-side, expo install only, no db push/reset, no Edge Functions/pg_cron). Also flag any place the prompt says something the design forbids (e.g. select * on persons base table, Blob upload on mobile, expo-av).` },
  { key: 'executability', prompt: `LENS: CAN A FRESH AGENT EXECUTE THIS PROMPT ALONE, END TO END? For every step: is the prompt truly self-contained (does it tell the agent what earlier steps produced, with exact paths)? Are the Build instructions concrete enough (files, behaviours, edge cases, error handling, empty/loading states, RLS/permission checks) that two different agents would produce compatible results? Are the Verify commands real, in the right order, with expected outcomes? Is the step sized for one session (orchestrator decision 13 — propose an a/b split if not)? Does the Finish block match orchestrator decision 12? Are done_when items objectively checkable? Does anything depend on a secret, account or hosted service the agent will not have at that point (local Postgres 16 only until step 2.4)? For founder steps: is the click-path complete, in the right order, with exact field values and what to record where?` },
  { key: 'completeness', prompt: `LENS: COMPLETENESS AGAINST THE PLAN. Compare the group's steps with docs/PLAN.md §10 (the corresponding Phase 1 step), §11 (Phase 2 items), §12 (verification), the acceptance criteria in docs/DESIGN.md §11 and the route/screen maps in PLAN §8–§9 / DESIGN §9–§10. List every feature, page, RPC wiring, test, doc, edge case or acceptance criterion that the plan assigns to this area and the prompts omit or leave vague. Also check the "Never cut" list in PLAN §10 is fully covered where it touches this group, that HANDOFF/feature-table updates are requested, and that the skeleton's own bullet for each step is fully realised (every item in the skeleton bullet appears in the prompt).` },
]

const results = await pipeline(GROUPS,
  async (G) => {
    if (!G.draft) return { group: G.g, file: `${KIT}/groups/${G.g}.json`, steps: [], validator_errors: 0, open_issues: [], proposed_additional_steps: [] }
    return agent(`You are the drafter for group ${G.g} of docs/TODO.md. ${COMMON}

Your group's steps (ids and titles are FIXED by the skeleton; read the skeleton bullets for the full content of each):
${G.steps.map(s => '- ' + s).join('\n')}
Most relevant doc sections for this group: ${G.reads} (read others as needed).

Write ${Q(KIT + '/groups/' + G.g + '.json')} following the JSON shape in the skeleton exactly (all 14 keys per step). For AGENT steps write the complete ready-to-paste prompt (1200–3000 words) with the exact opening lines and the six sections required by orchestrator decision 9, concrete numbered Build instructions with exact file paths and names, Constraints, Verify commands with expected results, and the Finish block. For FOUNDER steps write the numbered click-path checklist (dashboard → menu → field → value, what to record where, "Done when") and a helper_prompt where an agent can verify or record the result; for FOUNDER+AGENT steps write both. Steps that are reusable templates (2.6, 3.10) must still be complete prompts with placeholders for the pasted observations. If a step is too large for one session, split into <id>a/<id>b with full prompts each. Fill done_when (>= 4 objectively checkable items), reads, estimated_session, commit_message, notes (risks, deviations, things the founder should know) and, at group level, proposed_additional_steps and open_issues.

Be exhaustive: every item in the skeleton bullet for each step must appear in the prompt, and every table/RPC/route/env var/file that the plan assigns to that step must be named. Quote the founder decisions that apply. Do not leave anything for "the agent to figure out" that the docs already settle.

PACING RULES (usage limits are tight): (a) read only the PLAN/DESIGN sections listed above and those the skeleton bullets cite — use grep -n '^## ' and sed -n line ranges, never cat DESIGN.md end to end; (b) SAVE AS YOU GO: write the group file to disk as soon as the first step's JSON is complete and rewrite it after every further step (always valid JSON with the steps finished so far), so an interruption loses at most one step; (c) keep tool calls few — compose each prompt in one Write, not many small edits.

Then run the validator on your file and fix every error (warnings are fine but reduce them). Return the structured summary only.`,
      { label: `draft:${G.g}`, phase: 'Draft', schema: DRAFT_SUMMARY, effort: 'high' })
  },
  async (d, G) => {
    if (!d) return null
    const file = `${KIT}/groups/${G.g}.json`
    const crit = await parallel(LENSES.map(l => () =>
      agent(`You are a critic for group ${G.g} of docs/TODO.md (file ${Q(file)}). ${COMMON}

${l.prompt}

Read the group file in full, then only the doc sections you need (grep + sed -n line ranges; never cat DESIGN.md end to end). Before returning, save your findings as JSON to ${Q(KIT + '/reviews/' + G.g + '.' + l.key + '.json')} so they survive an interruption. Produce concrete findings only — each with the step id, severity (blocker = would make the built result wrong or the step unexecutable; major = significant gap or inconsistency; minor = polish), a short verbatim quote of the offending text (or MISSING), the problem, and a fix the reviser can apply directly (replacement text or precise instruction). Do not rewrite the file yourself. Do not pad: if something is right, do not mention it. Aim for the complete list of real problems, not a sample.`,
        { label: `crit:${G.g}:${l.key}`, phase: 'Critique', schema: FINDINGS, effort: 'medium' })
    ))
    const findings = crit.filter(Boolean).flatMap((c, i) => c.findings.map(f => ({ lens: LENSES[i].key, ...f })))
    log(`${G.g}: ${findings.length} findings (${findings.filter(f => f.severity === 'blocker').length} blockers)`)
    return { draft: d, findings }
  },
  async (x, G) => {
    if (!x) return null
    const file = `${KIT}/groups/${G.g}.json`
    const rev = await agent(`You are the reviser for group ${G.g} of docs/TODO.md (file ${Q(file)}). ${COMMON}

Three critics reviewed the file. Their findings (JSON):
${JSON.stringify(x.findings, null, 1)}

Apply every blocker and major finding, and every minor finding that is cheap, by editing the JSON file in place (use a Python script or careful Edit calls; keep valid JSON; do not shorten prompts — add or correct). Where two findings conflict or a finding contradicts docs/PLAN.md, the founder decisions or the orchestrator decisions, reject it and say why. Keep ids, titles and dependencies fixed unless a finding shows a dependency is wrong. If a critic asks for an a/b split, do it with full prompts for both halves. Update notes/open_issues to reflect what changed. Write the file back after each step you finish revising (valid JSON each time) so an interruption loses at most one step. Run the validator until it prints 0 errors. Return the structured summary only.`,
      { label: `revise:${G.g}`, phase: 'Revise', schema: REVISE_SUMMARY, effort: 'high' })
    return { group: G.g, drafted: x.draft.steps, findings: x.findings.length, blockers: x.findings.filter(f => f.severity === 'blocker').length, applied: rev && rev.applied, rejected: rev && rev.rejected, validator_errors: rev && rev.validator_errors, open_issues: rev && rev.open_issues }
  }
)
return results.filter(Boolean)
