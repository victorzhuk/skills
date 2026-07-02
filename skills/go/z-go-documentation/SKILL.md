---
name: z-go-documentation
description: >
  Go documentation conventions — godoc comments, package comments, README structure,
  CONTRIBUTING, CHANGELOG, Example tests, API docs, and llms.txt. Use when writing or
  reviewing doc comments, adding examples, structuring project docs, or auditing doc
  completeness for a library or application/CLI. Triggers on "godoc", "pkg.go.dev",
  "ExampleXxx", "doc comment", "README", "CHANGELOG", "llms.txt", "go doc".
  Does not cover naming conventions; see [[z-go-naming]]. Does not cover test structure;
  see [[z-go-testing]].
---

# Go Documentation

## Writing Principles

Code shows *what*; comments explain *why* and *when*. Every doc comment must add
information the reader cannot read directly from the signature.

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

## Quick Reference

| What | Rule |
|---|---|
| Package comment | Required; one per package; place in `doc.go` for large packages |
| Exported symbols | All must have comments; start with the symbol name |
| Comment content | Why/when/constraints/errors — never restate the signature |
| Deprecated | `// Deprecated: Use X instead.` on its own line |
| Interface docs | Document the contract, not the implementation |
| Example tests | Nice-to-have, rarely used here; `ExampleXxx()` in `*_test.go` when you do write one |
| Internal funcs | Comment complex ones; skip trivial ones |
| Test functions | Do not comment |

## Example Test Functions

Nice-to-have, not a default — rarely used in practice. Write `ExampleXxx` in
`_test.go` files when a runnable usage snippet earns its keep for a public
API; they run under `go test` and appear on pkg.go.dev:

```go
func ExampleOrderRepository_Create() {
    repo := orders.NewRepository(db)
    id, err := repo.Create(ctx, &orders.Order{
        CustomerID: "c-123",
        Items:      []orders.Item{{SKU: "A1", Qty: 2}},
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(id != "")
    // Output:
    // true
}
```

Output comments are mandatory for the test runner to verify them. Omit only when output
is non-deterministic (add `// Unordered output:` for set results).

## README Structure

| # | Section | Notes |
|---|---|---|
| 1 | Title | `# PackageName` |
| 2 | Badges | Go version, license, CI, coverage |
| 3 | Summary | 1-2 sentences: what it does |
| 4 | Demo | Code snippet, GIF, or screenshot |
| 5 | Getting Started | Install + minimal working example |
| 6 | Features | Detailed feature list or spec |
| 7 | Contributing | Link to CONTRIBUTING.md |
| 8 | License | Name + link |

Common badges:

```markdown
[![Go Version](https://img.shields.io/github/go-mod/go-version/{owner}/{repo})](https://go.dev/)
[![License](https://img.shields.io/github/license/{owner}/{repo})](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/{owner}/{repo}/test.yml)](https://github.com/{owner}/{repo}/actions)
[![Go Reference](https://pkg.go.dev/badge/github.com/{owner}/{repo}.svg)](https://pkg.go.dev/github.com/{owner}/{repo})
```

## CONTRIBUTING

Help a contributor run tests and submit a PR in under 10 minutes. Include:
prerequisites, clone, build, test, PR process. If setup takes longer, fix it first
(Makefile, Taskfile, devcontainer).

## CHANGELOG

Follow [Keep a Changelog](https://keepachangelog.com/) or use GitHub Releases.
Each entry answers *what changed for the user* — internal refactors without visible
impact belong in commit history only.

## Library vs Application Docs

| Item | Library | Application/CLI |
|---|---|---|
| godoc comments | Required | Required |
| `ExampleXxx` tests | Nice-to-have (rare in practice) | Nice-to-have (rare in practice) |
| pkg.go.dev / `go doc` | Primary API surface | Supplemental |
| CLI `--help` text | N/A | Primary API surface |
| Config/env docs | Optional | Required |
| OpenAPI / protobuf | If applicable | If applicable |
| llms.txt | Optional, unused so far | Optional, unused so far |

**Libraries:** doc comments are the primary deliverable; Example tests are a
nice-to-have on top, not required.
Playground links in comments: `// Play: https://go.dev/play/p/xxx`.

**Applications:** `--help` is the primary doc surface. Document all env vars, config
keys, and CLI flags. Installation section must cover binary, `go install`, and Docker.

## API Documentation

| Style | Format | Tooling |
|---|---|---|
| REST/HTTP | OpenAPI 3.x | `ogen` (preferred), `swaggo/swag` |
| gRPC | Protobuf | `buf`, `grpc-gateway` |
| Event-driven | AsyncAPI | Manual or codegen |

Prefer codegen from schema over annotation-driven generation — schema is the source of
truth.

## llms.txt

Optional — zero adoption in practice so far. Add it only when a concrete
agent-consumption need comes up, not by default. If added: a plain-text,
structured overview at the repo root — project purpose, key packages, public
API surface, and links to machine-readable specs (OpenAPI, proto files). Keep
it factual — no marketing.

## Do not

- Write comments that only restate what the signature shows.
- Use `// TODO` as a substitute for a real doc comment on an exported symbol.
- Skip the package comment on non-trivial packages.
- Put `// Output:` blocks in Example functions when output is truly non-deterministic
  (use `// Unordered output:` for sets, or drop the output check and accept the example
  won't be verified).
- Commit `llms.txt` with speculative or future-tense claims.

## Verify

```sh
go doc ./...                  # check all exported symbol comments render
go test -run Example ./...    # verify all Example functions pass
```
