---
name: z-go-interfaces
description: "Design Go interfaces, type constraints, receiver methods, and embedding. Use for method sets, typed nils, type switches, or constructor options. See [[z-go-clean-arch-di]] for service wiring."
---

# Go Interfaces & Type Design

## Interface design

Keep each interface focused on operations the consumer needs. Split unrelated capabilities.

```go
type Reader interface{ Read(p []byte) (n int, err error) }
type Writer interface{ Write(p []byte) (n int, err error) }
type ReadWriter interface{ Reader; Writer }
```

Define a narrow contract in the consuming package.

```go
// package notification — only what it needs
type Sender interface{ Send(to, body string) error }

type Service struct{ sender Sender }
```

The email package can return a concrete client. Keep shared or generated interfaces with the protocol that owns them.

Return a concrete value when callers need its methods.

```go
func NewService(store UserStore) *Service { ... }
```

Return an interface for a shared protocol, runtime selection, or deliberate API restriction. Extract one for an actual boundary or test seam.

## Compile-time interface check

```go
var _ io.ReadWriter = (*MyBuffer)(nil)
```

Place the assertion near the implementation. The package fails to build if the method set changes.

## Type assertions & switches

Use the comma-ok form when a value can have another dynamic type.

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
case io.Reader:
    _, err := io.Copy(os.Stdout, v)
    return err
default:
    return fmt.Errorf("unexpected type %T", v)
}
```

## Embedding

Embed a type when the outer type must expose its promoted members. Use a named field for an internal dependency.

| | Use case |
|---|---|
| **Embed** | Outer type exposes the inner type's API (`Server` embeds `http.Handler`) |
| **Named field** | Outer type hides it (`Server` holds `store *DataStore`) |

A promoted method runs with its original receiver. An outer method can shadow its name. Calls inside the embedded type still use its own methods. Equal-depth selector conflicts can prevent promotion.

## Receivers

| Pointer `(s *S)` | Value `(s S)` |
|---|---|
| Method mutates receiver | Receiver is small and read-only |
| Receiver contains a mutex | Receiver is a basic type |
| Large struct | Map / function value (already a reference) |

Prefer consistent receivers for related methods. Use a pointer when copying the value would break its contract.

For a defined non-pointer, non-interface type `T`, the method set of `T` contains its value-receiver methods. The method set of `*T` also includes pointer-receiver methods. An addressable value can call a pointer method without satisfying its interface. Map elements and concrete interface values are not addressable through those expressions.

A method value captures its receiver when created. A value receiver copies the value and can still share nested storage. A pointer receiver captures the pointer. Use `(*T).M` to select the receiver at call time. See [[z-go-safety]].

## Zero value

Make the zero value usable where practical. Initialize a nil map before the first write. A nil slice already supports append.

```go
func (r *Registry) Register(name string, item Item) {
    if r.items == nil {
        r.items = make(map[string]Item)
    }
    r.items[name] = item
}
```

## Generics vs interfaces

Use an interface for common behavior. Use a type parameter when the same algorithm needs to preserve a caller's type or use constraint operations.

```go
func Process[T io.Reader](r T) error { ... }  // bad — T adds nothing
func Process(r io.Reader) error { ... }        // good
```

Select a constraint from the operations the algorithm uses. `comparable` permits equality and map keys. Use `~T` to admit defined types with underlying type `T`. A union admits alternatives. Embedded constraint elements intersect their type sets. Interfaces with non-method type restrictions serve as constraints only.

Since Go 1.20, `any` satisfies `comparable`. Equality can still panic when both operands contain the same non-comparable dynamic type. A map key containing a slice can panic for the same reason. Reject such inputs or use strictly comparable keys, including their nested fields.

## Constructor configuration

Pass required dependencies as ordinary parameters. Use a config struct for related settings. Use functional options when callers need selective overrides or reusable option composition. Apply defaults before the options.

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

## Checks

```sh
go vet ./...
golangci-lint run
```

Check the intended method set at compile time. Test a typed nil pointer stored in an interface. That interface still has a dynamic type and differs from nil. Test non-comparable dynamic inputs where generic APIs accept interface values.

## Sources

- [Go101: methods](https://go101.org/article/method.html), [embedding](https://go101.org/article/type-embedding.html), [type constraints](https://go101.org/generics/555-type-constraints-and-parameters.html).
- [Go specification: method sets](https://go.dev/ref/spec#Method_sets), [method values](https://go.dev/ref/spec#Method_values), [constraint satisfaction](https://go.dev/ref/spec#Satisfying_a_type_constraint).
- [Google Go best practices: interfaces](https://google.github.io/styleguide/go/best-practices.html#interfaces), [variadic options](https://google.github.io/styleguide/go/best-practices.html#variadic-options).
