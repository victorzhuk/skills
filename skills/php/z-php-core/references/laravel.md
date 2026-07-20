# Laravel

## Artisan-first workflow

- Generate scaffolding with `artisan make:*` (`model`, `controller`, `migration`, `request`, `job`, `listener`) instead of hand-copying an existing file — the generators wire naming conventions and boilerplate Laravel expects (namespaces, base classes, stub structure) correctly by construction.
- `artisan migrate` / `artisan migrate:rollback` are the only path to schema change, same discipline as any framework migration tool — don't hand-edit a live database and let the migration table drift from reality.
- Custom domain commands are still artisan commands (`artisan make:command`) — keep them thin, delegate to application/domain code.

## Eloquent discipline

- Eager-load relationships you know you'll access (`->with('relation')`, `->load()`) instead of triggering a query per row in a loop — the classic N+1 is `foreach ($users as $user) { $user->orders; }` with no eager load, one query per user.
- Use `$casts` (or the `casts()` method on newer Eloquent) for typed attribute access — dates, enums, JSON columns, money as a value object — instead of casting/parsing the same attribute manually at every call site.
- Controllers call model/repository methods; they don't build multi-line query chains inline. If a query is reused or grows past a couple of clauses, name it — a scope (`scopeActive`), a query-builder method on the model, or a dedicated query class — instead of repeating the builder soup everywhere it's needed.
- Mass-assignment: `$fillable` (allowlist) over `$guarded = []` for anything accepting user input — an empty guard array means every column is assignable from request data.

## Validation

- Form Request classes (`artisan make:request`) for controller input validation — `rules()` for the validation rules, `authorize()` for the authorization check, both testable in isolation from the controller.
- Don't hand-roll `$request->validate([...])` inline in a controller once the ruleset is non-trivial or reused — that's exactly what a Form Request replaces.
- Validated input reaches the domain layer as a typed DTO or array from `$request->validated()`, not the raw `$request` object passed further down.

## Queues and Horizon

- Jobs (`artisan make:job`) carry serializable state and a `handle()` method; keep business logic in the service/domain layer the job calls, not inlined in the job itself.
- Configure `tries`, `backoff`, and a `failed()` handler explicitly — an unhandled job failure that silently vanishes after retries exhausts is a production incident.
- Horizon is the operational dashboard/config layer for Redis-backed queues (worker balancing, metrics, failed-job UI) — it doesn't change how you write jobs, only how they're supervised in production. Concept-level only here; check Horizon's own config for supervisor tuning.

## Config and cache

- `artisan config:cache` compiles all config files into one cached file for production — after running it, `env()` calls outside `config/*.php` stop reflecting `.env` changes, because the cache bypasses `.env` entirely. Read config through `config('app.name')`, never `env('APP_NAME')`, anywhere outside the `config/` files themselves.
- Re-run `config:cache` (and `route:cache`, `view:cache`) as part of deploy, after every config change — a stale cache serving old values is a common self-inflicted incident.
- `.env` stays out of version control; `.env.example` documents the required keys without real values.

## Testing

- Pest is the default for new Laravel test suites — first-class Laravel plugin support (`RefreshDatabase`, `actingAs`, HTTP test helpers) reads naturally in Pest's syntax.
- `RefreshDatabase` migrates a fresh schema per test run (or wraps each test in a transaction, depending on driver) — correct and simple, but slower than `DatabaseTransactions` on a large migration set. Use `RefreshDatabase` by default; drop to transaction-only or an in-memory SQLite test DB when suite runtime becomes the bottleneck, not before.
- Feature tests hit routes through the HTTP kernel (`$this->get()`, `$this->postJson()`); unit tests exercise a single class without booting the framework. Keep the ratio weighted toward feature tests for anything routed — that's where Laravel's actual behavior (middleware, validation, auth) lives.

## Service container vs facades

- Facades (`Cache::get()`, `Queue::push()`) are fine in application/controller code — they're thin static proxies to container-bound singletons and Laravel's own test helpers (`Cache::shouldReceive()`) support them directly.
- Prefer constructor-injected interfaces in classes that should be framework-agnostic or independently unit-testable — a domain service that doesn't need to know it's running inside Laravel shouldn't type-hint a facade.
- Don't mix both styles for the same dependency in one class — pick constructor injection or a facade per class, not both, so a reader isn't hunting two places for where a dependency comes from.
