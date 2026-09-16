# Session 004 — 2026-09-04 (branch `claude/project-status-todo-plan-leghlm`)

## Shipped
- `508b52f` chore(session): session 004 prompt history
- (this commit) chore(todo): group G4 (steps 1.6a/1.6b/1.7a/1.7b) drafted, critiqued and revised; critic findings saved
  under `todo-drafts/reviews/G4.*.json`; this session log.

## What happened
- Task from the founder's harness prompt: run `workflow-groups.js` with `{"groups": ["G4"]}` only. Another session was
  drafting other groups on the same branch, so nothing outside `groups/G4.json`, `reviews/G4.*.json` and this folder
  was touched. HANDOFF.md, docs/TODO.md, the kit files and `workflow-global.js` were left alone as instructed.
- Workflow run `wf_b84d40db-2d1`: 1 drafter (effort high) → 3 critics (fidelity 13 findings, executability 13,
  completeness 10; 0 blockers, 11 major, 25 minor) → 1 reviser (applied 36, rejected 3 with reasons). 5 agents,
  137 tool uses, 40 min wall clock, **1,008,532 sub-agent tokens**.
- `python3 validate.py groups/G4.json` → `0 errors, 0 warnings`.

## Directional decisions (made by the workflow agents under orchestrator decision 13 — the orchestrator must confirm at assembly)
- **Step 1.6 split into 1.6a + 1.6b.** After the critics' additions the single prompt reached ~4.5k words. 1.6a =
  permissions, enums, audiences, media links, limits, dates, fixture (3161 words, 21 files). 1.6b = Zod schemas,
  `errors.ts`, `urls.ts` (2810 words). 1.6a depends on **1.4** (not 1.3b): its tests parse the storage bucket rows and
  share `packages/domain/fixtures/persons.json` with SQL test `05_audiences.sql`.
- **Step 1.7 split into 1.7a + 1.7b.** 1.7a = `@church/db` (2843 words), 1.7b = `@church/supabase-client` (1437 words).
- **Assembler must rewrite other groups' `depends_on`:** every `1.6` → `1.6b`, every `1.7` → `1.7b` (G5 2.1, G8 3.3,
  G11 4.1 at least).
- **Deliberate deviation in 1.7b:** `createMobileClient` takes adapters (`SecureStoreAdapter`, `KvStoreAdapter`,
  `RandomBytes`) instead of importing `expo-secure-store` / `expo-crypto` / `expo-sqlite`, because native versions may
  only come from `npx expo install` inside `apps/mobile`; step 4.1 wires the real modules. Subpath exports `./web` and
  `./mobile` keep `@supabase/ssr` out of Metro and `aes-js` out of Next.
- **Cross-group asks recorded in `G4.json` open_issues (13 items)**, notably: G3 1.4 should create the persons fixture
  with the shape in 1.6a Build 8; G3 1.5 must pin `npx supabase@2.116.0` and copy the DESIGN §5 permission-mapping
  tooltip sentences into docs/RLS.md verbatim; G2 1.3b's `srv_resolve_share_link` returns bare `{status}` for the
  password states (1.6b models `link_id`/`sermon_title`/`org_name` as optional there); query modules
  `calendars-events.ts`, `documents.ts`, `audit.ts` are deferred from 1.7a to G12/G13/G14; schema key naming
  (`createUserDirectSchema` snake_case, RPC wrappers use SQL parameter names) that G5/G7 must reuse.

## Open questions / next step
- G3, G5–G14 still to draft (other session). When every group validates, run `workflow-global.js` (assemble → global
  lenses → fixers), then hand-check `docs/TODO.md`, update HANDOFF.md, and wait for the founder before merging to main.
- The orchestrator should accept or reject the two splits and the 1.6a → 1.4 dependency change before assembly.
- Original (pre-revision) draft is only in the ephemeral scratchpad (`G4.orig.json`); the committed file is the revised one.

## Container facts
- 4 CPUs → at most 2 concurrent agents per workflow; the G4 pipeline (draft → 3 critics → revise) took 40 minutes.
