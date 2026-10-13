---
name: z-go-naming
description: Go naming conventions — MixedCaps, package stuttering, constructors, booleans, acronyms, enums, error strings, receivers, getters, functional options. Use for naming decisions like "New vs NewTypeName", "isConnected vs connected", "ErrNotFound vs NotFoundError". Triggers on "MixedCaps", "snake_case identifier", "stuttering", "receiver name". Does not cover formatting/line-length; see [[z-go-style]]. Interface depth belongs to [[z-go-interfaces]].
---

# Go Naming

Prefer `MixedCaps` or `mixedCaps` for Go identifiers. Preserve established public names and project conventions; generated names, tests and interop can differ. These are naming conventions, not additional language restrictions.

## Quick Reference

| Element | Rule | Example |
|---|---|---|
| Package | short lowercase name; plural when natural | `json`, `http`, `tabwriter` |
| File | lowercase, underscores OK | `user_handler.go` |
| Exported | UpperCamelCase | `ReadAll`, `HTTPClient` |
| Unexported | lowerCamelCase | `parseToken`, `userCount` |
| Receiver | 1-2 letter abbreviation, consistent | `func (s *Server)` |
| Interface | verb/noun + `-er` suffix | `Reader`, `Stringer`, `Closer` |
| Constructor (single type) | `New()` | `ring.New()`, `user.New()` |
| Constructor (multi-type) | `NewTypeName()` | `http.NewRequest()` |
| Boolean field | clear predicate; prefix only when useful | `isConnected`, `hasPermission` |
| Boolean getter | prefix kept | `IsConnected() bool` |
| Non-bool getter | no `Get` prefix on field accessors; `Get` is idiomatic on repo/store/query methods | `user.Name()` not `GetName()`; `repo.GetByID(id)` is fine |
| Setter | `Set` prefix | `SetTimeout(d time.Duration)` |
| Constant | MixedCaps, not ALL_CAPS | `MaxRetries`, `defaultTimeout` |
| Enum zero value | plain `iota` is the default; sentinel only if zero-value ambiguity is a real risk | `StatusPending = iota` |
| Sentinel error var | `Err` prefix | `ErrNotFound`, `ErrTimeout` |
| Error type | `Error` suffix | `PathError`, `SyntaxError` |
| Error string | lowercase start except proper names/initialisms; no trailing punctuation | `"invalid message id"` |
| Sentinel error string | package-prefix when it helps, not universal | `"apiclient: not found"` or plain `"not found"` |
| Acronym | all caps or all lower | `URL`, `HTTPServer`, `xmlParser` |
| Context variant | `WithContext` suffix | `FetchWithContext()` |
| In-place mutation | follow established API and document mutation | `slices.Sort()`, `slices.Reverse()` |
| Panic-on-error | `Must` prefix | `MustParse()` |
| Functional option | `With` + field | `WithPort()`, `WithLogger()` |
| Format func | `f` suffix | `Errorf`, `Wrapf` |
| Import alias | only on collision | `mrand "math/rand"` |

## MixedCaps is non-negotiable

Go's export mechanism depends on capitalization. MixedCaps is the standard naming convention; underscores are not a language error.

```go
// good
MaxPacketSize
userCount
parseHTTPResponse

// bad
MAX_PACKET_SIZE   // C style
max_packet_size   // snake_case
kMaxBufferSize    // Hungarian
```

## No stuttering

The package name is always at the call site — never repeat it in the identifier.

```go
http.Client       // not http.HTTPClient
json.Decoder      // not json.JSONDecoder
user.New()        // not user.NewUser()
config.Parse()    // not config.ParseConfig()

// package sqldb:
type Connection struct{}  // not DBConnection
```

Anti-stutter applies to all exported types, not just the primary one. In package `dbpool`:
`Pool`, `Status`, `Option` — callers write `dbpool.Pool`, `dbpool.Status`, `dbpool.Option`.

## Constructor choice

Single primary type in the package → `New()`. Multiple constructible types → `NewTypeName()`.

```go
// package apiclient — single primary type
func New(opts ...Option) *Client

// package http — multiple types
func NewRequest(method, url string, body io.Reader) (*Request, error)
func NewServeMux() *ServeMux
```

## Booleans

Use a readable predicate. `connected`, `isConnected`, `hasPermission` and `canRetry` can all be clear; preserve the package's convention.

```go
type conn struct {
    isConnected bool
    hasPermission bool
}

func (c *conn) IsConnected() bool { return c.isConnected }
```

Do not rename a clear boolean merely to add a prefix.

## Getters

Plain field accessors skip `Get`: `user.Name()` not `user.GetName()`. Repository, store,
and query methods are the idiomatic exception — `Get` reads as "fetch", not "field access":
`repo.GetByID(id)`, `store.GetOrLoad(key)`, `db.GetTask(id)` are all correct as-is.

## Enums

Plain 0-based `iota` with a real state at zero is the observed default:

```go
type Status int

const (
    StatusPending Status = iota
    StatusActive
    StatusClosed
)
```

Add an explicit `Unknown`/`Invalid` sentinel at 0 only when an uninitialized `var s Status`
reaching production code is a real risk — e.g. the zero value crosses a serialization
boundary or drives a billing/permission decision:

```go
const (
    StatusUnknown Status = iota // zero value must not be mistaken for StatusPending
    StatusPending
    StatusActive
    StatusClosed
)
```

## Error strings

Start errors lowercase unless a proper name or initialism begins the message. Preserve meaningful acronym spelling, and omit trailing punctuation so wrapped errors compose.

```go
// good
errors.New("invalid message id")
fmt.Errorf("apiclient: not found")   // package-prefix when a sentinel could originate from more than one package
errors.New("not found")              // plain is fine too — common in domain-layer errors

// bad
errors.New("Invalid message ID")
```

Package-prefixing a sentinel string is helpful when it disambiguates, not a universal rule —
real code is inconsistent about it even within a single repo, and domain-layer errors often
skip the prefix.

## Packages

- Use a short lowercase package name; plurals can be natural (`strings`, `errors`, `slices`). Avoid unnecessary renames of established packages.
- No `util`, `helper`, `common` — these say nothing. Name the abstraction: `middleware`,
  `validator`, `retry`.
- Avoid stuttering in file names too: `user/store.go` not `user/user_store.go`.

## Common mistakes

| Mistake | Fix |
|---|---|
| `ALL_CAPS` constants | `MaxRetries` — Go uses MixedCaps for emphasis |
| `GetName()` field accessor | `Name()` — omit `Get` on plain accessors; `repo.GetByID()` is fine |
| `Url`, `Http`, `Json` | `URL`, `HTTP`, `JSON` — acronyms are all-caps or all-lower |
| `this`/`self` receiver | 1-2 letter abbreviation (`s` for `Server`) |
| `util`/`helper` packages | Name the domain: `retry`, `validator` |
| `http.HTTPClient` | `http.Client` — package name is already at the call site |
| `user.NewUser()` | `user.New()` — single type, no stutter |
| zero value drives a billing/permission decision | add `StatusUnknown` at 0 for that case — plain iota is the default otherwise |
| ambiguous sentinel shared across packages | `"mypackage: not found"` — prefix when it disambiguates |
| `userSlice` type | `users` — no type-encoding in names |
| `FetchCtx()` | `FetchWithContext()` — standard Go suffix |
| `parse()` panics | `mustParse()` — `Must` prefix warns caller |
| `Set*`/`Use*` options | `With*` — standard convention for functional options |

## Lint enforcement

`revive`, `errname`, `predeclared`, `misspell` catch most violations automatically.
Configure in the project's `.golangci.yml`. See [[z-go-style]] for linter setup.

## Verify

```sh
golangci-lint run ./...
```
