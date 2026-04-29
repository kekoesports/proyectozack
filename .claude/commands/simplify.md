---
description: Post-edit cleanup pass — reviews recent diff through reuse, quality, and efficiency lenses, then fixes what's worth fixing.
allowed-tools: Bash, Read, Glob, Grep, Edit, Write, mcp_Task, mcp_Todowrite
argument-hint: "[optional scope hint, e.g. 'last commit' or a path]"
---

# /simplify

A focused cleanup pass on **recently changed code**. Three reviewers run in parallel against the same diff, then you fix what they find. False positives are skipped — don't argue with reviewers, just discard non-issues silently.

User-supplied scope hint (optional): `$ARGUMENTS`

---

## Phase 1 — Identify changes

Determine the review surface in this order:

1. If `$ARGUMENTS` names a path or commit, scope to that.
2. Otherwise, run `git diff` (unstaged). If empty, run `git diff --staged`. If still empty, run `git diff HEAD~1`.
3. If still empty (clean tree, no recent commits), fall back to the 10 most recently modified files under `src/`:
   ```powershell
   Get-ChildItem -Recurse -Path src -Include *.ts,*.tsx,*.css | Sort-Object LastWriteTime -Descending | Select-Object -First 10 FullName
   ```

Capture:
- The diff text (truncate per-file to ~400 lines if huge — keep both ends).
- The list of changed file paths.

If the diff is empty AND there are no recent files, stop and tell the user there's nothing to review.

Create a sidebar todo list reflecting the 3 review lanes + a fix lane:
- "diff: capture review surface"
- "reviewers: reuse / quality / efficiency"
- "fix: apply findings"

Mark the diff todo completed before launching reviewers.

---

## Phase 2 — Three reviewers in parallel

> ⚠️ **CRITICAL — PARALLEL EXECUTION**
>
> The three Task tool calls below **MUST** be emitted in **ONE single assistant message** (one `<tool_use>` block containing three Task invocations). Sequential calls across multiple messages are **wrong** — they triple latency for no benefit and break the spirit of this command.
>
> ✅ Correct: one message → three Task calls in parallel.
> ❌ Wrong: message 1 → Task A → wait → message 2 → Task B → wait → message 3 → Task C.
>
> If you find yourself writing a sentence like "now I'll launch the next reviewer" between Task calls, you've already failed the parallelism rule. Stop and re-emit all three in a single block.

Each reviewer gets the full diff + changed file list + `AGENTS.md` conventions in its prompt.

**Subagent assignments:**

| Reviewer | `subagent_type` | Why this agent |
|---|---|---|
| 1 — Code Reuse | `explore` | Read-only codebase explorer — fast at searching for prior art across `src/lib/`, hooks, utils, components. |
| 2 — Code Quality | `general` | General-purpose agent for convention/quality enforcement; reads `AGENTS.md`. |
| 3 — Efficiency | `general` | Second `general` instance with a different lens (perf/leaks/boundaries). Two calls are intentional; do not collapse. |

Each reviewer must return:
- A short list of findings: `{ file, line(s), severity: high|med|low, problem, suggested fix }`
- An overall verdict: APPLY ALL / APPLY SELECTED / NOTHING TO FIX

### Reviewer 1 — Code Reuse  *(subagent_type: `explore`)*

> You are reviewing a diff for **reinvention of existing code**. Goal: don't write what already exists.
>
> For each new function, helper, or inline logic block in the diff:
> 1. Search the codebase for prior art. Likely homes: `src/lib/`, `src/lib/utils/`, `src/components/ui/`, `src/types/`, `src/db/queries/`, anything named `*-utils.ts`, `*-helpers.ts`, `format*.ts`, `parse*.ts`.
> 2. Look specifically for: hand-rolled string manipulation that duplicates a util, manual path/URL handling, custom env checks, ad-hoc type guards, re-implemented Zod schemas, re-implemented date/time formatters, manual debounce/throttle, manual scroll/resize handlers when a hook exists.
> 3. Cross-reference against `package.json` deps — sometimes the code re-implements something a dep already provides.
>
> Only report when you've *confirmed* the existing helper exists (cite path + line). No speculation.
>
> Skip CSS files unless they duplicate tokens defined in `src/app/globals.css @theme`.

### Reviewer 2 — Code Quality  *(subagent_type: `general`)*

> You are reviewing a diff for **hacky patterns and avoidable complexity**. Project conventions in `AGENTS.md` are authoritative — flag violations.
>
> Look for, in priority order:
> - **Redundant state** — `useState` mirroring a prop, derived values stored instead of computed, observers/listeners that could be a direct call, dual sources of truth.
> - **Parameter sprawl** — functions accumulating positional/optional params instead of being restructured (object param, separate functions, or pulled-up state).
> - **Copy-paste with variation** — near-duplicate JSX/logic blocks that should share a component or helper.
> - **Leaky abstractions** — exposing internals across module boundaries, query functions returning DB rows where a domain type is expected.
> - **Stringly-typed code** — raw string literals where an enum, const, or existing union type lives. Especially `'admin'`/`'brand'` roles, route paths, table names.
> - **Unnecessary JSX nesting** — wrapper `div`s adding no semantic, layout, or styling value.
> - **Unnecessary comments** — narration of *what* the code does, refs to the task/PR/caller, restating the obvious. Keep only non-obvious *why* and load-bearing gotchas.
> - **AGENTS.md violations**: `interface` instead of `type`, missing `readonly` on props, missing explicit return types on exports, `null` returned from queries instead of `?? undefined`, `parse` instead of `safeParse`, default exports outside pages/layouts, missing `import type` for type-only imports.
>
> Report concrete fixes, not vibes.

### Reviewer 3 — Efficiency  *(subagent_type: `general`)*

> You are reviewing a diff for **unnecessary work, leaks, and hot-path bloat**.
>
> Look for:
> - **Unnecessary work** — redundant computation inside render/loops, repeated reads of the same value, N+1 query patterns (loop + per-iteration await).
> - **Missed concurrency** — sequential independent awaits that should be `Promise.all`.
> - **Hot-path bloat** — new blocking work in `layout.tsx`, root client components, per-render paths, or RAF callbacks. Includes large blurs, heavy filters, complex `useMemo` deps.
> - **Recurring no-op updates** — `setState` / motion-value sets in intervals or RAF without change-detection guards.
> - **TOCTOU patterns** — `if (exists) doIt()` instead of doing it and handling the error.
> - **Listener / subscription leaks** — `addEventListener`, `setInterval`, `setTimeout`, `requestAnimationFrame`, `IntersectionObserver`, motion `useMotionValueEvent`, Lenis instances — every one needs a cleanup. Check `useEffect` returns.
> - **Overly broad ops** — `select *` style queries when a slice suffices, reading entire files when a stream/range works, hydrating fields the UI doesn't render.
> - **Server vs client boundary** — client component doing work that should be server (data fetch, heavy computation), or server component pulling in client-only deps.
>
> Each finding needs the concrete cost (re-renders, ms, bundle KB) when knowable.

---

## Phase 3 — Aggregate and fix

1. Collect findings from all three reviewers.
2. **Deduplicate** — the same issue often surfaces from multiple lenses (e.g. a redundant state observer is both quality and efficiency). Pick the strongest framing.
3. **Triage** — drop low-severity nitpicks, anything subjective, anything outside the diff scope. If a finding feels like a false positive, skip it. Don't argue, don't justify, just don't apply it.
4. **Apply fixes directly**. Do not delegate the fix phase — you are the one with the most context now.
5. After each non-trivial batch of edits, run `npx tsc --noEmit`. After all edits, also run `npm run lint`. Only report the final state.
6. If a reviewer flagged something that requires a discussion (e.g. "this whole subsystem should be rewritten") rather than a mechanical fix, list it under **Deferred** at the end — don't try to fix it.

### Final summary format

```
## /simplify results

Reviewed: <N files / <commit-or-diff scope>>

### Applied
- file:line — what changed and why (one line each)
...

### Skipped (false positives or out of scope)
- short reason if non-obvious; otherwise omit

### Deferred (worth discussing, not mechanically fixable)
- if any

### Verification
- typecheck: pass | <errors>
- lint: pass | <errors>
```

Keep it dense. No preamble, no celebration.
