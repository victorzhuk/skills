---
name: z-go-style
description: "Review Go declarations, control flow, function signatures, and package layout. Use for guard clauses, zero values, boolean expressions, and formatting. See [[z-go-naming]] for identifiers."
---

# Go Style

## Quick Reference

| Topic | Rule |
|---|---|
| Zero-value local | `var x T` |
| Initialized local | Use `:=` when the type is clear |
| Struct literal | Use field names. Omit zero fields where appropriate. |
| `iota` start | Use zero for a valid state or reserve it for an invalid value. |
| `any` | Alias for `interface{}` |
| if-init | Use when var is only needed for the check |
| Guard clause | Handle errors and edge cases before the main path |
| Drop else | When if body ends with return/break/continue |
| Complex condition | Name a domain predicate when it clarifies the decision |
| switch vs if-else | Use switch when comparing same var multiple times |
| Labeled break | `break Label` to exit loop from inside switch |
| Signature wrapping | All params on own lines + trailing comma |
| Configuration params | Ordinary params first. Choose config structs or options from actual callers. See [[z-go-interfaces]] |
| Pointer to interface | Almost never needed — pass interface value |
| Printf variants | Use the `f` suffix. Quote string values with `%q` when needed. |
| File order | type → constructor → exported → unexported → utils |
| Visibility | Export only names that callers need |

---

## Declarations

Use `var x T` for an explicit zero value. Short declarations can also assign zero values.

```go
var count int
var filtered []Order
name := "default"
var buf bytes.Buffer
```

Group related declarations. Keep unrelated blocks separate.

```go
const (
    Add Operation = iota
    Subtract
    Multiply
)
```

Never shadow built-ins (`error`, `string`, `len`, `cap`, `new`, `make`, `any`, `nil`, etc.).

### Structs and maps

```go
srv := &http.Server{         // field names always
    Addr:        ":8080",
    ReadTimeout: 5 * time.Second,
}

m := make(map[string]int)
m := map[string]int{"a": 1}
var m map[string]int
```

Preallocate when the expected size or a measurement justifies the capacity.

Backtick strings for regex, SQL, JSON, multi-line text — avoid `\"` escaping.

---

## Control Flow

### Guard clauses (early return)

Handle errors and edge cases first. Keep the happy path unindented.

```go
func process(data []byte) (*Result, error) {
    if len(data) == 0 {
        return nil, errors.New("empty data")
    }
    parsed, err := parse(data)
    if err != nil {
        return nil, fmt.Errorf("parsing: %w", err)
    }
    return transform(parsed), nil
}
```

Drop `else` when the `if` body ends with `return`, `break`, or `continue`.

### if-init

Scope variables to the block when only needed for the check:

```go
if err := os.WriteFile(name, data, 0644); err != nil {
    return err
}
```

If you need the variable after the block, declare it outside with `var`.

`:=` in an inner scope shadows, not reassigns — declare `var cancel func()` outside and use `=` to assign.

### Name a domain predicate

```go
isAdmin  := user.Role == RoleAdmin
isOwner  := resource.OwnerID == user.ID
isPublic := resource.IsPublic && user.IsVerified
if isAdmin || isOwner || isPublic {
    allow()
}
```

### Switch over if-else chains

```go
switch status {
case StatusActive:
    activate()
case StatusInactive:
    deactivate()
default:
    panic(fmt.Sprintf("unexpected status: %d", status))
}
```

Labeled break to exit a loop from inside a switch:

```go
Loop:
    for _, v := range items {
        switch v.Type {
        case "done":
            break Loop
        }
    }
```

---

## Functions

### Signature design

```go
func FetchUser(ctx context.Context, id string) (*User, error)
```

Context first. Start with ordinary parameters.
Choose config structs or functional options from actual caller needs, not parameter counts. See [[z-go-interfaces]].
Wrap when > ~120 chars:

```go
func (r *Handler) CreateOrder(
    ctx context.Context,
    userID string,
    req CreateOrderReq,
) (*Order, error) {
```

Naked returns only in very short functions (≤3 lines).

Pass small types (`string`, `int`, `bool`, `time.Time`) by value. Pointer when mutating, nil is meaningful, or struct > ~128 bytes.

Never pass a pointer to an interface:

```go
func process(r io.Reader) { ... }   // good
func process(r *io.Reader) { ... }  // almost never right
```

### Printf helpers

Name format-accepting funcs with `f` suffix for `go vet`. Use `%q` for strings in error messages:

```go
return fmt.Errorf("unknown key %q", key)
```

### File layout

```
type Foo struct { ... }
func newFoo() *Foo { ... }
func (f *Foo) Export() { ... }
func (f *Foo) internal() { ... }
func helper() { ... }
```

Export names that callers need. Reserve dot imports for conventions that require them. Use blank imports for required registration side effects.

---

## Do not

- Claim an external signature or arbitrary JSON requires `interface{}` spelling: `any` is the same type. Preserve surrounding style when editing existing code.
- Preallocate speculatively (`make([]T, 0, 1000)` when common case is 10 items).
- Add `else` after a returning `if`.
- Extract a boolean only to meet an operand-count rule. Keep the domain decision readable.
- Pass pointer to interface.
- Return an interface from a constructor without a concrete caller need. Prefer concrete types. See exceptions in [[z-go-interfaces]].
- Shadow built-in identifiers.
- Add `/* name */` comments to clarify params — fix the type instead.

## Verification

```sh
gofmt -l .
go vet ./...
golangci-lint run
```

Require empty output from `gofmt -l`. The command can list unformatted files and exit successfully.
