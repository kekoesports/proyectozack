---
summary: "Resume the current SocialPro task without replaying historical instructions or effects."
read_when:
  - Starting a new work session
  - Resuming after a break
  - Picking up from handoff notes
---

# /pickup

Resume with a short, evidence-led orientation; do not reopen the whole audit.

1. **Instructions:** read the applicable root/project `AGENTS.md` and this checkout's `CLAUDE.md`; honor the latest explicit user decision. They should agree on scope, published-design preservation and approval rules; surface any material conflict rather than choosing broader authority.
2. **Checkout:** inspect `git status -sb`, `git branch --show-current` and `git log -1 --oneline`. Preserve all unrelated work; do not reset, switch or merge merely to resume.
3. **Continuity:** read the latest dated task handoff/evidence available. `docs/handoff.md` describes 2026-08-21 history, not today's worker/schedule state. Do not replay its PR, seed or activation steps. Historical roadmaps and archived prototypes are not active work orders.
4. **Permissions:** keep approvals already given for the same scope; do not ask again after a restart. New effects/destinations/disclosures and tool-level permission requirements still apply. Refresh technical preconditions before resuming an interrupted mutation; uncertain delivery is not permission to retry.
5. **Current priorities:** preserve the published design and finish the approved internal CRM ↔ n8n ↔ SocialPro Discord circuit using `docs/stabilization-2026-09-05/workflow-reactivation-gates.md`. That document separates historical observations, current authorization and technical gates. Do not resume financial/customer/influencer effects or historical backlog.
6. **Local verification only when needed:** inspect `package.json` first. `npm run dev` starts Next; `npm run build` does not migrate but can read configured data. Use isolated approved configuration, a loopback-only listener and an unoccupied port. Never serve the repository with `python -m http.server`, expose `.env`/private files or start a server just to satisfy this checklist. Do not execute migration, seed, sync, hooks or worker commands as a pickup probe.
7. **Continue:** state the next 2–3 in-scope actions and execute the safe independent work. Preserve correlation IDs/checkpoints from interrupted actions; do not generate a new identity to evade idempotency or force a successful result.

Output: concise progress and concrete blockers. Keep IMPLEMENTED / TESTED / ACTIVE / FUNCTIONING separate; a local check or health status is not end-to-end completion. No new approval round for actions already approved, and no invented runtime status.
