---
name: z-dotnet-core
description: "Build ASP.NET Core APIs with dependency injection, EF Core, cancellation, and nullable references. Use for minimal APIs or controllers. See [[z-testing-strategy]] for test scope."
---

# ASP.NET Core services

## Select the framework

Read `global.json` for SDK selection and the project file for target frameworks.
Preserve the existing target unless the task includes an upgrade. Check Microsoft's support policy before selecting an LTS for new services.
Prefer minimal APIs for small new services. Preserve existing controller routes and contracts.
Enable nullable analysis with `<Nullable>enable</Nullable>` and the project's warning policy. Check request input at runtime. Nullable annotations affect static analysis.

## Wire dependencies

- Inject services through constructors or supported minimal-API handler parameters.
- Keep request state and the usual EF Core `DbContext` within a scope.
- Use singletons for services safe to share across requests. Avoid capturing scoped services in a singleton.
- Use transient registration for independent short-lived instances.

## Handle data and errors

Review generated migrations against populated tables. Check column removals and new required values.
Use `AsNoTracking()` for read-only entity queries. Inspect SQL and query counts.
Project or explicitly load the relationships the operation needs. Lazy navigation can issue one query per row.
Await asynchronous I/O through the endpoint. Blocking on `.Result` or `.Wait()` can exhaust the thread pool.
Pass the request's `CancellationToken` to database and HTTP operations.
Use UTC for stored instants. Inject `TimeProvider` where the target supports it and tests require controllable time.
Catch errors where the application can recover or translate them to its public error contract.

## Check the service

1. Run the project's build and format checks, such as `dotnet build -warnaserror` and `dotnet format --verify-no-changes`.
2. Exercise changed endpoints through their middleware and dependency graph. Use the existing harness, such as xUnit with `WebApplicationFactory<T>`.
3. Bound the test process and worker count using the selected runner's supported options. See [[z-testing-strategy]].
