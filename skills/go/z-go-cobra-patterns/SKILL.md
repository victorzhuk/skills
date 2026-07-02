---
name: z-go-cobra-patterns
description: >
  Cobra command-tree patterns for Go CLIs — command/subcommand shape, RunE vs
  Run, PersistentPreRunE hook chain, args validators, flag binding, provider
  interfaces, JSON/human output, shell completions, testing, and signal
  handling. Use when adding or changing Cobra commands, flags, RunE handlers,
  option structs, provider interfaces, JSON/human output, or command error
  wrapping; also when reviewing a command package for anti-patterns
  (package-level mutable state, business logic in RunE, len(args) in RunE).
  Triggers on "cobra.Command", "RunE", "PersistentPreRunE", "SilenceUsage",
  "AddCommand", "MatchAll", "ValidArgsFunction", "cmd.OutOrStdout".
  Does not cover HTTP middleware, transport-layer routing, or context
  propagation; see [[z-go-context]]. Does not cover Viper config layering
  (flag → env → file → default precedence); see [[z-go-env-v11]].
---

# Cobra Command Patterns

CLI packages translate flags and args into use case calls. No business logic
lives here.

## Package shape

One package per command group under `internal/cli/<group>/`: `root.go` (parent, attaches subcommands), one file per subcommand. Subcommands import the adapter/usecase packages they need directly and construct them inline — no provider interface, no injected dependency struct.

## Command constructor

```go
func NewCmd() *cobra.Command {
    cmd := &cobra.Command{Use: "customers"}
    cmd.AddCommand(newListCmd(), newShowCmd(), newCreateCmd())
    return cmd
}

func newShowCmd() *cobra.Command {
    return &cobra.Command{
        Use:   "show <id>",
        Args:  cobra.ExactArgs(1),
        RunE: func(cmd *cobra.Command, args []string) error {
            uc := usecase.NewCustomerUseCase(repository.NewCustomerRepo())
            c, err := uc.FindByID(cmd.Context(), args[0])
            if err != nil {
                cmd.SilenceUsage = true
                return fmt.Errorf("find customer: %w", err)
            }
            return writeCustomer(cmd.OutOrStdout(), c)
        },
    }
}
```

`NewCmd` public; subcommand constructors private. This direct-import wiring is the default — no `contract.go`, no provider interface, no injected dependency.

## Provider interface — test-seam option

Add a narrow provider interface only when a command needs a fake to stand in for an expensive or flaky real dependency in tests. Define it in the command package (consumer side), not in the use-case layer:

```go
type CustomerProvider interface {
    Customers() usecase.CustomerUseCase
}

func NewCmd(p CustomerProvider) *cobra.Command {
    cmd := &cobra.Command{Use: "customers"}
    cmd.AddCommand(newListCmd(p), newShowCmd(p), newCreateCmd(p))
    return cmd
}
```

Reach for this only once a real test needs the seam — most command groups never do.

## Root command setup

Always set `SilenceUsage: true` (no usage wall on runtime errors) and `SilenceErrors: true` (let `main` format) on root.

## Hook chain

Order: `PersistentPreRunE → PreRunE → RunE → PostRunE → PersistentPostRunE`. Always use `*E` variants. `PersistentPreRunE` on root runs before every subcommand. A child `PersistentPreRunE` **replaces** the parent's — call it explicitly if you need both.

## RunE pattern

`RunE`: read args/flags → call use case → render → return wrapped error. Delegate to a named `runX` function.

```go
func newShowCmd() *cobra.Command {
    opts := &showOpts{}
    cmd := &cobra.Command{Use: "show <id>", Args: cobra.ExactArgs(1),
        RunE: func(cmd *cobra.Command, args []string) error {
            return runShow(cmd, args, opts)
        },
    }
    cmd.Flags().BoolVar(&opts.jsonOut, "json", false, "emit JSON")
    return cmd
}

func runShow(cmd *cobra.Command, args []string, opts *showOpts) error {
    uc := usecase.NewCustomerUseCase(repository.NewCustomerRepo())
    c, err := uc.FindByID(cmd.Context(), args[0])
    if err != nil {
        cmd.SilenceUsage = true
        return fmt.Errorf("find customer: %w", err)
    }
    if opts.jsonOut {
        return writeCustomerJSON(cmd.OutOrStdout(), c)
    }
    writeCustomerHuman(cmd.OutOrStdout(), c)
    return nil
}
```

With the provider test-seam (above), `runShow` takes a `CustomerProvider` parameter and calls `p.Customers().FindByID(...)` instead of constructing the use case itself.

## Args validators

Declare `Args` on the command — never `len(args)` in `RunE`. Builtins: `NoArgs`, `ExactArgs(n)`, `MinimumNArgs(n)`, `MaximumNArgs(n)`, `RangeArgs(min,max)`, `OnlyValidArgs`, `MatchAll(v1,v2,...)`. Custom: `func(cmd *cobra.Command, args []string) error`.

## Flags

Private options struct per command (`type showOpts struct { jsonOut bool }`). Never package-level mutable vars — breaks concurrent tests.

```go
rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file")
cmd.Flags().BoolVar(&opts.jsonOut, "json", false, "emit JSON")
cmd.MarkFlagRequired("id")
cmd.MarkFlagsMutuallyExclusive("json", "yaml")
```

## Output

Always write via `cmd.OutOrStdout()` / `cmd.ErrOrStderr()` — tests can't redirect `os.Stdout`. Split renderers: `writeCustomerJSON(w, c)` and `writeCustomerHuman(w, c)`. Detect TTY: `(fi.Mode() & os.ModeCharDevice) == 0` → piped → default JSON. Diagnostics to stderr; program output to stdout.

## Shell completions

Implement `ValidArgsFunction` returning `([]string, cobra.ShellCompDirectiveNoFileComp)`. Use `RegisterFlagCompletionFunc` for flag values.

## Signal handling

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()
rootCmd.ExecuteContext(ctx)
```

## Testing commands

Fresh command tree per test — Cobra accumulates flag state across `Execute()` calls. Call `root.SetOut(buf)` + `root.SetArgs(...)`, then `root.Execute()`. With direct-import wiring, fake at the use case or repository the command constructs; with the provider test-seam, wire a `fakeProvider` instead.

## Quick Reference

| Pattern | Rule |
|---|---|
| Package per group | `internal/cli/<group>/` + `root.go`; direct imports by default |
| Provider interface | Test-seam only, consumer-side, narrow |
| Constructors | `NewCmd()` public, `new<Sub>Cmd` private |
| Root | `SilenceUsage: true`, `SilenceErrors: true` |
| Hook chain | PersistentPreRunE replaces parent — call explicitly |
| `RunE` shape | parse → call → render → return; delegate to `runX` |
| Args | builtins / `MatchAll`; never `len(args)` in RunE |
| Flags | Private options struct |
| Output | `cmd.OutOrStdout()`; JSON + human split |
| Error wrapping | `"<verb> <noun>: %w"`, lowercase |
| Exit codes | 0 success · 1 runtime · 2 usage; never `os.Exit` in RunE |
| Testing | Fresh tree per test; `SetOut`/`SetArgs` |
| Signal | `signal.NotifyContext` → `ExecuteContext` |

## Do not

Never `Run` (can't return errors), `len(args)` in RunE, `os.Stdout`/`os.Stderr` directly, package-level flag vars, reuse a command across tests, `os.Exit` in RunE, or business logic in RunE.

## Verify

```sh
go build ./... && go test -race ./internal/cli/...
```

## Related skills

- [[z-go-clean-arch-di]] — provider interface placement, composition root, layer direction
- [[z-go-errors]] — error wrapping conventions, sentinel errors
- [[z-go-context]] — context propagation through command handlers
- [[z-go-env-v11]] — Viper-free env config layering
- [[z-go-testing]] — parallel tests, assertion discipline, test isolation
