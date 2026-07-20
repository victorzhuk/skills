---
name: z-dotnet-core
description: C#/ASP.NET Core web APIs for inherited and green services — minimal APIs, nullable reference types as errors, constructor-injection DI, EF Core AsNoTracking reads, async all the way. Current LTS is .NET 10. Triggers on ASP.NET Core, minimal API, EF Core. Does not cover Go/Rust; see [[z-go-clean-arch-di]].
---

# .NET core

Default to minimal APIs for a new small service, controllers only where the codebase already committed to them — don't migrate an inherited controller app just to match a green one.

## Target framework

- current LTS is .NET 10 (released Nov 2025, supported through Nov 2028) — start new services there; .NET 8 (LTS through Nov 2026) is the fallback only for a codebase already pinned to it
- verify against the actual `global.json`/`.csproj` `TargetFramework` before assuming a version — an inherited codebase may sit on an out-of-support release

## API style

- minimal APIs (`MapGet`/`MapPost` on `WebApplication`) for small, focused services — less ceremony, faster to read top to bottom
- controllers where the codebase already has them — don't rewrite a working controller-based API to minimal APIs on style preference alone
- nullable reference types enabled (`<Nullable>enable</Nullable>`) with warnings treated as errors — this is what makes a `null` a compile-time signal instead of a runtime surprise

## Dependency injection

- constructor injection only, through the built-in container (`IServiceCollection`) — no service locator pattern; `IServiceProvider.GetService` reached for deep inside business logic hides the real dependency graph
- register lifetimes deliberately: `Scoped` for anything touching a `DbContext` or per-request state, `Singleton` only for genuinely stateless or thread-safe services, `Transient` for cheap short-lived instances

## EF Core discipline

- review every migration before it ships — a generated migration can silently drop a column or add a non-nullable one without a default on a populated table
- `AsNoTracking()` on read-only queries — skips change-tracking overhead for data that's never saved back
- no lazy-loading surprises: either disable lazy loading and `Include()` explicitly, or know exactly which navigation properties trigger N+1 queries on access
- LINQ readable over clever — a query that reads like the SQL it produces is easier to review than one showing off `Aggregate`/`SelectMany` chains

## Async

- async all the way from the endpoint down to the I/O call — no `.Result` or `.Wait()` on a `Task`; both deadlock under ASP.NET Core's synchronization context in enough real scenarios to ban outright
- thread a `CancellationToken` through to DB/HTTP calls that support it, sourced from the request's own token

## Testing

- xUnit as the default test framework
- `WebApplicationFactory<T>` for API-level tests against the real DI graph and middleware pipeline, not just isolated handler unit tests

## Do not

- grow god controllers — a controller accumulating unrelated endpoints is a decomposition signal, not a place to keep adding `[HttpPost]` methods
- sync-over-async (`.Result`, `.Wait()`, `.GetAwaiter().GetResult()` on a hot path) — thread-pool starvation and deadlocks follow
- use `DateTime.Now` for anything that becomes business logic or gets tested — use `DateTime.UtcNow`, or inject `TimeProvider` (built into .NET 8+) so tests can control time
- catch `Exception` broadly at a layer that isn't the outermost error boundary — it swallows bugs a narrower catch or the framework's own exception handling would surface

## Verify

- `dotnet build -warnaserror`
- `dotnet test`
- `dotnet format --verify-no-changes`
