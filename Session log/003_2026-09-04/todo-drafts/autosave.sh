#!/usr/bin/env bash
# Commit and push any new/changed group JSON every 10 minutes so progress survives a usage-limit cut-off.
cd /home/user/ChurchAppCLD
for i in $(seq 1 36); do
  sleep 600
  if [ -n "$(git status --porcelain -- 'Session log/003_2026-09-04/todo-drafts/groups')" ]; then
    git add "Session log/003_2026-09-04/todo-drafts/groups" && \
    git commit -q -m "chore(session): autosave TODO.md group drafts

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Hj8Zxkm7SvdJWxBEA2ehMY" && git push -q origin claude/project-status-todo-plan-leghlm && echo "$(date -u) pushed"
  fi
done
