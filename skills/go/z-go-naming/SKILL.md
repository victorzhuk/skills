---
name: z-go-naming
description: "Choose Go package, type, receiver, constructor, enum, and error names. Use for MixedCaps, package stuttering, getters, and boolean predicates. Use [[z-go-style]] for formatting."
---

# Go Naming

Match package conventions and preserve public identifiers. Generated code and interop can impose different names.

## Quick Reference

| Element | Rule | Example |
|---|---|---|
| Package | Short lowercase name, plural where natural | `json`, `http`, `tabwriter` |
| File | lowercase, underscores OK | `user_handler.go` |
| Exported | UpperCamelCase | `ReadAll`, `HTTPClient` |
| Unexported | lowerCamelCase | `parseToken`, `userCount` |
| Receiver | 1-2 letter abbreviation, consistent | `func (s *Server)` |
| Interface | verb/noun + `-er` suffix | `Reader`, `Stringer`, `Closer` |
| Constructor (single type) | `New()` | `ring.New()`, `user.New()` |
| Constructor (multi-type) | `NewTypeName()` | `http.NewRequest()` |
| Boolean field | Readable predicate | `isConnected`, `hasPermission` |
| Boolean getter | prefix kept | `IsConnected() bool` |
| Field accessor | Omit `Get` for simple accessors. Repository lookups can use `Get`. | `user.Name()`, `repo.GetByID(id)` |
| Setter | `Set` prefix | `SetTimeout(d time.Duration)` |
| Constant | MixedCaps, not ALL_CAPS | `MaxRetries`, `defaultTimeout` |
| Enum zero value | Use a sentinel when zero means invalid | `StatusPending = iota` |
| Sentinel error var | `Err` prefix | `ErrNotFound`, `ErrTimeout` |
| Error type | `Error` suffix | `PathError`, `SyntaxError` |
| Error string | Start lowercase except for proper names and initialisms. Omit final punctuation. | `"invalid message id"` |
| Sentinel error string | package-prefix when it helps, not universal | `"apiclient: not found"` or plain `"not found"` |
| Acronym | all caps or all lower | `URL`, `HTTPServer`, `xmlParser` |
| Context variant | `WithContext` suffix | `FetchWithContext()` |
| In-place mutation | follow established API and document mutation | `slices.Sort()`, `slices.Reverse()` |
| Panic-on-error | `Must` prefix | `MustParse()` |
| Functional option | `With` + field | `WithPort()`, `WithLogger()` |
| Format func | `f` suffix | `Errorf`, `Wrapf` |
| Import alias | only on collision | `mrand "math/rand"` |

## Choose identifier case

Use MixedCaps for Go identifiers. The first character controls export visibility for eligible declarations.

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

Read an exported name together with its package qualifier. Omit a repeated word when the meaning remains clear.

```go
http.Client       // not http.HTTPClient
json.Decoder      // not json.JSONDecoder
user.New()        // not user.NewUser()
config.Parse()    // not config.ParseConfig()

// package sqldb:
type Connection struct{}  // not DBConnection
```

For example, `dbpool.Pool`, `dbpool.Status`, and `dbpool.Option` keep the qualifier meaningful.

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

Use a readable predicate that fits the package convention. Examples include `connected`, `isConnected`, `hasPermission`, and `canRetry`.

```go
type conn struct {
    isConnected bool
    hasPermission bool
}

func (c *conn) IsConnected() bool { return c.isConnected }
```

Do not rename a clear boolean merely to add a prefix.

## Getters

Use `Name()` for a field accessor. A repository operation such as `GetByID` can describe retrieval rather than field access.

## Enums

Choose the meaning of zero before defining an enumeration. Use a real zero state when the contract permits it.

```go
type Status int

const (
    StatusPending Status = iota
    StatusActive
    StatusClosed
)
```

Use an explicit zero sentinel when an unset value could cross a boundary or enable an unintended action.

```go
const (
    StatusUnknown Status = iota // zero value must not be mistaken for StatusPending
    StatusPending
    StatusActive
    StatusClosed
)
```

## Error strings

Start errors lowercase unless a proper name or initialism starts the message. Preserve meaningful acronym spelling, and omit trailing punctuation so wrapped errors compose.

```go
// good
errors.New("invalid message id")
fmt.Errorf("apiclient: not found")   // package-prefix when a sentinel could originate from more than one package
errors.New("not found")              // plain is fine too — common in domain-layer errors

// bad
errors.New("Invalid message ID")
```

Prefix an error with its package name only when that context helps the caller distinguish failures.

## Packages

- Preserve natural plural names such as `strings` and `slices`.
- No `util`, `helper`, `common` — these say nothing. Name the abstraction: `middleware`,
  `validator`, `retry`.
- Avoid stuttering in file names too: `user/store.go` not `user/user_store.go`.

## Common mistakes

| Mistake | Fix |
|---|---|
| `ALL_CAPS` constants | `MaxRetries` — Go uses MixedCaps for emphasis |
| `GetName()` field accessor | Use `Name()`. Queries can use `repo.GetByID()`. |
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

Check the project's enabled linters before attributing a naming failure to a rule. See [[z-go-lint]] for configuration.

## Verification

```sh
golangci-lint run ./...
```
