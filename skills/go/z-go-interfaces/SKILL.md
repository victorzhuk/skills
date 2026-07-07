---
name: z-go-interfaces
description: Interface design, struct embedding, type assertions, compile-time checks, receiver rules, generics vs interfaces in Go. Use when designing types, defining interfaces, embedding structs, or choosing receivers. Triggers on "accept interfaces return structs", "compile-time interface check", "var _ Interface", "type assertion", "pointer receiver". Also covers functional-options constructors. Does not cover layer direction/DI; see [[z-go-clean-arch-di]].
---

# Go Interfaces & Type Design

## Interface design

**1–3 methods.** Large interfaces weaken abstraction; split and compose:

```go
type Reader interface{ Read(p []byte) (n int, err error) }
type Writer interface{ Write(p []byte) (n int, err error) }
type ReadWriter interface{ Reader; Writer }
```

**Consumer owns the interface.** Define where consumed, not where implemented:

```go
// package notification — only what it needs
type Sender interface{ Send(to, body string) error }

type Service struct{ sender Sender }
```

The `email` package exports a concrete `Client` — it never declares `Sender`.

**Accept interfaces, return concrete types.** Callers get the full struct API;
callers upstream assign to an interface variable if they need to:

```go
func NewService(store UserStore) *Service { ... }  // good
func NewService(store UserStore) ServiceInterface  // bad — never do this
```

**Don't extract interfaces prematurely.** Start concrete; extract when a second
consumer or a test mock demands it. One implementation → no interface yet.

## Compile-time interface check

```go
var _ io.ReadWriter = (*MyBuffer)(nil)
```

Zero runtime cost. Breaks the build the moment the type drifts from the contract.
Place it next to the type definition.

## Type assertions & switches

Always comma-ok — bare assertions panic:

```go
s, ok := val.(string)   // good
s := val.(string)       // panics on mismatch
```

Optional capability check (stdlib pattern — `http.Flusher`, `io.ReaderFrom`):

```go
if f, ok := w.(interface{ Flush() error }); ok {
    return f.Flush()
}
```

Type switch:

```go
switch v := val.(type) {
case string:  ...
case int:     ...
case io.Reader: io.Copy(os.Stdout, v)
default:      fmt.Errorf("unexpected type %T", v)
}
```

## Embedding

Embedding promotes the inner type's full API — use it when the outer type *is*
an enhanced version. Use a named field when the outer type only *uses* the inner:

| | Use case |
|---|---|
| **Embed** | Outer type exposes the inner type's API (`Server` embeds `http.Handler`) |
| **Named field** | Outer type hides it (`Server` holds `store *DataStore`) |

Receiver of promoted methods is the inner type. Override by declaring the same
method on the outer type.

## Receivers

| Pointer `(s *S)` | Value `(s S)` |
|---|---|
| Method mutates receiver | Receiver is small and read-only |
| Receiver contains a mutex | Receiver is a basic type |
| Large struct | Map / function value (already a reference) |

**Pick one and stay consistent.** If any method uses a pointer receiver, all
methods should.

## Zero value

Design structs to work without explicit initialization. Lazy-init guards the nil
case when you can't avoid a map or slice:

```go
func (r *Registry) Register(name string, item Item) {
    if r.items == nil {
        r.items = make(map[string]Item)
    }
    r.items[name] = item
}
```

## Generics vs interfaces

Use an interface when types share *behaviour* (method set). Use generics when
types share *identical logic* with no useful shared interface. Decision: if
there's a shared method set, use an interface; if same algorithm over unrelated
types, use generics; otherwise stay concrete.

Don't genericize when an interface already fits:

```go
func Process[T io.Reader](r T) error { ... }  // bad — T adds nothing
func Process(r io.Reader) error { ... }        // good
```

Prefer `comparable` over hand-rolled type unions. Start concrete; generalize
only when a second real call site appears.

## Functional options

Use when a constructor has 3+ optional parameters or the API will grow.

```go
type Option func(*Server)

func WithPort(p int) Option { return func(s *Server) { s.port = p } }

func New(opts ...Option) *Server {
	s := &Server{port: 8080} // defaults
	for _, opt := range opts {
		opt(s)
	}
	return s
}
```

Under 3 options or all-internal API → plain config struct is simpler.

## Quick Reference

| Rule | Do | Don't |
|---|---|---|
| Interface size | 1–3 methods; compose | Giant catch-all interfaces |
| Interface placement | Consumer package / `domain/` | Implementor package |
| Constructors | Return concrete `*Type` | Return interface |
| Premature interface | Wait for 2nd consumer or mock | Extract for one impl |
| Compile-time check | `var _ Iface = (*Type)(nil)` | Skip it |
| Type assertion | Always comma-ok | Bare `val.(T)` |
| Receivers | Consistent per type; pointer if mutates/large | Mix pointer + value |
| Embed vs field | Embed to expose API, field to hide | Embed to "save typing" |
| `any` / generics | `[T comparable]` for type-safe ops | `any` for collections |
| Generics | Shared logic, no useful interface | Genericize when interface fits |

## Verify

```sh
go vet ./...
golangci-lint run
```
