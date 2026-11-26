---
name: z-cpp-core
description: "Manage resources and ABI boundaries in C++. Use for RAII, ownership, code generation, CMake builds, or sanitizer checks. See [[z-rust-core]] for Rust."
---

# C++ ownership and builds

## Select the language standard

Use the project's C++ standard. C++20 is the baseline for new code in this catalog.
Check the compiler, standard library, and CMake preset. Compile a representative use before adopting a newer feature.
For example, GCC and Clang accept `-std=c++23` independently of library support. Check reflection and contracts separately.

## Manage resources

- Bind each owned resource to an object that releases it in its destructor. Include files, locks, sockets, and memory.
- Let members manage their own resources. Prefer compiler-generated special members when their behavior is correct.
- Prefer values and containers. Use `unique_ptr` for exclusive heap ownership.
- Use `shared_ptr` when several owners must extend the same lifetime.
- Use `span` or `string_view` for borrowed ranges. Keep the backing storage alive for every use.
- Define ownership in each public interface. Translate exceptions to an agreed error representation at an incompatible ABI boundary.
- Preserve defined language behavior when optimizing. Signed overflow can invalidate an optimization.

## Build and generate code

Use the project's CMake presets, dependency mechanism, clang-format configuration, and clang-tidy configuration.
Identify the generator and source in generated files. Correct warnings in the generator or template, then regenerate the output.

## Check the build and ABI

1. Build the configured directory with the project's warning policy. Use `cmake --build .` from that directory.
2. Run the suite with AddressSanitizer and UndefinedBehaviorSanitizer on supported targets.
3. Run ThreadSanitizer in a separate supported build for threaded code.
4. Prefer the project's test wrapper. A bounded fallback is `timeout 5m ctest --timeout 120 --parallel 4`.
