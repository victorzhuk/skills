---
name: z-go-feature-flags
description: "Evaluate feature flags in Go services. Use for typed keys, environment overrides, provider failures, per-user variants, and flag retirement. Preserve authorization checks independently."
---

# Feature flags in Go

## Flag type and constants

Define a named string type and a constant for each flag.

```go
type Flag string

const (
    FlagDarkModeEnabled    Flag = "dark_mode_enabled"
    FlagNewCheckoutEnabled Flag = "new_checkout_enabled"
)
```

Keep the constants with the code that owns the flags.

## Evaluator interface

Define the evaluator at the consumer boundary. Implement it in the provider adapter.

```go
type Evaluator interface {
    IsEnabled(ctx context.Context, f Flag, userID uuid.UUID) bool
    Variant(ctx context.Context, f Flag, userID uuid.UUID) string
}
```

Use `IsEnabled` for a boolean gate. Use `Variant` for a named treatment. The empty string means no treatment.

The adapter records failures and returns the configured fallback. Return an error separately when callers must distinguish failure from a valid value.

## Layered evaluation

Evaluate each flag in this order.

1. Check the environment override. An explicit `false` disables the flag.
2. Query the configured provider with the caller's deadline and targeting data.
3. Return the per-flag default if the provider is absent or fails. Reject a missing default during startup.

```go
type compositeEvaluator struct {
    env      envEvaluator
    provider Evaluator // nil when not configured
    fallback map[Flag]bool
}

func (e *compositeEvaluator) IsEnabled(ctx context.Context, f Flag, userID uuid.UUID) bool {
    if v, ok := e.env.lookup(f); ok {
        return v
    }
    if e.provider != nil {
        return e.provider.IsEnabled(ctx, f, userID)
    }
    return e.fallback[f]
}

func (e *compositeEvaluator) Variant(ctx context.Context, f Flag, userID uuid.UUID) string {
    if enabled, set := e.env.lookup(f); set && !enabled {
        return ""
    }
    if e.provider != nil {
        return e.provider.Variant(ctx, f, userID)
    }
    return ""
}
```

Return an empty variant for a disabled flag. An explicit `true` permits provider selection. An absent override passes control to the provider.

### Env kill-switch convention

Derive the key from the flag string — `FLAG_<UPPER_SNAKE>_ENABLED`:

```
flag:    "new_checkout_enabled"
env key: FLAG_NEW_CHECKOUT_ENABLED
```

Document every flag in `.env.example` as a commented-out line:

```
# FLAG_NEW_CHECKOUT_ENABLED=false
```

Set a default for each flag according to its effect during an outage.

## Fail-open vs fail-closed

| Flag class | Recommended default | Rationale |
|---|---|---|
| UX or product feature | Explicit per-flag default | Preserve established behavior until a rollout starts |
| Safety gate / kill switch | **fail-closed** (`false`) | Unknown state must not permit the risky path |
| Paywall display | Product-defined | Keep access and payment authorization independent of display flags |
| Billing/payment **charge path** (the money-moving decision) | **fail-closed** (`false`) | Unknown state must never authorize a charge |

A flag can change the purchase button without authorizing the charge. Enforce authorization in the payment path.

### Provider implementation

- Prefer the SDK's local definition cache. Include tenant, user, and other targeting fields in any result-cache key.
- Pass the deadline to the SDK. If the SDK cannot cancel, bound admission and give workers an owner. See [[z-go-concurrency]].
- Record provider failures separately from successful evaluations. Exclude user IDs from metric labels.

[Evaluation context](https://openfeature.dev/specification/sections/evaluation-context/) is part of the evaluation input, not optional cache metadata.

## Global vs per-user flags

| Scope | Evaluated per | Surfaced via |
|---|---|---|
| Platform / global | All users share one value | Static config payload evaluated at startup or request time with no user context |
| Per-user / targeted | Each user ID independently | Per-request identity payload (e.g. a `/me` response) evaluated with the real user ID |

Check how the provider represents global evaluation. A zero UUID can identify a user to a provider.

For the per-request identity payload, iterate the known per-user flags at handler time:

```go
features := make(map[string]bool, len(perUserFlags))
for _, f := range perUserFlags {
    features[string(f)] = evaluator.IsEnabled(ctx, f, userID)
}
```

Document each flag in the registry. Include every targeted flag in the response that exposes per-user decisions.

## Injecting Evaluator into use cases

```go
type CheckoutUseCase struct {
    flags   feature.Evaluator
}

func (uc *CheckoutUseCase) Execute(ctx context.Context, userID uuid.UUID) error {
    if !uc.flags.IsEnabled(ctx, feature.FlagNewCheckoutEnabled, userID) {
        return ErrFeatureDisabled
    }
    // …
}
```

Read local-only settings through the configuration seam.

## Tests — fake evaluator

```go
type mapEvaluator map[Flag]bool

func (m mapEvaluator) IsEnabled(_ context.Context, f Flag, _ uuid.UUID) bool {
    if v, ok := m[f]; ok {
        return v
    }
    return false // tests opt into enabled behavior explicitly
}

func (m mapEvaluator) Variant(_ context.Context, _ Flag, _ uuid.UUID) string {
    return ""
}
```

Add a separate fake for variant values if the caller uses them.

```go
flags := mapEvaluator{feature.FlagNewCheckoutEnabled: false}
uc := NewCheckoutUseCase(flags)
```

Use the map fake for use-case tests. Exercise the real adapter with a failing provider to prove the outage policy. Inject an environment lookup for tests that run in parallel.

## Checks

```sh
go build ./... && timeout 5m go test -parallel 4 -p 2 -short -timeout 2m ./...
```

Test two users with different treatments. Disable the flag locally and check both evaluation methods. Test cancellation and enforce the provider concurrency limit. Remove the registry entry, override, and evaluation code after rollout.
