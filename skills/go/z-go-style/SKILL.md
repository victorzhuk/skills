---
name: z-go-style
description: >
  Go code style — declarations, control flow, function design, and file organization.
  Use when writing or reviewing Go code for clarity, structure, or formatting. Triggers
  on "var vs :=", "guard clause", "early return", "reduce nesting", "if-init", "switch
  over if-else", "function signature", "naked return", "composite literal", "iota",
  "blank identifier", "pointer to interface". Does not cover naming conventions
  (see [[z-go-naming]]) or error flow (see [[z-go-errors]]).
---

# Go Style

## Quick Reference

| Topic | Rule |
|---|---|
| Zero-value local | `var x T` |
| Non-zero local | `x := val` |
| Struct literal | Always field names; omit zero fields |
| iota start | Plain `iota` from 0 with a real state at zero (default); `iota + 1` only when zero-as-invalid genuinely matters |
| `any` | Default; `interface{}` only where an external signature or genuinely arbitrary JSON forces it |
| if-init | Use when var is only needed for the check |
| Guard clause | Handle error/edge first; happy path unindented |
| Drop else | When if body ends with return/break/continue |
| Named booleans | Extract 3+ operands into named vars |
| switch vs if-else | Use switch when comparing same var multiple times |
| Labeled break | `break Label` to exit loop from inside switch |
| Signature wrapping | All params on own lines + trailing comma |
| Param count | ≤4; beyond that, options struct |
| Pointer to interface | Almost never needed — pass interface value |
| Printf variants | End in `f`; use `%q` for strings in errors |
| File order | type → constructor → exported → unexported → utils |
| Unexport aggressively | Exporting is a commitment; unexport by default |

---

## Declarations

`var` signals intent: "this starts at zero." `:=` means "non-zero value here."

```go
var count int
var filtered []Order
name := "default"
var buf bytes.Buffer
```

Group related declarations; separate unrelated blocks:

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

Preallocate when size is known; never preallocate speculatively.

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

### Named booleans for complex conditions

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

Context first. ≤4 params; beyond that, use an options struct. Wrap when > ~120 chars:

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

Unexport by default — exporting is a commitment. Dot imports never in library code. Blank imports (`_ "pkg"`) only in `main` and test packages.

---

## Do not

- Use `interface{}` without a reason — default to `any`. Keep `interface{}`
  only where an external signature forces it (a callback like golang-jwt's
  `func(*jwt.Token) (interface{}, error)`) or the field is genuinely
  arbitrary JSON (e.g. a JSON-RPC param).
- Preallocate speculatively (`make([]T, 0, 1000)` when common case is 10 items).
- Add `else` after a returning `if`.
- Put 3+ boolean operands inline — extract to named vars.
- Pass pointer to interface.
- Return interface from constructor — return concrete type.
- Shadow built-in identifiers.
- Add `/* name */` comments to clarify params — fix the type instead.

## Verify

```sh
gofmt -l . && go vet ./... && golangci-lint run
```
