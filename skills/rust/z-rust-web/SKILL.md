---
name: z-rust-web
description: Rust web development with Axum, SQLx, tower middleware, and production deployment patterns. Triggers on rust web, actix, axum, tower.
---

# Rust web

No real Rust web service exists in this codebase yet. `v2ray-rs` and `mrack` are desktop GUI apps, not web servers — `axum`/`tower-http` only show up as transitive deps via `tonic`/`reqwest`, and no `Cargo.toml` declares `axum`, `actix-web`, `sqlx`, or `tower-http` directly. Treat everything here as reference material, not house convention — there's no anchor project to defer to.

## What's actually anchored

- **Error enums**: use `thiserror` — real convention across both real Rust projects (`mrack`, `v2ray-rs`). See [[z-rust-core]] for the actual error-handling pattern; don't re-derive it here.
- **Logging**: `mrack` uses `tracing` + `tracing-subscriber`; `v2ray-rs` uses the older `log` crate instead. Split-brain — don't assert `tracing` as the settled default for this codebase.

## Everything else

For Router/extractors, `sqlx::query_as!`, tower middleware, and production hardening (graceful shutdown, health checks, TLS, deployment), go to Axum's own docs — there's no local convention to layer on top of them yet.
