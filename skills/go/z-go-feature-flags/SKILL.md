---
name: z-go-feature-flags
description: >
  Feature flag lifecycle in a Go service — typed flag constants, a layered
  Evaluator (env kill-switch → remote provider → default), global vs per-user
  flag surfacing, fail-open/fail-closed semantics, and a fake evaluator for
  deterministic tests. Use when adding a kill switch, gating a feature on a
  remote provider (PostHog, LaunchDarkly, OpenFeature, …), calling IsEnabled
  in a use case or handler, or writing a test that controls flags. Triggers on
  "feature flag", "kill switch", "IsEnabled", "Evaluator", "per-user flag",
  "fail-open". Does not cover env parsing mechanics; see [[z-go-env-v11]].
  See also: [[z-go-env-v11]], [[z-go-clean-arch-di]].
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

No error return on either method: flag evaluation must never block the happy path. Log or record the failure inside the implementation, then fall back to the default. Callers must not branch on an error.

## Layered evaluation

Apply layers in priority order:

1. **Env kill-switch** — an explicit env var (`FLAG_<NAME>_ENABLED=false`) overrides everything. Lets the operator disable a flag without touching the remote provider.
2. **Remote provider** — PostHog, LaunchDarkly, OpenFeature, or a home-grown API supplies the evaluated value when configured.
3. **Default** — returned when the env var is absent *and* the provider is unreachable or unconfigured.

```go
type compositeEvaluator struct {
    env      envEvaluator
    provider Evaluator // nil when not configured
    fallback bool
}

func (e *compositeEvaluator) IsEnabled(ctx context.Context, f Flag, userID uuid.UUID) bool {
    if v, ok := e.env.lookup(f); ok {
        return v
    }
    if e.provider != nil {
        return e.provider.IsEnabled(ctx, f, userID)
    }
    return e.fallback
}

func (e *compositeEvaluator) Variant(ctx context.Context, f Flag, userID uuid.UUID) string {
    if e.provider != nil {
        return e.provider.Variant(ctx, f, userID)
    }
    return ""
}
```

The env kill-switch only carries booleans, so `Variant` skips straight to the provider — a flag disabled at the env layer still needs its `IsEnabled` check in the caller; `Variant` alone won't see that override.

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

Default for env-absent is **enabled** (`true`) for ordinary feature flags — so an operator opt-out is explicit. For kill switches guarding risky paths, default to **disabled** so a misconfigured deploy is safe.

## Fail-open vs fail-closed

| Flag class | Recommended default | Rationale |
|---|---|---|
| UX / product feature | **fail-open** (`true`) | Provider outage should not degrade the product |
| Safety gate / kill switch | **fail-closed** (`false`) | Unknown state must not permit the risky path |
| Billing/payment **gate** (paywall UI visibility) | **fail-open** (`true`) | The flag only decides what the UI shows; a provider outage shouldn't lock out paying users |
| Billing/payment **charge path** (the money-moving decision) | **fail-closed** (`false`) | Unknown state must never authorize a charge |

A single flag can look like it covers both without you noticing: showing an
upgrade button is a *gate*; actually calling the payment provider to move
money is the *charge path*. Pick fail-open or fail-closed by which one the
flag controls, not by the word "billing" in its name.

### Provider implementation

The provider implementation must return quickly and never block the request
on a slow eval. The real recipe:

- **Per-key TTL cache** — cache the evaluated value (and variant) per flag for
  a short window (seconds, not hours) so a hot path doesn't call the SDK on
  every request.
- **Goroutine-bounded timeout** — when the SDK's eval call takes no `ctx`
  (many provider SDKs don't), race it against `time.After` in a `select`
  rather than letting it block indefinitely.
- **Prometheus counter for eval outcomes** — a `flag_eval_total{flag,outcome}`
  counter (`hit`/`timeout`/`error`) turns a silent fallback into something
  alertable instead of a mystery during an incident.

```go
var evalOutcomes = prometheus.NewCounterVec(prometheus.CounterOpts{
    Name: "flag_eval_total",
    Help: "feature flag evaluation outcomes",
}, []string{"flag", "outcome"})

func (e *providerEvaluator) IsEnabled(ctx context.Context, f Flag, userID uuid.UUID) bool {
    if v, ok := e.cache.get(f); ok {
        return v
    }

    result := make(chan bool, 1)
    go func() {
        enabled, err := e.client.IsFeatureEnabled(string(f), userID.String())
        if err != nil {
            evalOutcomes.WithLabelValues(string(f), "error").Inc()
            result <- e.fallback
            return
        }
        result <- enabled
    }()

    select {
    case v := <-result:
        evalOutcomes.WithLabelValues(string(f), "hit").Inc()
        e.cache.set(f, v)
        return v
    case <-time.After(200 * time.Millisecond):
        evalOutcomes.WithLabelValues(string(f), "timeout").Inc()
        return e.fallback
    }
}
```

Log provider errors at `Warn`; do not surface them to callers.

## Global vs per-user flags

| Scope | Evaluated per | Surfaced via |
|---|---|---|
| Platform / global | All users share one value | Static config payload evaluated at startup or request time with no user context |
| Per-user / targeted | Each user ID independently | Per-request identity payload (e.g. a `/me` response) evaluated with the real user ID |

Global flags may pass `uuid.Nil` — the env adapter ignores the user ID, and most remote providers treat a zero ID as a non-targeted evaluation.

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
    return true // absent key → enabled (matches fail-open default)
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

Pass `mapEvaluator(nil)` to enable all flags. To assert behavior under provider outage, either pass explicit values or implement a separate `errorEvaluator` that always returns `fallback`.

Do not use `os.Setenv` in tests to control flags — it is global state and introduces order-dependent failures.

## Checklist

- [ ] `Flag` const added and documented in `.env.example` as `# FLAG_<NAME>_ENABLED=false`
- [ ] Added to the all-flags registry (env-key docs, diagnostics)
- [ ] Added to the per-user flags list if targeted
- [ ] `Evaluator` interface injected; `IsEnabled` called with the correct user ID
- [ ] Multivariate flags call `Variant`, not `IsEnabled`
- [ ] Fail-open/fail-closed default is intentional; fail-closed default has a WHY comment
- [ ] Billing/payment flags: fail-open/fail-closed matches whether the flag controls a gate or a charge path
- [ ] Tests use the fake evaluator, not `os.Setenv`

## Verify

```sh
go build ./... && go test -short ./...
```
