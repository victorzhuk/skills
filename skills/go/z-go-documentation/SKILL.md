---
name: z-go-documentation
description: "Write Go package and symbol comments, executable examples, README files, and API documentation. See [[z-changelog]] for release notes and [[z-zero-comments]] for implementation comments."
---

# Go Documentation

## Writing Principles

Explain behavior that the signature cannot express.

Anti-patterns to remove on sight:
- Paraphrase comments that start with the name and stop there (`// Foo returns a foo.`)
- Signature restatement (`// Parse parses the input string into T.`)
- Marketing vocabulary (`seamlessly`, `robust`, `enterprise-grade`)
- Hedged future claims (`easy to extend`, `for future use`)

## Package Comments

Every package needs one. Place it in `doc.go` for non-trivial packages:

```go
// Package orders implements the order lifecycle — creation, fulfillment, and cancellation.
// It exposes domain types and use-case interfaces consumed by the transport layer.
package orders
```

One-line is fine for simple packages. Multi-line for packages with multiple responsibilities.

## Exported Symbol Comments

Every exported function, method, type, and constant must have a doc comment.

Start with the symbol name + a verb phrase. Focus on when to call it, constraints, and
error conditions — not what the code already shows:

```go
// Create persists a new order and returns its assigned ID.
// Returns ErrDuplicate if an order with the same idempotency key already exists.
// Returns ErrInvalidItem if any line item has a zero quantity or unknown SKU.
func (r *OrderRepository) Create(ctx context.Context, o *Order) (string, error)
```

Deprecated symbols:

```go
// Deprecated: Use CreateV2 which accepts a context and supports idempotency keys.
func Create(o *Order) (string, error)
```

For APIs that own resources or start concurrent work, document the applicable lifecycle contract:

- State who closes, cancels, or otherwise releases each resource, and when.
- State concurrent-use guarantees and any synchronization the caller must provide.
- Explain context lifetimes or cancellation behavior that differ from ordinary call-scoped use.
- State whether background work continues after return and how callers stop it and wait for completion.

Omit guarantees already implied by the API's conventional behavior.

## Quick Reference

| What | Rule |
|---|---|
| Package comment | Write a package overview. Use `doc.go` when the overview needs its own file. |
| Exported symbols | Start each doc comment with the symbol name |
| Comment content | Why/when/constraints/errors — never restate the signature |
| Deprecated | `// Deprecated: Use X instead.` on its own line |
| Interface docs | Document the contract, not the implementation |
| Example tests | Use `ExampleXxx` in `*_test.go` to verify a public usage contract |
| Internal functions | Document hidden invariants and operational constraints |
| Test functions | Do not comment |

## Example Test Functions

Use `ExampleXxx` in a `_test.go` file for an executable example of public behavior.

```go
func Example() {
    var b strings.Builder
    b.WriteString("go")
    fmt.Println(b.String())
    // Output:
    // go
}
```

Examples with an output comment run and compare output during `go test`. Examples without one compile but do not run.

Use `// Unordered output:` only when the contract permits reordering. [Go example tests](https://pkg.go.dev/testing#hdr-Examples)

## README

Title, badges (Go version, license, CI, pkg.go.dev), 1-2 sentence summary, install +
minimal working example, features, link to CONTRIBUTING, license. Order matters more
than exhaustiveness — a reader should hit a working example before a feature list.

## CONTRIBUTING

Get a contributor running tests and opening a PR in under 10 minutes: prerequisites,
clone, build, test, PR process. If setup takes longer, fix the tooling first (Makefile,
Taskfile, devcontainer).

For release notes, see [[z-changelog]].

## Library vs Application Docs

| Item | Library | Application/CLI |
|---|---|---|
| godoc comments | Required | Required |
| `ExampleXxx` tests | Demonstrate public behavior | Demonstrate a supported calling pattern |
| pkg.go.dev / `go doc` | Primary API surface | Supplemental |
| CLI `--help` text | N/A | Primary API surface |
| Config/env docs | Optional | Required |
| OpenAPI / protobuf | If applicable | If applicable |
| llms.txt | Optional when a consumer requires it | Optional when a consumer requires it |

For libraries, document the public API and link to runnable examples. For applications, compare `--help` with supported flags and configuration.

Document only the installation methods the project supports.

## API Documentation

| Style | Format | Tooling |
|---|---|---|
| REST/HTTP | OpenAPI 3.x | `ogen` (preferred), `swaggo/swag` |
| gRPC | Protobuf | `buf`, `grpc-gateway` |
| Event-driven | AsyncAPI | Manual or codegen |

Prefer codegen from schema over annotation-driven generation — schema is the source of
truth.

## llms.txt

Add an overview only for a known consumer. Link to the authoritative API or schema. Avoid duplicating specifications.

## Do not

- Write comments that only restate what the signature shows.
- Use `// TODO` as a substitute for a real doc comment on an exported symbol.
- Skip the package comment on non-trivial packages.
- Add an output assertion for a nondeterministic value. Use `// Unordered output:` if only the line order varies.
- Commit `llms.txt` with speculative or future-tense claims.

## Verify

Review changed API comments against the implementation. Verify cleanup ownership, concurrent-use guarantees, and exceptional context behavior wherever applicable. For background work, verify the documented stop and completion mechanism.

```sh
go list ./...                 # select the affected package
go doc -all ./path/to/package # render that package's exported API
timeout 5m go test -parallel 4 -p 2 -run Example -timeout 2m ./...    # verify all Example functions pass
```
