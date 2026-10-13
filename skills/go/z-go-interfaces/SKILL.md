---
name: z-go-interfaces
description: Interface design, struct embedding, type assertions, compile-time checks, receiver rules, generics vs interfaces in Go. Use when designing types, defining interfaces, embedding structs, or choosing receivers. Triggers on "accept interfaces return structs", "compile-time interface check", "var _ Interface", "type assertion", "pointer receiver". Also covers functional-options constructors. Does not cover layer direction/DI; see [[z-go-clean-arch-di]].
---

# Go Interfaces & Type Design

## Interface design

**Keep interfaces focused.** Prefer small consumer contracts; split unrelated capabilities rather than enforcing a universal method count:

```go
type Reader interface{ Read(p []byte) (n int, err error) }
type Writer interface{ Write(p []byte) (n int, err error) }
type ReadWriter interface{ Reader; Writer }
```

**Prefer consumer-owned interfaces.** Define a narrow contract where its caller needs it:

```go
// package notification — only what it needs
type Sender interface{ Send(to, body string) error }

type Service struct{ sender Sender }
```

In this example, the `email` package exports a concrete `Client` without declaring `Sender`.
Shared or generated protocol contracts can own interfaces outside the consumer package.
Preserve that ownership when the contract requires it.

**Prefer concrete return types.** Callers retain the full API and can assign results to their own interfaces:

```go
func NewService(store UserStore) *Service { ... }
```

Return an interface for required shared protocols, runtime implementation selection, or deliberate API restriction that serves callers.
Use these exceptions for a concrete requirement, not to hide every implementation behind an interface.

**Don't extract interfaces prematurely.** Start concrete.
Extract an interface for an established boundary, test seam, or caller that needs interchangeable implementations.
Neither implementation count nor consumer count decides this alone.

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
if f, ok := w.(http.Flusher); ok {
    f.Flush()
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

The receiver of a promoted method is the embedded value. An outer method with
the same name shadows that selector; calls inside the embedded type still use
its own methods. Embedding does not provide virtual dispatch. Equal-depth
selector collisions can prevent promotion and change interface satisfaction.

## Receivers

| Pointer `(s *S)` | Value `(s S)` |
|---|---|
| Method mutates receiver | Receiver is small and read-only |
| Receiver contains a mutex | Receiver is a basic type |
| Large struct | Map / function value (already a reference) |

**Pick one and stay consistent.** If any method uses a pointer receiver, all
methods should.

For a defined non-interface, non-pointer type `T`, the method set of `T` contains value-receiver
methods; `*T` also has pointer-receiver methods. An addressable `t.M()` can be
shorthand for `(&t).M()`; this does not make `T` implement an interface requiring
that pointer method. Map elements and concrete values stored in interfaces are
not addressable through those expressions.

A method value `f := x.M` saves its receiver at creation: a value receiver is a
copy, a pointer receiver keeps the pointer. Later reassignment of `x` does not
rebind `f`. For explicit receiver selection at call time, use a method expression
such as `(*T).M`. Value-receiver copies can still alias nested data; see [[z-go-safety]].

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

Choose constraints from the operations required: `comparable` permits `==` and
map keys, not ordering or arithmetic. Use `~T` when accepting defined types with
underlying type `T`; a bare non-interface `T` term admits only that type. Unions admit
alternatives; embedded constraint elements intersect their type sets. Interfaces
whose type sets cannot be expressed entirely by methods are constraints, not
ordinary runtime value types.

Since Go 1.20, `any` can satisfy `comparable`; this is not a panic-free comparison
guarantee. Equality of two interfaces with the same non-comparable dynamic type
(such as `[]int`) panics; an interface map key with such a value also panics.
This can occur inside `Equal[T comparable]` instantiated with `any`, or through
interface fields in structs. Prefer strictly comparable key types when inputs
must be accepted without runtime panics: their compared fields/elements must
exclude interfaces, including within nested structs and arrays.

Start concrete; generalize only when a second real call site appears.

## Constructor configuration

Start with ordinary parameters for required dependencies and simple inputs.
Use a config struct for related settings that callers commonly supply together.
Consider functional options for actual caller needs: selective overrides, defaults, or reusable option composition.
Use them only when simpler forms cannot express those needs clearly.
Choose from actual call sites, not parameter counts or anticipated growth.

When functional options meet that need, apply defaults before the supplied options:

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

Keep required dependencies explicit rather than hiding them in optional configuration.

## Quick Reference

| Rule | Do | Don't |
|---|---|---|
| Interface size | Focused capabilities | Unrelated methods or universal method limits |
| Interface placement | Consumer by default. Respect shared/generated protocol ownership | Mirror every implementation with an interface |
| Constructors | Concrete by default. Interface for protocol, runtime selection, or deliberate API restriction | Hide implementations without a caller need |
| Constructor configuration | Ordinary params first. Choose config structs or options from actual callers | Numeric thresholds or anticipated growth |
| Premature interface | Extract for a real boundary, test seam, or interchangeable implementations | Decide from implementation or consumer count alone |
| Compile-time check | `var _ Iface = (*Type)(nil)` | Skip it |
| Type assertion | Always comma-ok | Bare `val.(T)` |
| Receivers | Consistent per type; pointer if mutates/large | Mix pointer + value |
| Embed vs field | Embed to expose API, field to hide | Embed to "save typing" |
| Constraints | `any` unless operations need more; `comparable` for equality/map keys | Assume `comparable` makes interface values panic-free |
| Generics | Shared logic, no useful interface | Genericize when interface fits |

## Verify

```sh
go vet ./...
golangci-lint run
```

Check interface satisfaction for the intended `T` or `*T`, not only whether a
method call compiles. For generic comparisons accepting interface values, test
non-comparable dynamic values at the boundary.

## Sources

- [Go101: methods](https://go101.org/article/method.html), [embedding](https://go101.org/article/type-embedding.html), [type constraints](https://go101.org/generics/555-type-constraints-and-parameters.html).
- [Go specification: method sets](https://go.dev/ref/spec#Method_sets), [method values](https://go.dev/ref/spec#Method_values), [constraint satisfaction](https://go.dev/ref/spec#Satisfying_a_type_constraint).
- [Google Go best practices: interfaces](https://google.github.io/styleguide/go/best-practices.html#interfaces), [variadic options](https://google.github.io/styleguide/go/best-practices.html#variadic-options).
