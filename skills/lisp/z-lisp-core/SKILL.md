---
name: z-lisp-core
description: Embeddable Scheme-flavored Lisp interpreters/compilers embedded in a host app — lexical closures, proper tail calls as a requirement, hygienic macros by default, call/cc only if needed, tagged-value VM/host boundary. Triggers on Lisp VM, Scheme interpreter, tail call, hygienic macro. Does not cover the host language; see [[z-rust-core]].
---

# Lisp core

Design the interpreter/compiler and its host boundary together — an embedded Lisp VM lives or dies on how cleanly values, errors, and control cross that boundary.

## Core semantics — non-negotiable

- lexical scoping and closures: a closure captures its defining environment, not the dynamic call stack. This is Scheme's defining trait — get it right before anything else
- proper tail calls are a requirement, not an optimization flag. A self-tail-call written as `(loop ...)` must run in constant stack space, or callers will fall back to `while`/`goto` and lose the language's expressiveness
- macros hygienic by default (rename introduced bindings so they can't capture caller identifiers). If the VM only supports unhygienic macros, document the capture hazard at every macro definition site — don't leave it implicit
- full `call/cc` is expensive to implement correctly (stack copying or a CPS transform) — support it only when the host genuinely needs resumable control flow (generators, backtracking, coroutines-via-continuations). A one-shot escape continuation covers most real uses at a fraction of the cost

## VM/host boundary

- values cross as tagged types (a discriminated union/enum on the host side) — never as untyped host-native values guessed at runtime
- host functions register explicitly through a table the embedder builds, not via reflection over the host language — reflection breaks static typing and hides the real API surface
- errors map both directions without losing stack context: a Lisp error surfacing to the host carries the Lisp call stack; a host error raised into Lisp carries enough structure for a `condition`/`guard` handler to act on, not just a string

## GC

- precise GC over conservative for an embedded VM — conservative GC scans host stack frames it doesn't understand, risking false retention or, worse, a missed root inside someone else's process
- rooting discipline at the boundary: any Lisp value the host holds outside the VM's own stack (a callback closure stored in a host struct) must be explicitly rooted, or the collector reclaims it out from under the host

## Workflow

- REPL-driven development from day one — it's both the fastest debug loop and the first proof that reader, evaluator, and printer round-trip correctly

## Do not

- default to dynamic scope — that's a different language design (Emacs Lisp is the well-known counterexample); if a form needs dynamic binding, mark it explicitly (`fluid-let`/parameterize) instead of making it the default
- do string-based host interop — building host calls by formatting Lisp source into a string and `eval`-ing it defeats the tagged-value boundary and reintroduces injection-style bugs
- let symbol interning leak silently — an interned symbol table that only grows (every `gensym` during macro expansion, say) is a slow leak; scope gensym'd symbols or use uninterned symbols

## Verify

- round-trip test: read → eval → print for every core special form
- tail-call test: a self-recursive loop of 10^6+ iterations must not grow the host stack
- REPL smoke test after any evaluator change

Host-language specifics (memory model, FFI mechanics, async runtime) belong to the host stack's own skill, e.g. [[z-rust-core]] for a Rust-hosted VM.
