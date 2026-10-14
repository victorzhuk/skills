---
name: z-go-entrypoint
description: Split Go entrypoints into a thin `main` driver and a testable `run` harness. Pass `os.Args[1:]`, stdout/stderr, and context explicitly; return errors instead of `os.Exit`; use `flag.NewFlagSet` with `flag.ContinueOnError`; wire `signal.NotifyContext`; construct dependencies explicitly. Use when writing or reviewing `func main`, `cmd/` packages, CLI startup, or service bootstrap. Does not cover cobra command trees ([[z-go-cobra-patterns]]), wiring layers ([[z-go-clean-arch-di]]), or test mechanics ([[z-go-testing]]).
---

# Go Entrypoint

`main` reads the process and exits. `run` does the work and returns an error. Every
testable behavior lives in `run`.

## Thin `main`

Five statements, no logic. It owns the only `os.Exit` in the call graph.

```go
// cmd/app/main.go
package main

import (
    "context"
    "fmt"
    "io"
    "os"
)

func main() {
    ctx := context.Background()
    if err := run(ctx, os.Args[1:], os.Stdout, os.Stderr); err != nil {
        fmt.Fprintln(os.Stderr, err)
        os.Exit(1)
    }
}
```

Map other failures to distinct codes here (`flag` errors and `context.Canceled`
→ 2 and 130) — nothing below `main` can exit.

## Testable `run`

```go
// cmd/app/run.go
package main

import (
    "context"
    "errors"
    "flag"
    "fmt"
    "io"
    "net/http"
    "os"
    "os/signal"
    "syscall"

    "example.com/app/internal/app"
)

type config struct {
    addr    string
    jsonOut bool
}

func run(ctx context.Context, args []string, stdout, stderr io.Writer) error {
    cfg, rest, err := parseArgs(args, stderr)
    if err != nil {
        return err
    }
    if len(rest) > 0 {
        return fmt.Errorf("unexpected arguments: %v", rest)
    }

    ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
    defer stop()

    a, err := app.New(app.Config{Addr: cfg.addr}, stdout, stderr)
    if err != nil {
        return fmt.Errorf("construct app: %w", err)
    }

    if err := a.Serve(ctx); err != nil && !errors.Is(err, http.ErrServerClosed) {
        return fmt.Errorf("serve: %w", err)
    }
    return nil
}
```

Order is fixed: parse → cancel on signal → construct → run. Parsing before the
signal context keeps a bad flag from installing a handler; `defer stop()`
releases the channel registration so the binary can exit promptly.

### HTTP server: timeouts + drain

Inside `run`, build the server with inbound timeouts and drain it on cancel:

```go
srv := &http.Server{
    Addr:              cfg.addr,
    Handler:           handler,
    ReadHeaderTimeout: 5 * time.Second,
    ReadTimeout:       10 * time.Second,
    WriteTimeout:      15 * time.Second,
    IdleTimeout:       60 * time.Second,
    MaxHeaderBytes:    1 << 20,
}

errCh := make(chan error, 1)
go func() {
    if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
        errCh <- err
    }
}()

select {
case <-ctx.Done():
case err := <-errCh:
    return fmt.Errorf("serve: %w", err)
}

shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
if err := srv.Shutdown(shutdownCtx); err != nil {
    return fmt.Errorf("shutdown: %w", err)
}
```

Shutdown order is fixed: stop accepting → drain in-flight requests → close
dependencies. The signal context from `signal.NotifyContext` above is the only
trigger; no new dependencies.

## Flags

`flag.NewFlagSet` with `ContinueOnError` and output bound to the injected stderr —
the default writes to `os.Stderr`, which a test cannot capture.

```go
func parseArgs(args []string, stderr io.Writer) (*config, []string, error) {
    cfg := &config{}
    fs := flag.NewFlagSet("app", flag.ContinueOnError)
    fs.SetOutput(stderr)
    fs.StringVar(&cfg.addr, "addr", ":8080", "listen address")
    fs.BoolVar(&cfg.jsonOut, "json", false, "emit JSON")
    if err := fs.Parse(args); err != nil {
        return nil, nil, err
    }
    return cfg, fs.Args(), nil // positional args validated here
}
```

`flag.ExitOnError` calls `os.Exit(2)` on a bad flag: it kills the test binary.
`--help` writes usage to stderr and returns `flag.ErrHelp` — return it as-is and
let `main` choose the exit code.

## Construction

Build the app in `run` through a domain constructor (`newApp`, `app.New`), not
by opening connections in `main`. The constructor takes explicit config and
streams, returns an error instead of panicking, and registers nothing globally.

## Signals

`signal.NotifyContext` derives from the ctx passed in, so a test deadline still
applies and `signal.Stop` runs on return. Register `os.Interrupt` and
`syscall.SIGTERM` — the second is what a container runtime sends on stop.

## Output

Write to the injected `stdout`/`stderr`. Program output goes to stdout;
diagnostics, usage, and the top-level error message go to stderr. Splitting them
keeps `app --json | jq` clean.

## Quick Reference

| Element | Rule |
|---|---|
| `main` | thin; passes args, streams, ctx; owns `os.Exit` |
| `run` | `run(ctx, args []string, stdout, stderr io.Writer) error` |
| Flags | `flag.NewFlagSet(name, flag.ContinueOnError)`, `SetOutput(stderr)` |
| Positional args | validated after `fs.Parse` |
| Signals | `signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)` + `defer stop()` |
| Construction | `newApp(cfg, stdout, stderr) (app, error)` inside `run` |
| Streams | injected `io.Writer`, never `os.Stdout`/`os.Stderr` below `main` |
| Errors | wrap with `%w`; return up; `main` prints and exits |
| Server timeouts | `ReadHeaderTimeout`/`ReadTimeout`/`WriteTimeout`/`IdleTimeout` + `MaxHeaderBytes` at construction |
| Shutdown | `srv.Shutdown` with a bounded context; stop accepting → drain → close deps |
| Testing | call `run` with `[]string` and `bytes.Buffer` |

## Do not

- `os.Exit` inside `run` or any package it calls — return an error instead.
- Read `os.Args`, `os.Stdout`, or `os.Stderr` inside `run`; they are parameters.
- Package-level `flag.Parse` — it reads the real process state and exits on error.
- Build the app in `main`, or store it in a package-level var for later reuse.
- Unit-test `main()` directly — it exits the test runner; test `run` instead.
- Mutate `os.Args` in a test to drive behavior; pass args to `run`.
- Treat `TestMain(m *testing.M)` as a `main()` test — it is a per-test-binary
  setup hook that calls `m.Run()`, unrelated to entrypoint shape.
- Register signals without `defer stop()` — the goroutine outlives the run.

## Verify

```sh
go build ./... && timeout 5m go test -timeout 2m ./cmd/...
```

## Related skills

- [[z-go-cobra-patterns]] — command trees built on top of this split
- [[z-go-clean-arch-di]] — constructor placement and layer direction
- [[z-go-context]] — cancellation and deadline propagation
- [[z-go-errors]] — wrapping, sentinels, `errors.Is` on shutdown
- [[z-go-testing]] — table tests, parallelism, goleak
- [[z-go-observability]] — logging and metrics setup inside `run`