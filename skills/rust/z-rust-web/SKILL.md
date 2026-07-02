---
name: z-rust-web
description: Guardrail for Rust web work — no Axum/actix/sqlx/tower house convention exists yet in this corpus, so check the anchored facts (thiserror error enums, tracing-vs-log split) instead of inventing one, and defer to Axum's own docs for everything else. Triggers on rust web, actix, axum, sqlx, tower.
---

# Rust web

No real Rust web service exists in this codebase yet. The Rust projects in this corpus are desktop GUI apps, not web servers — `axum`/`tower-http` only show up as transitive deps via `tonic`/`reqwest`, and no `Cargo.toml` declares `axum`, `actix-web`, `sqlx`, or `tower-http` directly. Treat everything here as reference material, not house convention — there's no anchor project to defer to.

## What's actually anchored

- **Error enums**: use `thiserror` — real convention across the Rust projects in this corpus. See [[z-rust-core]] for the actual error-handling pattern; don't re-derive it here.
- **Logging**: one project uses `tracing` + `tracing-subscriber`; another uses the older `log` crate instead. Split-brain — don't assert `tracing` as the settled default for this codebase.

## Everything else

For Router/extractors, `sqlx::query_as!`, tower middleware, and production hardening (graceful shutdown, health checks, TLS, deployment), go to Axum's own docs — there's no local convention to layer on top of them yet.
