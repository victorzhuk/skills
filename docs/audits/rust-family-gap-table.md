# Rust family gap table — skills vs real practice

Working audit doc. 3 `skills/rust/z-rust-*/SKILL.md` skills audited against the
whole `~/Projects/own/` tree (4 real Rust projects found via `fd Cargo.toml`:
`v2ray-rs`, `mrack`, `zed-lisp`, `mog-rs` — the last two are a narrow Zed
extension and an empty skeleton, contributing no evidence). Verify stage
completed for `z-rust-web` only — `z-rust-core` and `z-rust-gtk4`'s verify
agents hit an external session rate limit (resets 7:30pm Europe/Moscow) before
running; their audit-stage findings below are single-pass but each row cites
concrete file:line evidence, not inference.

## Headline finding

**`z-rust-web` has zero real anchor anywhere in this tree — confirmed
independently three times** (its own audit, its own verify pass, and a
cross-check from the `z-rust-gtk4` audit). No Cargo.toml anywhere declares
`axum`, `actix-web`, `sqlx`, or `tower-http` directly; both appear only as
transitive dependencies (`axum` via `tonic`'s gRPC stack, `tower-http` via
`reqwest`'s HTTP client). Both real Rust projects are desktop GUI apps
(`v2ray-rs`: relm4/GTK4/libadwaita; `mrack`: iced), not web servers — this
mirrors `z-qa-visual`'s "no anchor at all" pattern from the QA audit.

`z-rust-core` is roughly half-anchored: error handling (`thiserror`
everywhere, zero `anyhow`), async (`tokio::spawn`/`select!`/`spawn_blocking`),
and the test-layout convention all match real code cleanly. But several
claims read as generic library/web-backend boilerplate that doesn't fit
either real GUI app: `anyhow`, `Cow<'a, str>`, `clippy::pedantic`,
`proptest`/`mockall`, and a `domain/service/handler/repo` project layout are
all zero-hit. One claim is actively wrong, not just unanchored: the
async-trait guidance ties `#[async_trait]` to old MSRV, but `mrack` (on the
newest possible MSRV) uses it anyway because it needs `dyn`-compatible trait
objects — object-safety, not MSRV, is the real driver.

`z-rust-gtk4` is well-anchored to `v2ray-rs` (a full relm4 desktop app) but
several specific implementation details have drifted from what that real app
actually does.

## z-rust-core

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| `thiserror` for error enums, propagate with `?`, never panic in library code | Both real projects use `thiserror` exclusively (v2ray-rs: 21 hits across 3 crates; mrack: 7 hits). Only `panic!` calls found are inside `#[cfg(test)]` assertions | no_disagreement | keep as-is |
| `anyhow` for application code | Zero real usage anywhere, including app-layer crates where the rule would apply most. No doc suggests deliberate rejection | **drift (decisive)** | drop the anyhow/thiserror split — both real apps standardize on thiserror everywhere |
| Async traits: native `async fn` in traits (1.75+); `async-trait` only as MSRV fallback | `mrack` targets edition 2024/Rust 1.92+ (newest possible MSRV) yet uses `#[async_trait]` throughout — because it needs `dyn`-compatible trait objects (`Arc<dyn SecureStore>`, `&dyn AuthService`), which `async fn` in traits still can't provide without boxing | **drift (actively wrong, not just unanchored)** | correct the edge case: async-trait is required whenever the trait must be object-safe, independent of MSRV |
| `Cow<'a, str>` when allocation is conditional | Zero hits in either project despite substantial string handling in both | drift | drop or scope to genuinely allocation-heavy hot paths |
| `cargo clippy -W clippy::pedantic` in CI | v2ray-rs runs `-D warnings` on default+`clippy::all`; mrack runs `-W clippy::all` (warn-only). Neither uses pedantic | drift | state the real pattern: deny warnings on default+`clippy::all` |
| `proptest` for property tests, `mockall` for trait mocking | Zero hits for either. mrack's only test-mocking dep is `mockito` (HTTP-response stubbing, not trait mocking) | drift | drop or replace with `mockito` as the real HTTP-stubbing pattern |
| Project layout: `domain/`, `service/`, `handler/`, `repo/`, `config.rs`, `error.rs` | Neither project matches. v2ray-rs is 7 purpose-named workspace crates (documented in its own CLAUDE.md); mrack is an iced-GUI module split (`api/`, `app/`, `platform/`, `storage/`, `ui/{components,views,widgets}/`) | **drift (decisive)** | replace with workspace-crate-per-concern or GUI module split; this layout is web-backend clean-architecture, neither real project is a web service |
| Frequent `Clone` is a smell; redesign to references/`Arc` | Both codebases clone heavily and unapologetically (v2ray-rs: 700 calls/31k lines; mrack: 215/19k lines) — mostly cheap handle/String clones feeding relm4/iced closures that must own their captures | drift | qualify: in GUI event-loop code, frequent cheap clones are the idiom, not a smell to fix |
| `tokio::spawn`/`select!`/`spawn_blocking` | Confirmed in both real projects | no_disagreement | keep as-is; note it's GUI-event-loop async, not web-server request handling |

## z-rust-web

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| Axum Router w/ typed extractors, tower `.layer()` middleware, `AppState` in `Arc` | Zero hits anywhere in the tree; `axum` only appears transitively via `tonic` | **drift (decisive, zero anchor)** | scope the skill honestly as reference/aspirational material — no anchor exists |
| Handlers return `Result<Json<T>, AppError>`, delegate to a service layer | Zero axum handlers exist anywhere | drift | keep as generic reference; don't imply it reflects real practice |
| SQLx `query_as!`, `PgPool`, `SQLX_OFFLINE` + `.sqlx/` cache | `sqlx`/`sqlx-core` absent from every Cargo.lock. Neither app touches a relational DB — v2ray-rs uses TOML config, mrack uses `fjall` (embedded KV) + `keyring` + `chacha20poly1305` | drift | no anchor for any part of this claim |
| Tower middleware stack, rate limiting via `governor`, Actix-web as an alternative | `tower-http` only transitive via `reqwest`. `governor`/`actix-web` absent from every Cargo.toml/lock in the tree | drift | pure reference content, nothing to reconcile |
| `thiserror::Error` on all error variants | Both real projects do this — genuinely anchored, just not web-specific | no_disagreement | keep, but decouple from the web-specific `IntoResponse` claim below |
| Implement `IntoResponse` on `AppError` for structured JSON errors | Zero occurrences anywhere — no HTTP server exists to anchor this to | drift | keep as standard Axum guidance, don't fold into the anchored thiserror claim |
| Structured logging with `tracing`+`tracing-subscriber` | mrack anchors this exactly. v2ray-rs uses the older `log` facade instead — split-brain across the author's own two projects | ambiguous | state the ambiguity rather than asserting tracing as default |
| Production hardening: `tokio::signal` graceful shutdown, `/health`/`/ready`, `tracing-opentelemetry`, release-profile tuning (`lto`, `codegen-units`, `strip`) | No app-level shutdown handling for any server (there is none). `opentelemetry` absent from every Cargo.toml. Zero `[profile.release]` overrides in either project | drift | all sub-claims are unanchored reference content |

## z-rust-gtk4

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| Cargo.toml pins `gtk4`/`libadwaita`/`glib`/`gio` directly as top-level deps | v2ray-rs never declares these directly — only `relm4 = { version = "0.10", features = ["gnome_48", "libadwaita"] }`, importing gtk/adw via relm4's re-exports (`use relm4::gtk;`, `use relm4::adw;`). Cargo.lock resolves one minor ahead of the skill's pinned numbers | **drift (decisive)** | show relm4-only deps gated by a `gnome_NN`+`libadwaita` feature combo, with re-export imports, not direct crate pins |
| `AdwPreferencesWindow` as the top-level preferences widget | libadwaita 0.8.1 (the real resolved version) marks `PreferencesWindow::new()` deprecated since 1.6. Real project deliberately uses `adw::PreferencesDialog` instead | **drift (decisive)** | teach `AdwPreferencesDialog` as current; keep `PreferencesWindow` only with an explicit deprecated-since-1.6 caveat |
| Background work via `async fn update()`/`update_cmd()` + `sender.command(\|_, _\| CmdOut::X)` | This wouldn't even compile against relm4 0.10.1's real API (the closure must call `.send()`, not return the enum directly), and belongs to `AsyncComponent`, which has zero real usage. Real, exclusively-used pattern is `sender.oneshot_command(async move { ...; CmdOut::X })` — used 8+ times in v2ray-rs | **drift (decisive, non-compiling as written)** | replace with the real `oneshot_command` pattern, the only form that both compiles and is actually used |
| System tray via `libayatana-appindicator`/`AppIndicator::new` | The only real tray implementation (`v2ray-rs/crates/tray`) depends solely on `ksni`, zero `AppIndicator` hits anywhere | **drift (decisive)** | lead with the real `ksni` `impl Tray` pattern; drop or demote AppIndicator |
| `AdwApplicationWindow` wraps an `AdwToolbarView` | Real window is `adw::ApplicationWindow` but never uses `AdwToolbarView` (zero hits) — composes a manual `gtk::Box` with `adw::HeaderBar` and `adw::ToastOverlay` as siblings instead | drift | drop the ToolbarView claim or present both, since the manual composition is what's actually used |

## Cross-cutting note

`z-rust-gtk4`'s own audit independently re-confirmed the `z-rust-web`
zero-anchor finding via its own exhaustive Cargo.toml search — three
independent passes now agree.
