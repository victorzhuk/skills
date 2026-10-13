---
name: z-cpp-core
description: Modern C++ for native/perf modules and codegen targets — RAII and rule of zero, smart pointers over raw owning pointers, sanitizers in CI. Baseline C++20; check toolchain before assuming C++23/26. Triggers on RAII, unique_ptr, ASan, CMake. Does not cover Rust; see [[z-rust-core]].
---

# C++ core

RAII owns every resource — if a type manages one without it, that's the bug to fix before anything else.

## Baseline standard

- Use the project's standard; C++20 is the house baseline for new code. Check compiler and standard-library support for each required feature.
- For C++23, inspect the toolchain pin and CMake presets, then compile a representative use (`-std=c++23` on GCC/Clang). A language-mode flag alone does not prove library completeness.
- C++26 completed its technical work in March 2026; that is not final ISO publication. Check the current standard status and compiler feature tables before adopting reflection or contracts.

## RAII and ownership

- RAII everywhere: every resource (memory, file handle, lock, socket) gets a type whose destructor releases it — no manual cleanup path a `return`/`throw` can skip
- rule of zero: if a type doesn't manage a resource directly, don't write any of the five special members — let the compiler generate them from members that already follow rule of zero
- `unique_ptr` is the default for owned heap allocation; `shared_ptr` only as a documented decision (who else holds it, why it must outlive a single owner), not a default reached for out of uncertainty
- `span`/`string_view` at API boundaries to avoid copies, but track lifetimes carefully — a `string_view` that outlives the buffer it points into is a dangling reference the type system won't catch

## Build and tooling

- CMake presets (`CMakePresets.json`) for reproducible configure/build across dev machines and CI — stop passing ad hoc `-D` flags by hand
- FetchContent or a package manager (vcpkg/Conan) for dependencies — pick one per project, don't mix strategies
- clang-format and clang-tidy with a pinned, checked-in config, or style and static-analysis drift across the codebase

## Sanitizers — non-negotiable in CI

- ASan + UBSan on every CI run at minimum — they catch memory corruption and undefined behavior review can't
- TSan on any threaded code path — data races are the bug class sanitizers exist to catch before production does

## Codegen targets

- mark generated code clearly (a header naming the generator and source, not just "do not edit")
- generated output stays warnings-clean — a generator that needs `-Wno-*` to compile its own output is a generator bug
- no hand edits to generated code — fix the generator/template and regenerate

## Do not

- `new`/`delete` in application code — smart pointers and containers exist to remove this; a raw `new` outside a low-level allocator is a review flag
- raw owning pointers in APIs — a function returning `T*` the caller must `delete` invites leaks and double-frees; return `unique_ptr<T>` or a value
- throw exceptions across an ABI/plugin boundary — an exception thrown in one binary and caught in another compiled with a different compiler/runtime is undefined behavior; convert to an error code or `expected<T,E>` at the boundary
- rely on undefined behavior for a micro-optimization — UB the compiler can reason about (signed overflow, strict aliasing) gets "optimized" out from under you on the next compiler upgrade

## Verify

- `cmake --build .` with warnings-as-errors
- Existing test wrapper first; otherwise `timeout 5m ctest --timeout 120 --parallel 4`.
- the sanitizer build run through the real test suite, not just compiled

See [[z-rust-core]] for the equivalent ownership discipline in Rust.
