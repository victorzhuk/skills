---
name: z-deep-modules
description: Deep-module design vocabulary — depth as leverage at the interface, seams, adapters, the deletion test, interface-is-the-test-surface. Use when designing or reviewing a module's interface or deciding where a seam goes. Triggers on "deep module", "shallow module", "seam", "deletion test". Bounded contexts — [[z-domain-modeling]]; premature abstraction — [[z-no-over-engineering]]; Go mechanics — [[z-go-interfaces]].
---

# Deep modules

Hide useful behavior behind a small interface. Apply this as a design lens while preserving the project's vocabulary and established architecture.

## Terms

- **Module:** an interface and its implementation, from a function to a larger subsystem.
- **Interface:** what callers must know, including types, invariants, ordering, errors, configuration, and performance.
- **Depth:** useful behavior hidden relative to the interface a caller must learn.
- **Seam:** a point where behavior can be substituted without editing callers.
- **Adapter:** an implementation that translates or supplies behavior at a seam.
- **Locality:** how closely a change, its consequences, and its verification stay together.

Use the project's terms such as service, component, API, or boundary when they carry the intended meaning. Do not rename concepts merely to adopt this glossary.

## Evaluate the interface

- Ask whether fewer methods or simpler parameters can express the contract.
- Move internal coordination behind the interface when callers should not own it.
- Include errors, side effects, and required sequencing when judging interface complexity.
- Use the deletion test: if removing the module duplicates its hidden logic across callers, it earns its place.
- Do not use implementation line count as a depth score.

Information hiding does not require multiple implementations. A single implementation may justify a package or module through ownership, invariants, or reuse.

A polymorphic seam needs a concrete reason: runtime variation, an external dependency, a required test substitute, or an established architectural boundary. Do not invent a second adapter solely to justify an interface.

## Test the behavior

Use the lowest public interface that proves the contract without hiding integration risk. Internal tests can serve invariants that are not externally distinguishable; avoid coupling assertions to incidental call order or private layout.

Substitute dependencies only where the test needs control. Do not mock the module under test.

## Do not

- Declare every single-implementation module premature.
- Keep a pass-through layer without an ownership or contract reason.
- Force every test through one system-wide interface.
- Rewrite established project terminology to match this skill.

## Verify

Each new boundary has a current reason, callers need fewer implementation facts, and tests survive internal refactors while detecting behavioral regressions.

See [[z-domain-modeling]], [[z-no-over-engineering]], [[z-go-interfaces]], [[z-tdd]].
