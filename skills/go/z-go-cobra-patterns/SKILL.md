---
name: z-go-cobra-patterns
description: "Build Go CLI command trees with Cobra. Use for RunE, flags, validation, hooks, completion, output, and command tests. See [[z-go-entrypoint]] for process lifecycle."
---

# Cobra Command Patterns

CLI packages translate flags and args into use case calls. No business logic
lives here.

## Package shape

Keep related commands in one package. Attach subcommands to the parent. Follow existing constructor and dependency conventions.

File split for a 3+ subcommand group, local flag structs, output helpers, package tests, and shared persistent flags: [references/command-layout.md](references/command-layout.md).

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

Export the group constructor when another package calls it. Keep internal subcommand constructors private.

## Provider interface — test-seam option

Define a small consumer interface when a test or runtime needs a substitute for the real dependency.

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

Avoid a provider interface that exposes dependencies the command never uses.

## Root command setup

Set `SilenceErrors` if `main` prints command errors. Use `SilenceUsage` when runtime failures should omit usage text.

## Hook chain

Choose error-returning hooks when setup or cleanup can fail. By default, a child's persistent hook replaces its ancestor's hook.

Check `cobra.EnableTraverseRunHooks` before calling parent hooks manually. With traversal enabled, Cobra executes hooks along the command path. [Cobra commands](https://cobra.dev/docs/how-to-guides/working-with-commands/)

## RunE pattern

In `RunE`, reject invalid inputs before invoking the use case. Write the result and return any error.

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

Declare argument validation with `Args`. Use built-in validators or a function matching `func(*cobra.Command, []string) error`.

## Flags

Bind flags to a command-owned options struct. Global flag state can leak between tests.

```go
rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file")
cmd.Flags().BoolVar(&opts.jsonOut, "json", false, "emit JSON")
cmd.MarkFlagRequired("id")
cmd.MarkFlagsMutuallyExclusive("json", "yaml")
```

## Output

Write results to `cmd.OutOrStdout()` and diagnostics to `cmd.ErrOrStderr()`. Preserve explicit output flags when selecting a default format.

## Shell completions

Implement `ValidArgsFunction` returning `([]string, cobra.ShellCompDirectiveNoFileComp)`. Use `RegisterFlagCompletionFunc` for flag values.

## Signal handling

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()
rootCmd.ExecuteContext(ctx)
```

## Testing commands

Create a fresh command tree per test. Set its arguments and output streams. Check stdout, stderr, and the returned error.

## Checks

```sh
go build ./... && timeout 5m go test -parallel 4 -p 2 -race -timeout 5m ./internal/cli/...
```

## Related skills

- [[z-go-clean-arch-di]] — provider interface placement, composition root, layer direction
- [[z-go-errors]] — error wrapping conventions, sentinel errors
- [[z-go-context]] — context propagation through command handlers
- [[z-go-env-v11]] — env-var config parsing
- [[z-go-testing]] — parallel tests, assertion discipline, test isolation
