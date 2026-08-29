---
name: z-go-idioms
description: >
  Go design idioms from the official canon — Effective Go, Go Proverbs, Code
  Review Comments, Google's style guide — as decision rules: accept
  interfaces return structs, zero value useful, errors are values, don't
  panic. Use to judge whether a design "feels like Go" or to unlearn
  Java/C# projections. Mechanics route to siblings via the router table;
  formatting [[z-go-style]], naming [[z-go-naming]].
---

# Go Idioms

Design-level judgment from the official canon. This skill owns the *why*;
mechanics belong to sibling skills — route first, then apply the proverbs.

## Router — who owns the mechanics

| Question | Skill |
|---|---|
| Identifier, package, constructor names | [[z-go-naming]] |
| Declarations, control flow, function shape | [[z-go-style]] |
| Error wrapping, sentinel vs typed errors | [[z-go-errors]] |
| Interface size and placement | [[z-go-interfaces]] |
| Goroutines, channels, sync | [[z-go-concurrency]] |
| Context propagation | [[z-go-context]] |
| Current-API upgrades (1.21–1.27) | [[z-go-modernize]] |
| "Does std already have this?" | [[z-go-stdlib]] |
| Layering, dependency direction | [[z-go-clean-arch-di]] |
| Speculative abstraction | [[z-no-over-engineering]] |
| Doc comments | [[z-go-documentation]] |

## Proverbs as decision rules

Each proverb below is canon (Pike's Go Proverbs, Effective Go); apply the
rule, not the slogan.

- **Accept interfaces, return structs.** Parameters: the narrowest interface
  the function actually calls, declared at the consumer. Returns: concrete
  types — callers keep full API and can wrap themselves.
- **The bigger the interface, the weaker the abstraction.** One- or
  two-method interfaces compose (`io.Reader`, `fmt.Stringer`); depth in
  [[z-go-interfaces]].
- **Make the zero value useful.** `var b bytes.Buffer`, `var mu sync.Mutex`
  work unconstructed. Design new types the same way; add a constructor only
  when invariants demand it.
- **A little copying is better than a little dependency.** Inline a ten-line
  helper instead of importing a module for it; full gate in [[z-go-stdlib]].
- **Don't communicate by sharing memory; share memory by communicating.**
  Channels transfer *ownership* of data; mutexes serialize access to state.
  Pick by which sentence describes the problem.
- **Errors are values.** Program with them — sticky-error writers, error
  accumulators — instead of if-err ladders around every call; patterns in
  [[z-go-errors]].
- **Don't panic.** Return errors across package boundaries. `panic` only for
  programmer error that cannot continue (impossible state, init-time misconfig).
- **Clear is better than clever.** Choose the version a reviewer reads in one
  pass: no expression golf, no reflection where a type switch reads plainly.
- **`interface{}`/`any` says nothing.** Reach for a concrete type, a small
  interface, or a type parameter first; `any` is the last resort.
- **Gofmt's style is no one's favorite, yet gofmt is everyone's favorite.**
  Never argue formatting; never hand-format against the tool.

## Design idioms beyond the proverbs

- **Composition over inheritance.** Embed for behavior reuse; no type
  hierarchies. An embedded type is a member, not a parent — overriding does
  not exist, method sets just merge.
- **No package-level mutable state.** Pass dependencies explicitly (struct
  fields, parameters). Package `init` and globals hide coupling and break
  parallel tests.
- **Concrete first, generic on proven repetition.** Write for the one type
  you have; introduce a type parameter after the second or third real
  duplication, never before. The same restraint applies to generic methods
  (1.27): reach for one only when a plain method or top-level generic func
  has already proven insufficient.
- **Never start a goroutine without knowing how it stops** (Cheney). Every
  `go` statement names its shutdown signal; lifecycle patterns in
  [[z-go-concurrency]].
- **Return the error, don't log-and-return.** One handling site per error:
  either handle it (log, degrade, retry) or return it — both duplicates noise.

## Unlearn — projections from other languages

| Imported habit | Go idiom |
|---|---|
| Getter/setter pairs for every field | Export the field, or a getter named `Owner()` not `GetOwner()` |
| Interface declared next to each struct | Interface at the consumer, only when a second implementation or a test seam exists |
| Factory / builder hierarchies | Constructor func, functional options, or a config struct |
| `util`/`common`/`base` packages | Package per responsibility, named by what it provides |
| Exception-style flow (panic/recover as control) | Explicit `error` returns |
| Annotation/DI frameworks | Plain constructor wiring in `main` |
| Thread-pool thinking | Goroutines are cheap; bound with `errgroup`/semaphore, not pools of workers by default |

## Canon sources

Effective Go, Go Proverbs (Pike, 2015), Go Wiki Code Review Comments and Test
Comments, Google Go Style Guide, the Go blog. When citing a rule's exact
current wording, fetch the source — the wiki and style guide evolve.

## Verify

```sh
gofmt -l .
go vet ./...
golangci-lint run
```
