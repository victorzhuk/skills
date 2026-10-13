---
name: z-go-feature-flags
description: Feature flag lifecycle in a Go service — typed flag constants, a layered Evaluator (env kill-switch → remote provider → default), fail-open/fail-closed semantics, a fake evaluator for tests. Use when adding a kill switch or gating a feature on a remote provider (PostHog, LaunchDarkly, OpenFeature). Triggers on "feature flag", "kill switch", "IsEnabled", "Evaluator". Env parsing — [[z-go-env-v11]].
---

# Feature flags in Go

## Flag type and constants

Define flags as a typed string constant in your domain or feature package — never raw strings at call sites:

```go
type Flag string

const (
    FlagDarkModeEnabled    Flag = "dark_mode_enabled"
    FlagNewCheckoutEnabled Flag = "new_checkout_enabled"
)
```

Keep all flag constants in one file so adding a flag is a single-location diff.

## Evaluator interface

The interface lives at the domain boundary — use cases depend on it, infra implements it:

```go
type Evaluator interface {
    IsEnabled(ctx context.Context, f Flag, userID uuid.UUID) bool
    Variant(ctx context.Context, f Flag, userID uuid.UUID) string
}
```

`Variant` is for multivariate flags backed by an experimentation provider
(PostHog and similar support this natively) — it returns the assigned variant
key (`"control"`, `"treatment-a"`) or `""` when the flag is unset or
boolean-only. Use `IsEnabled` for on/off gates, `Variant` once a flag has more
than two states.

This interface uses an explicit fallback contract: implementations record failures and return the selected flag default. Preserve a project interface that returns errors when callers need to distinguish failure from a valid value; either design still needs a deadline.

## Layered evaluation

Apply layers in priority order:

1. **Env kill-switch** — an explicit env var (`FLAG_<NAME>_ENABLED=false`) overrides everything. Lets the operator disable a flag without touching the remote provider.
2. **Remote provider** — PostHog, LaunchDarkly, OpenFeature, or a home-grown API supplies the evaluated value when configured.
3. **Default** — returned when the env var is absent *and* the provider is unreachable or unconfigured.

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

`Variant` returns `""` when explicitly disabled. Callers must treat an empty variant as disabled, not substitute an enabled treatment. An env value of true permits provider selection; it does not invent a variant.

`envEvaluator.lookup` returns `(false, false)` when the var is absent — so an unset env var passes control to the next layer.

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

Choose an explicit fallback per flag. New rollouts and safety gates normally default to disabled. Retain enabled behavior only when availability requirements justify it; do not share one implicit default across unrelated flags.

## Fail-open vs fail-closed

| Flag class | Recommended default | Rationale |
|---|---|---|
| UX / product feature | Explicit per-flag default | Preserve established behavior; keep unlaunched treatments disabled |
| Safety gate / kill switch | **fail-closed** (`false`) | Unknown state must not permit the risky path |
| Billing/payment **gate** (paywall UI visibility) | **fail-open** (`true`) | The flag only decides what the UI shows; a provider outage shouldn't lock out paying users |
| Billing/payment **charge path** (the money-moving decision) | **fail-closed** (`false`) | Unknown state must never authorize a charge |

A single flag can look like it covers both without you noticing: showing an
upgrade button is a *gate*; actually calling the payment provider to move
money is the *charge path*. Pick fail-open or fail-closed by which one the
flag controls, not by the word "billing" in its name.

### Provider implementation

Keep provider evaluation bounded and preserve targeting:

- Cache evaluated results by flag plus every relevant identity/context field, including tenant and user. Prefer the SDK's local flag-definition cache when available; never share a targeted result under the flag name alone.
- Use a context-aware SDK/transport with a deadline inherited from the caller. Do not wrap an uncancellable call in a new goroutine per request: timing out the caller leaves that work running. If unavoidable, use bounded admission and an owned worker lifecycle; see [[z-go-concurrency]].
- Return the flag's explicit fallback on provider failure; do not cache a transient failure as a successful evaluation. Count outcomes with bounded flag/outcome labels and avoid user identifiers in metrics.
- Test opposing users, env-disabled variants, caller cancellation, and a stalled provider. Verify in-flight work stays bounded.

[Evaluation context](https://openfeature.dev/specification/sections/evaluation-context/) is part of the evaluation input, not optional cache metadata.

## Global vs per-user flags

| Scope | Evaluated per | Surfaced via |
|---|---|---|
| Platform / global | All users share one value | Static config payload evaluated at startup or request time with no user context |
| Per-user / targeted | Each user ID independently | Per-request identity payload (e.g. a `/me` response) evaluated with the real user ID |

The env adapter ignores user identity. Before passing `uuid.Nil` for a global flag, verify how the selected provider interprets it; a zero UUID does not inherently mean non-targeted evaluation.

For the per-request identity payload, iterate the known per-user flags at handler time:

```go
features := make(map[string]bool, len(perUserFlags))
for _, f := range perUserFlags {
    features[string(f)] = evaluator.IsEnabled(ctx, f, userID)
}
```

Keep two explicit lists in the feature package: one for all flags (drives env-key documentation and diagnostics), one for per-user flags (drives the identity payload). Omitting a targeted flag from the per-user list is a silent partial bug: the kill-switch still works, but the client never receives the evaluated value.

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

Platform handlers that build a static config struct read the env var directly via the service's `getenv` seam — the remote provider adds no value for a flag that is the same for every user.

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

Most tests only need `IsEnabled`; if a test needs a specific variant, add a
`variantEvaluator map[Flag]string` fake rather than overloading `mapEvaluator`.

Usage:

```go
flags := mapEvaluator{feature.FlagNewCheckoutEnabled: false}
uc := NewCheckoutUseCase(flags)
```

Pass `mapEvaluator(nil)` to disable all flags. To assert behavior under provider outage, either pass explicit values or implement a separate `errorEvaluator` that always returns `fallback`.

Do not use `os.Setenv` in tests to control flags — it is global state and introduces order-dependent failures.

## Checklist

- [ ] `Flag` const added and documented in `.env.example` as `# FLAG_<NAME>_ENABLED=false`
- [ ] Added to the all-flags registry (env-key docs, diagnostics)
- [ ] Added to the per-user flags list if targeted
- [ ] `Evaluator` interface injected; `IsEnabled` called with the correct user ID
- [ ] Multivariate callers treat an empty `Variant` as disabled; env kill-switch tests cover this path
- [ ] Fail-open/fail-closed default is intentional; fail-closed default has a WHY comment
- [ ] Billing/payment flags: fail-open/fail-closed matches whether the flag controls a gate or a charge path
- [ ] Tests use the fake evaluator, not `os.Setenv`

## Verify

```sh
go build ./... && timeout 5m go test -parallel 4 -p 2 -short -timeout 2m ./...
```
