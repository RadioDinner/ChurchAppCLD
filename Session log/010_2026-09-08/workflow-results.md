# Session 010 — workflow runs (sub-agent bites)

## Bite 7 — global review, lenses coverage + consistency, round 1 — launched 2026-09-08 America/New_York (founder: "start working on bite 7")
- Pre-flight: `validate.py groups/G*.json` → 0 errors, 7 warnings (long prompts 1.2, 1.3a, 1.3b, 1.4a, 1.5, 2.3, 5.6a — accepted per
  decisions 26/30; two more than session 009 because G2's revision lengthened 1.3a/1.3b). `assemble.py` → 77 steps, 312,461 words,
  written to `docs/TODO.md` locally for the reviewers (NOT committed — founder has not asked for a preview in git).
- args: {"stage": "review", "lenses": ["coverage", "consistency"], "round": 1}
- Findings will be saved by the agents to `todo-drafts/reviews/global.coverage.r1.json` and `global.consistency.r1.json`.
- Note: this session's clone started stale (at `ec5f2c6`); a redundant G7 draft was made before fetching and was discarded unpushed.
