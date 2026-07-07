---
name: z-deep-modules
description: Deep-module design vocabulary — depth as leverage at the interface, seams, adapters, the deletion test, interface-is-the-test-surface. Use when designing or reviewing a module's interface, deciding where a seam goes, or judging whether an abstraction earns its keep. Triggers on "deep module", "shallow module", "seam", "deletion test". Does not cover bounded contexts (see [[z-domain-modeling]]) or premature abstraction (see [[z-no-over-engineering]]). Go mechanics live in [[z-go-interfaces]].
---

# Deep modules

Design deep modules: a lot of behaviour behind a small interface, placed at a clean seam, testable through that interface. The aim is leverage for callers, locality for maintainers, and testability for everyone.

## Glossary

Use these terms exactly — consistent language is the point.

- **Module** — anything with an interface and an implementation. Scale-agnostic: a function, class, package, or tier-spanning slice. *Avoid*: unit, component, service.
- **Interface** — everything a caller must know to use the module correctly: the type signature, plus invariants, ordering constraints, error modes, required configuration, and performance characteristics. *Avoid*: API, signature — too narrow, type-level only.
- **Implementation** — what is inside a module.
- **Depth** — leverage at the interface: how much behaviour a caller (or test) exercises per unit of interface they must learn. Deep = lots of behaviour behind a small interface; shallow = interface nearly as complex as the implementation.
- **Seam** — a place where behaviour can be altered without editing in that place; the location where a module's interface lives. Where the seam goes is its own design decision, distinct from what goes behind it. *Avoid*: boundary — overloaded with DDD's bounded context.
- **Adapter** — a concrete thing that satisfies an interface at a seam. Names a role, not substance: a Postgres repo is a small adapter with a large implementation; an in-memory fake is the reverse.
- **Leverage** — what callers get from depth: one implementation pays back across N call sites and M tests.
- **Locality** — what maintainers get from depth: change, bugs, and verification concentrate in one place. Fix once, fixed everywhere.

## Principles

- **Depth is a property of the interface, not the implementation.** A deep module may be internally composed of small, swappable parts — they just aren't part of the interface. Internal seams (private, used by the module's own tests) can coexist with the external seam.
- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. Wanting to test *past* the interface means the module is probably the wrong shape.
- **One adapter means a hypothetical seam. Two adapters means a real one.** Don't introduce a seam unless something actually varies across it — a fake for tests counts as a second adapter only when the test genuinely needs substitution.

## Shrinking an interface

When designing or reviewing an interface, ask:

- Can the number of methods go down?
- Can the parameters get simpler?
- Can more complexity move inside?

And for testability: accept dependencies instead of constructing them inside; return results instead of producing side effects; keep the surface small — fewer methods means fewer tests, fewer params means simpler setup.

## Rejected framings

- **Depth as implementation-lines over interface-lines** — rewards padding the implementation. Depth is leverage, not a ratio.
- **Interface as the language's `interface` keyword or public method list** — too narrow; interface here includes every fact a caller must know.
- **"Boundary"** — say seam or interface.

## Do not

- Call a module deep because its implementation is big — measure at the interface.
- Add a seam for a hypothetical second adapter.
- Test past the interface instead of reshaping the module.
- Ship a pass-through module that fails the deletion test — merge it into its caller or deepen it.

## Verify

- Each new or changed module passes the deletion test.
- Every seam has (or will imminently have) two real adapters.
- Tests exercise the module only through its interface.

see [[z-domain-modeling]], [[z-no-over-engineering]], [[z-go-interfaces]], [[z-tdd]]
