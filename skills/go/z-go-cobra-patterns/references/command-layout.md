# Cobra Command Layout

## Multi-Subcommand Package

When a command group has 3+ subcommands with distinct flags, split by file:

```text
<cli>/orders/
├── orders.go       # parent command, no flags
├── contract.go     # OrdersProvider interface
├── list.go         # list subcommand + listOpts
├── show.go         # show subcommand + showOpts
├── create.go       # create subcommand + createOpts
└── cancel.go       # cancel subcommand + cancelOpts
```

The parent function wires subcommands and defines shared persistent flags:

```go
func New(provider OrdersProvider) *cobra.Command {
    cmd := &cobra.Command{
        Use:   "orders",
        Short: "Manage orders",
    }
    cmd.AddCommand(newList(provider))
    cmd.AddCommand(newShow(provider))
    cmd.AddCommand(newCreate(provider))
    return cmd
}
```

## Subcommand With Local Flags

Bind flags to the subcommand, store in the local `opts` struct:

```go
func newCreate(provider OrdersProvider) *cobra.Command {
    opts := &createOpts{}
    cmd := &cobra.Command{
        Use:   "create",
        Short: "Create a new order",
        Args:  cobra.ExactArgs(1),
        RunE: func(cmd *cobra.Command, args []string) error {
            return runCreate(cmd, args, provider, opts)
        },
    }
    cmd.Flags().StringVarP(&opts.customer, "customer", "c", "", "customer ID")
    cmd.Flags().BoolVar(&opts.jsonOut, "json", false, "output JSON")
    _ = cmd.MarkFlagRequired("customer")
    return cmd
}
```

## Output Functions

Split output helpers from the handler function:

```go
func runList(cmd *cobra.Command, _ []string, provider OrdersProvider, opts *listOpts) error {
    orders, err := provider.Orders().List(cmd.Context(), usecase.ListOrdersReq{Limit: opts.limit})
    if err != nil {
        cmd.SilenceUsage = true
        return fmt.Errorf("list orders: %w", err)
    }
    if opts.jsonOut {
        return writeOrdersJSON(cmd.OutOrStdout(), orders)
    }
    writeOrdersHuman(cmd.OutOrStdout(), orders)
    return nil
}

func writeOrdersJSON(w io.Writer, orders []domain.Order) error {
    return json.NewEncoder(w).Encode(orders)
}

func writeOrdersHuman(w io.Writer, orders []domain.Order) {
    for _, o := range orders {
        fmt.Fprintf(w, "%s\t%s\t%s\n", o.ID, o.Status, o.CreatedAt.Format(time.RFC3339))
    }
}
```

## Testing Command Packages

Test via `cmd.Execute()` using `SetArgs` and `SetOut`:

```go
func TestRunShow(t *testing.T) {
    provider := &fakeProvider{user: &domain.User{ID: "u1", Name: "Alice"}}
    cmd := New(provider)
    var buf bytes.Buffer
    cmd.SetOut(&buf)
    cmd.SetArgs([]string{"show", "u1"})

    err := cmd.Execute()
    require.NoError(t, err)
    assert.Contains(t, buf.String(), "Alice")
}
```

Use a hand-written stub (not a mock framework) for the provider interface — the interface is narrow enough that a few lines of struct suffice.

## Shared Persistent Flags

For flags shared across all subcommands in a group, use persistent flags on the parent:

```go
var outputDir string
cmd.PersistentFlags().StringVarP(&outputDir, "output", "o", ".", "output directory")
```

Avoid persistent flags that mutate package-level state — they prevent parallel test execution.
