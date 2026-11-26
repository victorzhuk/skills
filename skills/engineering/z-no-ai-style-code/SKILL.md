---
name: z-no-ai-style-code
description: "Review naming, error context, and code structure against nearby project code. Use for redundant wrappers, Interface/Impl suffixes, or verbose identifiers. See [[z-zero-comments]] for comments."
---

# No AI-style code

Follow the naming and error conventions of nearby code.

## Core rules

- Read a file in the same package. Follow its naming and error conventions.
- Prefer names that describe the role at the point of use. Use familiar local abbreviations such as `cfg` or `repo`.
- Wrap an error with the failed operation, for example `"create user: %w"`.
- Use [[z-no-over-engineering]] to determine whether a caller needs a type boundary. Omit redundant `Interface` and `Impl` suffixes.

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
- Write a docstring-style block comment above a function whose name already says what it does.

## Verify

Compare the changed names, error handling, and structure with nearby code. Preserve required behavior.
