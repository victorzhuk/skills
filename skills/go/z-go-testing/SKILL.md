---
name: z-go-testing
description: Go testing patterns — table-driven tests, testify assert/require/mock/suite, parallelism, goleak, fuzzing, TDD baby steps. Use when writing, reviewing, or auditing Go tests, or fixing flaky, order-dependent, or over-asserting tests. Triggers on "table-driven", "t.Parallel", "testify", "goleak", "red-green-refactor". Database/HTTP harnesses are [[z-go-database]]; test-depth choice [[z-testing-strategy]].
---

# Go Testing

Assumes test depth is already decided — see [[z-testing-strategy]] for MVP vs regression mode and whether a change needs a BDD contract first.

## Structure

```
// same package — white-box access, the common default
package mypackage

// test package — public API only, when isolating the exported surface
package mypackage_test
```

Naming: `TestFoo`, `TestFoo_Method`, `BenchmarkFoo`, `ExampleFoo`, `FuzzFoo`.

## Table-driven tests

Always name cases; build the table incrementally in TDD — one case per cycle. Loop-variable capture (`tt := tt`) is unnecessary on Go 1.22+.

```go
func TestCalculatePrice(t *testing.T) {
    tests := []struct {
        name    string
        qty     int
        want    float64
        wantErr bool
    }{
        {name: "zero qty", qty: 0, want: 0},
        {name: "negative qty", qty: -1, wantErr: true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            got, err := CalculatePrice(tt.qty, 10)
            if tt.wantErr {
                require.Error(t, err)
                return
            }
            require.NoError(t, err)
            assert.Equal(t, tt.want, got)
        })
    }
}
```

Call `t.Parallel()` on the top-level when it shares no mutable global; add it to subtests only when they are truly independent.

`t.Context()` is the modernization target for new or touched test code — it cancels at cleanup and carries the test deadline. `context.Background()` is still the majority pattern by volume across most codebases; only a minority of repos favor `t.Context()` outright, typically ones with an in-flight Go-modernization effort under way. Its presence in untouched test files isn't itself a bug to fix opportunistically — migrate incrementally, not as a drive-by change.

## testify: assert vs require

`require` calls `t.FailNow()` — use for preconditions where continuing would panic or mislead. `assert` records failure and continues — use for independent verifications. Argument order: always `(expected, actual)`.

## testify: key assertions

```go
is.Equal(expected, actual)
is.ErrorIs(err, ErrNotFound)      // walks error chain
is.ErrorAs(err, &target)
is.ElementsMatch(want, got)       // unordered slice comparison
is.JSONEq(`{"a":1}`, body)
is.Eventually(func() bool { ... }, 5*time.Second, 100*time.Millisecond)
```

## Helpers and mocks

Mark helpers with `t.Helper()` so failures point at the call site.

Default to a hand-rolled fake struct that directly implements the interface being stubbed — a func field per method, set per test case:

```go
type fakeUserRepo struct {
    findFn func(ctx context.Context, id int64) (*User, error)
}

func (f *fakeUserRepo) Find(ctx context.Context, id int64) (*User, error) {
    return f.findFn(ctx, id)
}

func TestService_GetUser(t *testing.T) {
    repo := &fakeUserRepo{findFn: func(ctx context.Context, id int64) (*User, error) {
        return &User{Name: "alice"}, nil
    }}
    got, err := NewUserService(repo).GetUser(t.Context(), 42)
    require.NoError(t, err)
    assert.Equal(t, "alice", got.Name)
}
```

Reach for testify's `mock.Mock` when you specifically need `.On()`/expectation-matching semantics — call-count assertions, argument matchers, or verifying a call never happened. Embed `mock.Mock`, return values via `m.Called()`, always verify with `AssertExpectations(t)`. Matchers: `mock.Anything`, `mock.AnythingOfType("string")`, `mock.MatchedBy(func)`. Modifiers: `.Once()`, `.Times(n)`, `.Maybe()`.

```go
type MockUserRepo struct{ mock.Mock }

func (m *MockUserRepo) Find(ctx context.Context, id int64) (*User, error) {
    args := m.Called(ctx, id)
    return args.Get(0).(*User), args.Error(1)
}

repo := new(MockUserRepo)
repo.On("Find", mock.Anything, int64(42)).Return(&User{Name: "alice"}, nil)
repo.AssertExpectations(t)
```

## testify/suite

Optional, rarely needed here — `suite.Suite` (`SetupTest`/`TearDownTest` lifecycle) has no established usage in this codebase. Reach for it only if a test file needs shared per-test setup/teardown state that a table-driven test or a plain helper function can't express cleanly; otherwise skip it.

## Goroutine leaks and fuzzing

Detect leaks globally via `goleak.VerifyTestMain(m)` in `TestMain`, or per-test with `defer goleak.VerifyNone(t)`.

Fuzz with corpus seeds; the invariant goes inside `f.Fuzz`:

```go
func FuzzReverse(f *testing.F) {
    f.Add("hello")
    f.Fuzz(func(t *testing.T, s string) {
        require.Equal(t, s, Reverse(Reverse(s)))
    })
}
```

## Deterministic time (Go 1.25+)

Use `testing/synctest` when tests are flaky due to timing — time advances only when all goroutines block. Do not use the Go 1.24 `synctest.Run` API in 1.25+ code; use `synctest.Test` and `synctest.Wait` instead.

## TDD: red-green-refactor

Each cycle ≤ 2 minutes. If stuck, the step is too big — revert to last green.

1. **Red** — write one failing test (compilation failure counts)
2. **Green** — minimal code to pass (fake it: return a constant first)
3. **Refactor** — clean up while tests stay green

When faking to real, take the smallest jump: constant → variable → conditional → iteration.

**Slice vertically.** Grow a feature one tracer-bullet slice at a time — each
slice cuts through every layer (transport → use case → domain → repo) and is
independently demoable — rather than building a whole layer before the next. A
slice you can't cover with one end-to-end test is too wide; narrow it.

## Quick Reference

| Command | Purpose |
|---|---|
| `go test ./...` | all tests |
| `go test -run TestName/subtest ./...` | specific subtest |
| `go test -race ./...` | race detection |
| `go test -count=1 ./...` | disable test caching |
| `go test -tags=integration ./...` | integration build tag |
| `go test -bench=. -benchmem ./...` | benchmarks |
| `go test -fuzz=FuzzName ./...` | fuzzing |
| `go test -coverprofile=c.out ./... && go tool cover -html=c.out` | coverage |

## Do not

- Reach for `context.Background()` in new or touched test code — prefer `t.Context()` there; don't rewrite untouched tests as a drive-by migration.
- Add `t.Parallel()` to subtests that share a fixture or depend on order.
- Assert on whole structs when one field is the contract — assert the field.
- Use `assert` for guards where a nil dereference follows on failure — use `require`.
- Forget `AssertExpectations(t)` on mocks — unverified expectations silently pass.
- Use `is.Equal(ErrNotFound, err)` for wrapped errors — use `is.ErrorIs`.
- Add `//go:build test` tags unless the project explicitly builds with `-tags test`.
- Write comments restating what an assertion already says.

## Verify

```sh
go test -race ./...
```
