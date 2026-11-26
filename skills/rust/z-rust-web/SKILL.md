---
name: z-rust-web
description: "Review Rust HTTP routes, middleware, or adapters with the project's framework and runtime. See [[z-rust-core]] for ownership and errors."
---

# Rust HTTP services

## Trace the route

1. Inspect `Cargo.toml`, `Cargo.lock`, route registration, middleware, and endpoint tests.
2. Identify the direct dependencies and enabled features. Check the installed framework's extractor, authentication, and middleware order.
3. Follow the existing runtime, error response format, logging policy, and shutdown contract.
4. Check SQL queries and migrations against the database client's documentation. Use [[z-rust-core]] for ownership and typed errors.

## Check the routes

Exercise the changed route through its real middleware. Include authorization failures, input limits, timeouts, and cancellation where applicable.
Run the project's bounded test wrapper. See [[z-testing-strategy]].
