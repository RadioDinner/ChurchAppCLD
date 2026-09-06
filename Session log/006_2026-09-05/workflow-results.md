# Workflow results received this session (running record — update after every run)

Task: groups G8 → G14 of docs/TODO.md, one group at a time, full pipeline per group (draft → 3 critics → revise) via
`Session log/003_2026-09-04/todo-drafts/workflow-groups.js`. Skeleton step ids per group: G8 3.3, 3.4 · G9 3.5, 3.6 ·
G10 3.7, 3.8, 3.9, 3.10 · G11 4.1–4.5 · G12 5.1–5.3 · G13 5.4–5.7 · G14 6.1–6.4 (+ adopted 6.5).

## Run 1 — G8 — wf_01c992d6-508 (task wjbw7w78f), launched 2026-09-05 12:27 America/New_York (16:27 UTC)
- args: {"groups": ["G8"]} (no group file existed → full draft).
- Outcome: (pending)
- 13:00 ET: drafter done — 3.3 split into 3.3a (list/link/edit/player/delete, 2722 words) + 3.3b (tus resumable upload,
  50 MB cap, 2485 words); 3.4 share links. Critics running.
- Outcome: stopped by usage limit — "You've hit your limit · resets 6:30pm (UTC)". Completed: draft:G8 (3.3a 2722 words,
  3.3b 2485, 3.4 3043; validator 0 errors, 0 warnings; 11 open_issues; proposed 3.11). Failed on the limit (4):
  crit:G8:fidelity, crit:G8:executability, crit:G8:completeness, revise:G8. No review files written.
- Usage: agent_count 5, agents_done 1, agents_error 4, **subagent_tokens 314,081**, tool_uses 43, duration 943,226 ms (~16 min).
- The draft was committed by the 10-minute autosave (1f0bcec). The session was suspended and woke at 18:32 UTC, after the
  18:30 UTC reset (founder confirmed "it has reset now"), so no send_later was scheduled: resumed immediately with
  resumeFromRunId wf_01c992d6-508 and identical args {"groups": ["G8"]} (identical args so the cached drafter result
  replays — session 005 lesson).

## Run 2 — G8 resume of wf_01c992d6-508 (task w9f342act), launched 2026-09-05 14:33 America/New_York (18:33 UTC)
- args: {"groups": ["G8"]} (identical to run 1; resumeFromRunId wf_01c992d6-508 — the drafter replays from cache, the three
  critics and the reviser run).
- Outcome: (pending)
- Outcome: completed, 0 failures. G8: 54 findings (2 blockers — both the CSP `media-src` conflict with G5's 2.1a), 52 applied,
  5 rejected with reasons; validator 0 errors, 0 warnings. Reviser split 3.4 into 3.4a (crypto, panel, actions) + 3.4b
  (public /s/[token], unlock route, headers, /embed/yt/[id]). Final steps: 3.3a (3373 words, depends_on 3.1, 1.6b, 1.7a),
  3.3b (3136), 3.4a (2379), 3.4b (3400). 10 open_issues, proposed step 3.11 (STUB; G5 also proposes a 3.11 → renumber).
  Full result saved in `todo-drafts/reviews/G8.result.json`.
- Usage: agent_count 5, agents_done 5, agents_error 0, **subagent_tokens 910,814**, tool_uses 127, duration 2,005,756 ms (~33 min).
- **G8 total sub-agent tokens: 314,081 + 910,814 = 1,224,895.**

## Run 3 — G9 — wf_d7df784f-664 (task wkz1ehl0a), launched 2026-09-05 15:16 America/New_York (19:16 UTC)
- args: {"groups": ["G9"]} (no group file existed → full draft; steps 3.5, 3.6).
- Outcome: (pending)
- 15:22 ET: drafter done (see step table in the outcome line); critics running.
- Outcome: completed, 0 failures. G9: 44 findings (2 blockers — `useFcmV1` is not an expo-server-sdk 7.2.0 option; bulletin
  Push column vs the `notifications` select policy), 38 applied, 2 partially rejected with reasons; validator 0 errors,
  0 warnings. Drafter split 3.5 into 3.5a (announcements) + 3.5b (bulletins, reuses the 3.3b uploader); reviser split 3.6
  into 3.6a (dispatcher) + 3.6b (cron tick + docs). 9 open_issues (assembler repointing 3.6 → 3.6b, M3 migration
  numbering vs reserved 9998/9997), proposed step 3.12. Full result in `todo-drafts/reviews/G9.result.json`.
- Usage: agent_count 5, agents_done 5, agents_error 0, **subagent_tokens 1,097,561**, tool_uses 150, duration 2,508,092 ms (~42 min).
- **G9 total sub-agent tokens: 1,097,561.**

## Run 4 — G10 — wf_c2d38310-89e (task w3ti3ti32), launched 2026-09-05 16:00 America/New_York (20:00 UTC)
- args: {"groups": ["G10"]} (no group file existed → full draft; steps 3.7, 3.8, 3.9 founder, 3.10 template).
- Outcome: (pending)
- Outcome: stopped by usage limit — "You've hit your limit · resets 11:30pm (UTC)" after ~3.5 min; draft:G10 failed before
  writing any file (no groups/G10.json, no reviews). Usage: agent_count 1, agents_done 0, agents_error 1,
  **subagent_tokens 147,910**, tool_uses 15, duration 207,910 ms.
- Session suspended; woke 2026-09-05 20:14 ET (00:14 UTC, 44 min after the reset) → no send_later; resumed immediately.

## Run 5 — G10 resume of wf_c2d38310-89e (task see below), launched 2026-09-05 20:15 America/New_York (00:15 UTC 09-06)
- args: {"groups": ["G10"]} (identical; resumeFromRunId wf_c2d38310-89e — nothing cached, full pipeline runs).
- Outcome: (pending)
- 20:29 ET (task wv5jzw3qi): drafter done; critics running.
