---
name: z-rust-core
description: "Design Rust ownership, lifetimes, traits, error types, and async tasks. Use for borrowing, trait objects, FFI, or Cargo checks. See [[z-rust-gtk4]] and [[z-rust-web]] for application patterns."
---

# Rust design and verification

## Establish ownership

Borrow values when the callee only needs access. Transfer ownership when the callee must retain the value.
Use `Arc<T>` for shared ownership across threads when the contained type supports the required thread-safety guarantees.
Cloning a GUI handle can be cheap. Measure large data copies separately.
Isolate FFI and unsafe operations. Document each safety invariant at the operation that relies on it.

## Choose an interface

- Return a typed error when callers must distinguish cases. Use `?` to propagate compatible errors.
- Reuse existing error types or dependencies such as `thiserror` and `anyhow` where their contracts fit.
- Reserve panics for documented invariants. Handle expected input and operational failures explicitly.
- Use generic bounds for static dispatch and `dyn Trait` for runtime dispatch. Specify required associated types on the trait object.
- For dynamic async dispatch, inspect the target compiler's dyn compatibility rules. A boxed future or `async-trait` can provide an adapter.
- Use `#[must_use]` when ignoring the result is usually an error. Consider `#[non_exhaustive]` before publishing an extensible enum.

## Run asynchronous work

Use the project's executor. Call Tokio runtime APIs within a suitable runtime context.
Use `tokio::select!` when operations race. Check what cancellation does to each losing future.
Use `spawn_blocking` for suitable blocking work on Tokio. Bound concurrency and handle shutdown.
Release a synchronous lock before `.await`. Use an async lock when the critical section must cross an await point.

## Check the crate

Run the project's formatting, Clippy, and test wrappers. Example checks include `cargo fmt --check` and `cargo clippy -- -D warnings`.
Use the established lint policy. A warning-level lint alone does not fail the command.
Bound build jobs, test workers, and total time. For example, use `timeout 5m cargo test -j 2 -- --test-threads=4`.
Exercise error, cancellation, and ownership boundaries. Put unit tests in `#[cfg(test)]` modules and integration tests in `tests/`.
Use property tests or mocks only for identified risks. Measure build and test time separately before changing crate layout.
See [[z-testing-strategy]], [[z-rust-gtk4]], and [[z-rust-web]].
