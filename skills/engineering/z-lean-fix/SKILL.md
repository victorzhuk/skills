---
name: z-lean-fix
description: Smallest-diff fixes for review findings and bugs. Use for "fix crit and majors". See [[z-no-over-engineering]].
---

# Lean fixes

Fix the requested defect completely. Keep the diff focused and understandable without the conversation history.

## Before editing

- **Scope = the findings asked for.** "Crit and majors" means minors and nits stay untouched, even the easy ones. List them as left alone.
- **Find the root site.** Several findings often share one cause, such as three callers funnelling through one helper. Fix that site once. Don't patch every symptom.
- **Check the ground.** Make sure the branch builds and the dependencies (vendor, proto, generated code) match what the change expects. A fix on a broken base proves nothing.
- **Look for what already exists.** Before writing a filter, mapper, or helper, grep for one. A local helper that already does it wins over a new one.

## Choosing the fix

Apply [[z-no-over-engineering]] to choose the smallest complete fix:

1. **Delete.** When the defective thing adds no value, remove it. Examples: an index that can't serve the query, a copy of a function, a dead branch.
2. **Reuse.** Call the existing helper, the sibling code path, or the pattern the target branch already uses. Examples: copy fields into the existing request type and call the existing encoder; call the selector the other endpoints call.
3. **Inline edit.** Change the lines where the bug lives. A guard, a missing field, one more entry in an allowlist, a limit stage.
4. **Local extract.** Use an unexported helper when it clarifies a current responsibility or owns a repeated decision.

Prefer the mechanism that needs no new infrastructure. A plain range match that works on current data beats a geo index that needs a data migration. A constant cap beats a config knob that no one has asked to tune.

## Keep the diff reviewable

- Don't reformat, rename, or reorder code the fix doesn't touch.
- Preserve the position of unchanged code when splitting a function, unless the resulting layout obscures its responsibilities.
- Consolidate repeated decisions introduced by the fix. Leave unrelated literals and pre-existing cleanup outside the scope.
- Apply [[z-zero-comments]] to comment edits. Preserve necessary rationale, contracts, and tooling markers.

## Decisions you made, not facts

Any number or policy you picked is a decision the user owns: a limit, a TTL, a fallback, a dropped feature. Name each one in the report so it can be overridden. Never present it as a requirement.

## Do not

- Add an interface, option struct, config knob, or feature flag without a current requirement.
- Write a migration, backfill, or new infra when removing or rescoping the defective part solves it.
- "While I'm here" cleanups outside the requested severities.
- Rewrite test fixtures beyond what the fix breaks.
- Silence a linter on real duplication. `nolint` is only for literal-by-nature code (field names, wire keys), and it carries a reason.

## Prove it

Per [[z-verify-before-done]], with the project wrappers and resource limits:

- Use the approved commands and scope from [[z-testing-strategy]] and [[z-verify-before-done]]. Preserve existing required checks. Add a lower-layer test only for a named residual risk E2E cannot prove; prove it fails without the fix and passes with it. Runner-specific lint flags belong to the language tooling skill.

## Report

Terse. For each finding: one line saying what changed. Then:

- **Decisions:** the numbers and policies you picked.
- **Assumptions and limits:** what the fix relies on, and what it still doesn't handle.
- **Untouched:** the severities out of scope.
- **Proof:** command → result.

Nothing is committed unless the user asks.
