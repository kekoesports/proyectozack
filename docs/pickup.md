---
summary: "Session pickup template. Rehydrate context when starting work."
read_when:
  - Starting a new work session
  - Resuming after a break
  - Picking up from handoff notes
---

# /pickup

Rehydrate context in <60 seconds when starting work.

1. **Read CLAUDE.md** at project root.
2. **Repo state**: `git status -sb`; check for uncommitted work.
3. **Dev server**: start if needed — `python3 -m http.server 8000`.
4. **Last handoff**: check if there are handoff notes from previous session.
5. **Plan next 2-3 actions** as bullets. Execute.

Output: concise bullet summary with any blockers flagged.
