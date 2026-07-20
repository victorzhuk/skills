---
name: z-cpp-core
description: Modern C++ for native/perf modules and codegen targets — RAII and rule of zero, smart pointers over raw owning pointers, sanitizers in CI. Baseline C++20; check toolchain before assuming C++23/26. Triggers on RAII, unique_ptr, ASan, CMake. Does not cover Rust; see [[z-rust-core]].
---

# C++ core

RAII owns every resource — if a type manages one without it, that's the bug to fix before anything else.

## Baseline standard

- target C++20 by default — universally available across current GCC/Clang/MSVC
- treat C++23 as available only after checking the actual toolchain pin (`--std=c++23` and see if it compiles, or check `CMakePresets.json`) — don't assume it's there
- C++26 (ratified by WG21 in March 2026) is experimental-only right now — only bleeding-edge GCC and a forked Clang implement the new reflection/contracts features; don't target it for anything that ships

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
- `ctest`
- the sanitizer build run through the real test suite, not just compiled

See [[z-rust-core]] for the equivalent ownership discipline in Rust.
