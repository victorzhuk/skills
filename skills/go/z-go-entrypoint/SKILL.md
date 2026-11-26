---
name: z-go-entrypoint
description: "Design a testable Go main function. Use for process exit codes, flag parsing, signals, HTTP startup, and graceful shutdown. See [[z-go-cobra-patterns]] for command trees."
---

# Go Entrypoint

`main` reads the process and exits. `run` does the work and returns an error. Every
testable behavior lives in `run`.

## Thin `main`

Keep process exit and error reporting in `main`. Pass dependencies, arguments, and output streams to a testable function.

```go
// cmd/app/main.go
package main

import (
    "context"
    "fmt"
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

If the CLI specifies distinct exit codes, map errors in `main`. Preserve the published exit-code contract.

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

Parse flags before registering signals. Call `defer stop()` after successful registration. Construct and run the service with the signal context.

### HTTP server: timeouts + drain

Set inbound timeouts. Start a bounded drain on cancellation. The example returns a drain failure to its owner.

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

Stop accepting requests before draining handlers. Close dependencies after their last user exits.

Use a fresh bounded context for `Shutdown` after the signal context ends. A shutdown error can leave handlers running.

On timeout, apply the agreed policy for ordinary and hijacked connections. `Server.Close` does not join handlers.

Wait for all owned handlers to exit before reusing or releasing their dependencies.

## Flags

Create a `flag.FlagSet` with `flag.ContinueOnError`. Route diagnostics to the supplied error writer for testing.

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

Send program output to the injected stdout. Send diagnostics, usage, and the final error to the injected stderr.

## Do not

- `os.Exit` inside `run` or any package it calls — return an error instead.
- Read process streams or arguments directly inside `run`.
- Package-level `flag.Parse` — it reads the real process state and exits on error.
- Build the app in `main`, or store it in a package-level var for later reuse.
- Call `main` in a unit test. Test `run` with explicit arguments and writers.
- Treat `TestMain(m *testing.M)` as a `main()` test — it is a per-test-binary
  setup hook that calls `m.Run()`, unrelated to entrypoint shape.
- Register signals without `defer stop()` — the goroutine outlives the run.

## Verify

```sh
go build ./... && timeout 5m go test -p 2 -parallel 4 -timeout 2m ./cmd/...
```

## Related skills

- [[z-go-cobra-patterns]] — command trees built on top of this split
- [[z-go-clean-arch-di]] — constructor placement and layer direction
- [[z-go-context]] — cancellation and deadline propagation
- [[z-go-errors]] — wrapping, sentinels, `errors.Is` on shutdown
- [[z-go-testing]] — table tests, parallelism, goleak
- [[z-go-observability]] — logging and metrics setup inside `run`
