---
name: z-zero-comments
description: "Review comments that repeat the code. Preserve rationale, invariants, edge cases, public contracts, and required markers. Use [[z-clean-output]] for irrelevant attribution."
---

# Zero comments unless why

Delete a comment that restates what the next line does. Keep only comments that carry information the code itself cannot: why, an invariant, an edge case, or an external contract.

## Core rules

- Replace a comment that repeats an operation with a clearer name or structure when the contract permits it.
- Keep the reason for a decision, a hidden invariant, a counterintuitive edge case, or a migration hazard.
- Preserve required public documentation, example-output markers, generated-file markers, and operator-facing contracts in configuration or migrations.
- Ask about an existing comment only when its purpose requires a new decision.

## Examples

**Bad — restates the code:**

```go
// Create a new user
user := NewUser(name)

// Check if user exists
if repo.Exists(id) {

// Get user by ID from database
func GetUserByID(id string) (*User, error)
```

**After removing redundant comments**

```go
user := NewUser(name)

if repo.Exists(id) {

func GetUserByID(id string) (*User, error)
```

**Good — earns its place:**

```go
// Required by legacy API; remove after v2 migration
resp.Header.Set("X-Legacy-Token", token)

// Zero means unlimited per vendor contract
if limit == 0 {
```

## Do not

- Use a comment to compensate for an unclear name. Rename the symbol when the contract permits it.
- Add a comment above every function restating its signature in prose.
- Keep dead code in comments for a hypothetical future use.

## Verify

Review comment changes in both staged and unstaged diffs. Inspect new files separately. Preserve required markers and public contracts.
