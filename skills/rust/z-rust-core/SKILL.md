---
name: z-rust-core
description: Rust development with ownership, lifetimes, error handling, async, traits, and idiomatic patterns. Triggers on rust, ownership, borrow, lifetime, cargo.
---

# Rust core

Write idiomatic, zero-cost Rust: make ownership and lifetimes explicit, model errors in the type system, keep concurrency safe, and encode invariants at compile time.

## Instructions

### Response Format

1. **Ownership**: Prefer borrowing (`&T`) over ownership transfer; explain move semantics for non-Copy types
2. **Error Handling**: Use `thiserror` for every error enum, application or library; always propagate with `?`; never panic in library code
3. **Async**: Use `tokio` runtime; use `tokio::spawn` for concurrent tasks; use `tokio::select!` for racing futures; wrap blocking calls with `spawn_blocking`
4. **Traits**: Use trait bounds with `impl Trait` for simple argument positions; use `dyn Trait` for runtime polymorphism; implement `From`/`Into` for conversions
5. **Project Layout**: For GUI desktop apps, split by concern, not by domain/service/handler layers — a workspace with one crate per feature (`core/`, `subscription/`, `ui/`, ...) or a single crate with modules per concern (`api/`, `app/`, `platform/`, `ui/`, ...). See [[z-rust-web]] for HTTP-service layout.
6. **Safety**: Minimize `unsafe`; document all safety invariants when unavoidable; use `#[must_use]` on types where ignoring the return is a bug
7. **Tooling**: Run `cargo fmt` and `cargo clippy` denying default + `clippy::all` in CI (`-D warnings` or `-W clippy::all`); don't reach for `clippy::pedantic` without a concrete reason; use `cargo test -- --nocapture` for debug output
8. **Testing**: Unit tests in `#[cfg(test)]` module in the same file; integration tests in `tests/`; use `mockito` to stub HTTP responses in adapter/client tests

### Edge Cases

If lifetime annotations become complex: Simplify by restructuring ownership; consider `Arc<T>` to eliminate lifetime constraints across thread boundaries.

If `Clone` appears frequently in GUI event-loop code (relm4/iced closures that must own their captures): that's the idiom, not a smell — cheap handle/String clones feeding `sender.input()` or message closures are expected. Only treat `Clone` as a smell when it's masking a lifetime fight on a hot path or duplicating something non-trivial to dodge the borrow checker.

If a trait needs to be object-safe: Avoid associated types that differ per impl; use `Box<dyn Trait>` only when runtime dispatch is genuinely needed.

If an async trait needs to be used as a trait object (`Arc<dyn Trait>`, `&dyn Trait`): use `#[async_trait]` — `async fn` in traits still isn't dyn-compatible without boxing, regardless of MSRV. This isn't a legacy fallback: it's the live pattern once dynamic dispatch is in play. Skip `async-trait` only when every call site is static dispatch (`impl Trait` / `<T: Trait>`), never boxed.

If build times are slow: Split into smaller crates; use `cargo-nextest` for faster test runs; enable incremental compilation in dev profile.

If FFI boundary is needed: Isolate all `unsafe` in a dedicated module; wrap in a safe Rust API immediately; document all invariants.

If deadlock is suspected in async code: Avoid holding `std::sync::Mutex` across `.await`; use `tokio::sync::Mutex` for async-aware locking.

## References
- [Community Patterns](references/community-patterns.md)
