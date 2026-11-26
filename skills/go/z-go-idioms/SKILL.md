---
name: z-go-idioms
description: "Select Go idioms for ownership, error returns, interfaces, zero values, concurrency, and formatting. Use the linked Go skills for implementation details."
---

# Go Idioms

## Related implementation skills

| Question | Skill |
|---|---|
| Identifier, package, constructor names | [[z-go-naming]] |
| Declarations, control flow, function shape | [[z-go-style]] |
| Error wrapping, sentinel vs typed errors | [[z-go-errors]] |
| Interface size and placement | [[z-go-interfaces]] |
| Goroutines, channels, sync | [[z-go-concurrency]] |
| Context propagation | [[z-go-context]] |
| Version-specific language and library changes | [[z-go-modernize]] |
| "Does std already have this?" | [[z-go-stdlib]] |
| Layering, dependency direction | [[z-go-clean-arch-di]] |
| Speculative abstraction | [[z-no-over-engineering]] |
| Doc comments | [[z-go-documentation]] |

## Design rules

- Return concrete types when callers need their methods. Accept a small interface for the operations a caller uses. Preserve shared protocol contracts.
- Design for a usable zero value when possible. `bytes.Buffer` and `sync.Mutex` work without constructors.
- Search the standard library before importing a dependency. Weigh a small helper against future maintenance.
- Channels copy values. A sender can still hold a pointer to shared storage. Define ownership or synchronize access.
- Return errors for expected failures. Let the boundary that handles a failure decide whether to log it.
- Use panic for a broken invariant only when the operation cannot continue safely.
- Use an explicit type, interface, or constraint when its operations matter. Use `any` for truly unrestricted values.
- Use a named field unless callers need promoted methods. Embedding provides composition without virtual dispatch.
- Pass dependencies explicitly. Shared mutable state needs synchronization and can prevent parallel tests.
- Add a type parameter when callers need the same algorithm over different types. Keep the constraint as narrow as the operations require.
- Give each goroutine a termination condition and an owner that can wait for it.
- Prefer a direct expression or type switch when it is easier to review. Run `gofmt` for layout.

## Common design choices

| Imported habit | Go idiom |
|---|---|
| Getter/setter pairs for every field | Export the field, or a getter named `Owner()` not `GetOwner()` |
| Interface declared next to each struct | Consumer contract by default. Use actual boundary needs and the exceptions in [[z-go-interfaces]] |
| Factory / builder hierarchies | Plain constructor first. Choose config structs or options from actual callers. See [[z-go-interfaces]] |
| `util`/`common`/`base` packages | Package per responsibility, named by what it provides |
| Exception-style flow (panic/recover as control) | Explicit `error` returns |
| Annotation/DI frameworks | Plain constructor wiring in `main` |
| Unbounded workers | Choose a worker limit from the resource budget. Use a semaphore or a bounded pool. |

## Sources

[Effective Go](https://go.dev/doc/effective_go), [Go Proverbs](https://go-proverbs.github.io/), [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments), and the [Google Go Style Guide](https://google.github.io/styleguide/go/).

## Verify

```sh
gofmt -l .
go vet ./...
golangci-lint run
```
