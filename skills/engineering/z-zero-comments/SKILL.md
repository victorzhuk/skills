---
name: z-zero-comments
description: Comment discipline — a comment explaining WHAT code does means the name is wrong; rename or restructure instead of commenting. Use when writing new code, reviewing a diff for comment noise, or deciding whether a comment belongs. Triggers on "add a comment explaining", "// creates a new", "// checks if", "// initialize the". Does not cover doc-comment format for exported APIs; write Go doc comments, JSDoc, etc. as your language's convention requires — this skill only governs implementation comments.
---

# Zero comments unless why

Delete a comment that restates what the next line does. Keep only comments that carry information the code itself cannot: why, an invariant, an edge case, or an external contract.

## Core rules

- If a comment explains WHAT code does, the fix is a better name, not a better comment.
- Allowed: why a decision was made, an invariant the reader can't derive from the code, a counterintuitive edge case, a migration hazard, a hazard around removing something.
- Allowed regardless of the rule above: required doc comments for exported symbols and packages, `// Output:` / `// Unordered output:` markers, generated-file markers required by tooling, and comments in `.env.example`/config/migration files that document an operator-facing contract.
- Ask before rewriting an existing comment that isn't yours — it may encode context you don't have.

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

**Good — the name already says it; no comment needed:**

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

- Write a comment and leave the name generic (`doStuff`, `handle`) — fix the name first; the comment is very often no longer needed after that.
- Add a comment above every function restating its signature in prose.
- Comment out dead code "just in case" — delete it; version control remembers.

## Verify

    rg -n '^\s*//' --type go   # scan comments in a diff; each one should explain why, not what
