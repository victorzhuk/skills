---
name: z-go-testing
description: "Write Go tests with table cases, testify, parallel subtests, fuzzing, or synctest. Use [[z-testing-strategy]] to choose test depth and [[z-go-database]] for database fixtures."
---

# Go Testing

Use the agreed test depth and behavior contract. See [[z-testing-strategy]].

Use [[z-go-rapid]] for model-based action sequences and replay.

## Structure

```
// same package — white-box access, the common default
package mypackage

// test package — public API only, when isolating the exported surface
package mypackage_test
```

Naming: `TestFoo`, `TestFoo_Method`, `BenchmarkFoo`, `ExampleFoo`, `FuzzFoo`.

## Table-driven tests

Name each case. Add one case per TDD cycle. For a fixed contract, write all agreed cases in the red stage.

Go 1.22 language semantics give each iteration its own variables when declared with `:=`. Assignment with `=` still reuses variables. Check the owning module's Go version before removing `tt := tt`. See [[z-go-modernize]].

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

Use `t.Parallel()` only in independent tests. Isolate mutable nested slices, maps, and pointers before starting parallel subtests. See [[z-go-safety]].

Go 1.24 added `t.Context()`. The test cancels it before cleanup callbacks run. Derive a deadline explicitly when the operation needs one. Use cleanup to join workers after cancellation. [testing.T.Context](https://pkg.go.dev/testing#T.Context)

## testify: assert vs require

Testify is the house convention for these examples. Preserve the target repository's established assertion style.

Use `require` for a precondition. Use `assert` for an independent check. Pass the expected value first.

Call `require`, `t.FailNow`, `t.Fatal`, and `t.Fatalf` from the test goroutine. Return worker errors there, or call `t.Errorf` before exiting the worker. Wait for workers before the test ends.

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

Use a small fake when a function field can implement the dependency.

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

Use `mock.Mock` when behavior depends on a call count, a matched argument, or an omitted call. Set expectations with `On`. Retrieve return values with `Called`. Check the expectations after exercising the subject.

```go
type MockUserRepo struct{ mock.Mock }

func (m *MockUserRepo) Find(ctx context.Context, id int64) (*User, error) {
    args := m.Called(ctx, id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*User), args.Error(1)
}

repo := new(MockUserRepo)
repo.On("Find", mock.Anything, int64(42)).Return(&User{Name: "alice"}, nil)
got, err := NewUserService(repo).GetUser(t.Context(), 42)
require.NoError(t, err)
assert.Equal(t, "alice", got.Name)
repo.AssertExpectations(t)
```

## testify/suite

Use `suite.Suite` when tests need shared setup and teardown. Prefer a plain helper for a single fixture.

## Goroutine leaks and fuzzing

Use `goleak.VerifyTestMain(m)` for packages with parallel tests. Reserve `goleak.VerifyNone(t)` for serial tests with a known baseline. [goleak](https://github.com/uber-go/goleak)

Add seeds to the fuzz corpus. Assert the invariant inside `f.Fuzz`.

```go
func FuzzReverse(f *testing.F) {
    f.Add("hello")
    f.Fuzz(func(t *testing.T, s string) {
        require.Equal(t, s, Reverse(Reverse(s)))
    })
}
```

## Deterministic time (Go 1.25+)

Use `synctest.Test` for concurrent code that depends on Go timers. Fake time advances when every goroutine in the test bubble is durably blocked. External I/O can prevent this. Call `synctest.Wait` to wait for other bubble goroutines to block. The Go 1.24 experimental API used `synctest.Run`. [Package documentation](https://pkg.go.dev/testing/synctest)

## Red, green, refactor

1. Write a test that fails for the intended behavior. For sealed contract tests, require an assertion failure or the agreed stub panic.
2. Implement the smallest behavior that satisfies the test.
3. Refactor while the checks pass.

Keep each change independently testable through the required layers. When a sealed test fails unexpectedly, report it without changing the agreed contract.

## Quick Reference

Use the project wrapper or the caller's specified command. For standalone runs, bound elapsed time, each test binary, and both worker counts. Keep fixed bounds separate from selectors. See [[z-go-makefile]].

| Command | Purpose |
|---|---|
| `timeout 5m go test -parallel 4 -p 2 -timeout 2m ./...` | all tests |
| `timeout 5m go test -parallel 4 -p 2 -timeout 2m -run TestName/subtest ./...` | specific subtest |
| `timeout 5m go test -parallel 4 -p 2 -timeout 5m -race ./...` | detect races on exercised paths |
| `timeout 5m go test -parallel 4 -p 2 -race -timeout 5m -count=1 ./...` | run without cached test results |
| `timeout 15m go test -parallel 4 -p 2 -timeout 10m -tags=integration ./...` | integration build tag |
| `timeout 15m go test -parallel 4 -p 2 -timeout 10m -bench=. -benchmem ./...` | benchmarks |
| `timeout 15m go test -parallel 4 -p 2 -timeout 10m -fuzz=FuzzName -fuzztime 30s ./path/to/package` | fuzzing — `-fuzztime` or it never stops |
| `timeout 5m go test -parallel 4 -p 2 -timeout 5m -coverprofile=c.out ./... && go tool cover -html=c.out` | coverage |

## Do not

- Rewrite untouched tests solely to adopt `t.Context()`.
- Add `t.Parallel()` to subtests that share a fixture or depend on order.
- Assert on whole structs when one field is the contract — assert the field.
- Continue after a failed precondition when the next assertion would panic.
- Forget `AssertExpectations(t)` on mocks — unverified expectations silently pass.
- Use `is.Equal(ErrNotFound, err)` for wrapped errors — use `is.ErrorIs`.
- Add `//go:build test` tags unless the project explicitly builds with `-tags test`.
- Write comments restating what an assertion already says.

## Verification

```sh
timeout 5m go test -parallel 4 -p 2 -timeout 5m -race ./...
```

When the caller supplies a verification command, run it as specified. Retain its package scope and race settings.
