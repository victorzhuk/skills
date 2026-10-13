---
name: z-rust-web
description: Rust web stack discovery and boundaries — inspect the target service before choosing Axum, actix-web, sqlx, tower, or logging conventions. Use for Rust HTTP services and middleware. Core ownership and error handling belong to [[z-rust-core]].
---

# Rust web

Inspect the target repository's manifests, lockfile, routes, adapters, and tests before proposing framework conventions. This catalog does not establish which framework an unrelated service uses.

## Workflow

- Preserve the service's runtime, routing, error response, and logging patterns. Follow [[z-rust-core]] for ownership and typed errors.
- Read the installed framework's official documentation for extractors, middleware order, body limits, authentication, and graceful shutdown. Use sqlx documentation for sqlx queries and migrations; do not infer them from Axum documentation.
- Verify timeouts, cancellation, resource limits, and authorization at real HTTP boundaries. Use the existing bounded test wrapper and [[z-testing-strategy]].

## Do not

- Infer direct dependencies or house conventions from another project's transitive dependencies.
- Replace logging libraries or web frameworks without a requirement in the target service.

## Verify

- Identify direct dependencies and pinned versions supporting each proposed API.
- Exercise the changed route through its actual middleware, including relevant error and authorization paths.
