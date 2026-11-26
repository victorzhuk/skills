---
name: z-lean-fix
description: "Fix a defect or review finding at its known cause. Preserve unrelated code and report evidence for the requested scope. See [[z-systematic-debugging]] when the cause is unknown."
---

# Fix a known defect

## Locate the cause

1. Identify the requested findings and severities. List any excluded severities in the result.
2. Trace affected callers to the first site that violates the contract. Several callers can share the same defect.
3. Build the branch and inspect dependencies, protocol definitions, and generated files. Distinguish a pre-existing failure from the requested defect.
4. Search the project for an existing encoder, selector, mapper, or helper that handles the same case.

## Choose the smallest complete change

Use [[z-no-over-engineering]] to compare the following options.

| Option | When to use it |
|---|---|
| Delete | The code serves no required behavior. Examples include a dead branch, duplicate function, or index that cannot serve its intended query. |
| Reuse | An existing implementation meets the input and error contract. |
| Edit in place | A guard, missing field, allowlist entry, or limit addresses the cause. |
| Extract a helper | An unexported helper owns a repeated decision or clarifies a current responsibility. |

Select a range query when it serves existing data without a migration. Use a constant when no caller needs a configurable limit.

## Keep the diff in scope

- Preserve unrelated formatting, names, ordering, and fixtures. When splitting a function, keep unchanged code in place when its responsibilities remain clear.
- Consolidate repeated decisions that the change introduces. Add an abstraction, feature flag, option, migration, or backfill only for a current requirement.
- Preserve necessary rationale, contracts, and tooling markers under [[z-zero-comments]].
- Retain lint findings for actual duplication. Give a reason for a suppression on a required literal, such as a wire key.

## Verify and report

Exercise the original failure against the change. Run the approved project commands within their limits. Use [[z-testing-strategy]] for additional tests and [[z-verify-before-done]] for evidence.

For each finding, report the change and its command result. Identify assumptions, remaining limits, and excluded severities. Name any selected TTL, limit, fallback, or feature trade-off so the user can review it. Commit only when the user asks.
