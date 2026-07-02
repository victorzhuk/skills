---
name: z-no-ai-style-code
description: Write like a senior maintainer of this specific project, not like a tutorial — natural short names, concise error context, structure that matches the surrounding code's idiom. Use when writing or reviewing any new code, especially in an unfamiliar language or after generating a first draft. Triggers on "applicationConfiguration", "UserServiceInterface"/"UserServiceImpl" pairs, "failed to X in the Y", verbose wrapper names, or a diff that reads noticeably more formal than the file around it. Does not cover comment content; see [[z-zero-comments]]. Does not cover language-specific naming/error conventions; follow that language's own style skill where one exists.
---

# No AI-style code

Match the file you're editing. New code should read like the maintainer who owns this file wrote it on an ordinary day — not like a textbook example generated in isolation.

## Core rules

- Short, natural names over descriptive-but-bloated ones: `cfg`, `repo`, `srv`, `pool` — not `applicationConfiguration`, `userRepositoryInstance`, `httpServerInstance`, `databaseConnectionPool`.
- Error context is a phrase, not a sentence: `"create user: %w"`, not `"failed to create user in the database: %w"`.
- Don't split a type into an `Interface` + `Impl` pair for one concrete implementation — see [[z-no-over-engineering]].
- Before writing, read a neighboring file in the same package and match its naming density, abstraction level, and idiom. A diff that looks more "polished" than its surroundings is a signal, not a compliment.
- Prefer the shape the codebase already uses over a textbook-correct alternative it doesn't use — consistency with the file beats abstract correctness.

## Examples

**AI-style — avoid:**

```go
applicationConfiguration := config.Load()
userRepositoryInstance := userRepo.New(pool)
httpServerInstance := NewServer(cfg)

if err != nil {
    return fmt.Errorf("failed to create user in database: %w", err)
}

type UserServiceInterface interface { ... }
type UserServiceImpl struct { ... }
```

**Natural — match this:**

```go
cfg := config.Load()
repo := userRepo.New(pool)
srv := NewServer(cfg)

if err != nil {
    return fmt.Errorf("create user: %w", err)
}

type UserService struct { ... }
```

## Do not

- Name a variable after its type (`userRepositoryInstance UserRepository`) — the type is already visible at the declaration.
- Wrap an error with a phrase that repeats the callee's own wrap ("get user: get user by id: %w").
- Reach for an interface, factory, or builder because it's "more testable" with no second concrete case in sight.
- Write a docstring-style block comment above a function whose name already says what it does.

## Verify

Read one existing file in the same package before finishing the diff; the new code should be indistinguishable in tone from what's already there.
