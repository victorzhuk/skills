---
name: z-lean-fix
description: Smallest-diff fixes for review findings and bugs. Use for "fix crit and majors". See [[z-no-over-engineering]].
---

# Lean fixes

The fix is the whole deliverable. Reviewers read the diff, not your intent. A good fix is one they approve without asking a question.

## Before editing

- **Scope = the findings asked for.** "Crit and majors" means minors and nits stay untouched, even the easy ones. List them as left alone.
- **Find the root site.** Several findings often share one cause, such as three callers funnelling through one helper. Fix that site once. Don't patch every symptom.
- **Check the ground.** Make sure the branch builds and the dependencies (vendor, proto, generated code) match what the change expects. A fix on a broken base proves nothing.
- **Look for what already exists.** Before writing a filter, mapper, or helper, grep for one. A local helper that already does it wins over a new one.

## Choosing the fix

Pick in this order and stop at the first one that works:

1. **Delete.** When the defective thing adds no value, remove it. Examples: an index that can't serve the query, a copy of a function, a dead branch.
2. **Reuse.** Call the existing helper, the sibling code path, or the pattern the target branch already uses. Examples: copy fields into the existing request type and call the existing encoder; call the selector the other endpoints call.
3. **Inline edit.** Change the lines where the bug lives. A guard, a missing field, one more entry in an allowlist, a limit stage.
4. **Local extract.** Pull out an unexported helper only when the fix would otherwise duplicate the same logic twice *today*.

Prefer the mechanism that needs no new infrastructure. A plain range match that works on current data beats a geo index that needs a data migration. A constant cap beats a config knob that no one has asked to tune.

## Keep the diff reviewable

- Don't reformat, rename, or reorder code the fix doesn't touch.
- When you split a function, arrange it so the unchanged body keeps its place. Put the new signature above it and the remainder below. Then the diff shows a header move, not hundreds of rewritten lines, and new-code linters stay quiet.
- Collapse repeated literals that the fix introduced, such as a shared projection or a single `nearby` sub-document. Don't hunt for pre-existing ones.
- Comments only where the choice is non-obvious (WHY, invariant, assumption). One line.

## Decisions you made, not facts

Any number or policy you picked is a decision the user owns: a limit, a TTL, a fallback, a dropped feature. Name each one in the report so it can be overridden. Never present it as a requirement.

## Do not

- Add an interface, option struct, config knob, or feature flag to carry a fix.
- Write a migration, backfill, or new infra when removing or rescoping the defective part solves it.
- "While I'm here" cleanups outside the requested severities.
- Rewrite test fixtures beyond what the fix breaks.
- Silence a linter on real duplication. `nolint` is only for literal-by-nature code (field names, wire keys), and it carries a reason.

## Prove it

Per [[z-verify-before-done]], with the project wrappers and resource limits:

- It builds, and the unit tests of the touched packages pass.
- Add one focused test for each behavioral fix that had no coverage: the smallest one that fails without the fix.
- Run the integration tests for touched data paths when they exist.
- Lint only new code (`--new-from-rev=<target branch>`).

## Report

Terse. For each finding: one line saying what changed. Then:

- **Decisions:** the numbers and policies you picked.
- **Assumptions and limits:** what the fix relies on, and what it still doesn't handle.
- **Untouched:** the severities out of scope.
- **Proof:** command → result.

Nothing is committed unless the user asks.
