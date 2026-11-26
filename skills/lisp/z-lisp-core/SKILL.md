---
name: z-lisp-core
description: "Design an embedded Scheme-style interpreter. Use for lexical closures, tail calls, macro hygiene, garbage collection, or the VM interface. See [[z-rust-core]] for Rust host code."
---

# Embedded Scheme-style interpreters

## Define the language contract

Use lexical scope. A closure captures its defining environment. Mark any dynamic bindings explicitly.
Implement proper tail calls across procedures, including mutual recursion. Tail calls must preserve bounded control-stack usage.
Prefer hygienic macros. Document intentional capture where the dialect permits it.
Implement the continuation semantics the dialect promises. A one-shot escape continuation cannot implement general multi-shot `call/cc`.
For a custom dialect, select full continuations only when required.

## Define the host interface

- Represent values with tagged types. Register the host functions the program can call.
- Map errors in both directions. Preserve Lisp stack context and structured errors for `condition` or `guard` handlers.
- Pass data through the typed interface. Avoid constructing source text for `eval`.
- Register roots for Lisp values retained by host callbacks or objects. Release each root when the host releases the value.
- Prefer precise collection when references are identifiable. Conservative scanning can retain pointer-like values.
- Bound symbol retention. Use uninterned symbols where macro expansion needs fresh names.
- Limit execution and allocation for untrusted programs. Propagate cancellation into host callbacks.

## Check the interpreter

1. Exercise the reader, evaluator, and printer through the REPL. Check each special form against its expected result.
2. Run long direct and mutual tail-call sequences. Measure the maximum host stack depth.
3. Trigger collection while a host callback retains a Lisp closure. Call the closure after collection.
4. Exercise allocation limits, infinite loops, and blocked host calls. Check the host's recovery path.
