# Example Skills Reference

House-style skills to copy from. These match what the `z-go-*` family actually does: plain Markdown, imperative, persona-free, `## Do not` / `## Verify`, `[[links]]`. Copy the shape, not the XML-heavy patterns some older guides show.

## Example 1: a knowledge skill (model-invoked)

The common case — reusable domain knowledge the agent reaches for unprompted.

```markdown
---
name: z-go-errors
description: Idiomatic Go error handling, wrapping, and inspection — the single-handling rule, sentinel vs typed errors, panic discipline. Use when creating, wrapping, or inspecting errors, or auditing log-and-return. Triggers on "errors.Is", "%w", "log and return", "sentinel error". Does not cover structured logging setup; see [[z-go-observability]].
---

# Go error handling

Handle an error exactly once: wrap with context and return, or log and stop — never both.

## Core rules

- Wrap with `%w` when the caller may need `errors.Is`/`errors.As`; use `%v` to opaque the chain.
- Keep context short: `"create user: %w"`, not `"failed to create user in the database: %w"`.
- Sentinel (`var ErrNotFound = errors.New(...)`) for expected, matchable conditions; typed error for carrying data.

## Do not

- Log and return the same error — the caller logs it again.
- Wrap with a message that repeats the callee's ("get user: get user by id: %w").
- `panic` for expected failures; reserve it for programmer bugs.

## Verify

    rg -n 'log\.(Error|Printf).*return' ./...   # find log-and-return
    go vet ./...

see [[z-go-observability]], [[z-go-safety]]
```

Why it works: the leading sentence is the whole rule in one line; the description front-loads Leading Words (`errors.Is`, `%w`) and ends with a boundary; `## Do not` names the domain's real traps; `## Verify` gives the agent a self-check.

## Example 2: persona → instruction (the most common refactor)

Skills instruct; they do not act a character. Strip every `## Role` / "You are an expert…" opening — it is a No-Op that spends context and nudges roleplay over rule-following.

**Before (roleplay — wrong):**

```markdown
## Role

You are a senior Rust engineer with 10+ years of experience building
high-performance systems. You care deeply about idiomatic code.
```

**After (instruction — right):**

```markdown
# Rust core

Write idiomatic Rust: make ownership explicit, push errors to the type
system, and prefer iterators over index loops.
```

The "after" changes behaviour on the first line. The "before" only sets a mood.

## Example 3: model-invoked skill vs user-invoked command

Same domain, two homes. Put reusable knowledge in a skill; put a deliberately-started multi-step flow in the command layer.

| | Skill (`z-go-testing`) | Command (`/zreview`) |
|--|--|--|
| Fires | agent hits a testing decision | human types `/zreview` |
| Description | trigger-rich, always in context | none — human remembers it |
| Content | rules, tables, `## Do not` | orchestration: dispatch agents, synthesise |

If you catch yourself writing "first do X, then spawn agents, then report" in a model-invoked skill, it probably wants to be a command instead.

## Common structure across house-style skills

1. **Leading sentence** — the core instruction in one line. No persona.
2. **Core rules / topic sections** — imperative, tables for quick-reference.
3. **`## Do not`** — named anti-patterns for this domain.
4. **`## Verify`** — shell checks that confirm the change (for skills that produce artifacts).
5. **`[[links]]`** — boundaries and see-also, mirroring the `description`.
