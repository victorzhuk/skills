# Symfony

## Project structure

- `src/` holds application code, namespaced `App\` per PSR-4 — no framework-imposed subfolder convention beyond `Controller/`, `Entity/`, `Repository/` as loose grouping, not a hard layer boundary.
- `config/packages/*.yaml` holds per-bundle config; `config/packages/{env}/*.yaml` overrides per environment (`dev`, `test`, `prod`). Don't fork logic with `if ($_ENV['APP_ENV'])` checks in code — push environment differences into config.
- `config/services.yaml` wires the DI container. Keep it thin: autowiring covers the common case, and explicit service definitions are the exception, not the default.
- `migrations/` (Doctrine) is generated, not hand-authored from scratch — write the schema change, then generate and review the diff.

## DI container

- Autowiring (`autowire: true`, the default since Flex) resolves constructor dependencies by type-hint. Type-hint against interfaces, not concrete classes, so the container — and your tests — can swap implementations.
- Configure explicitly only when autowiring can't disambiguate: multiple implementations of one interface (bind by service id or use a named argument), scalar/primitive constructor args (env vars, config values), or a service that needs to stay `public` for legacy access (avoid — prefer autowired injection).
- Tag services (`#[AsEventListener]`, `#[AsMessageHandler]`, custom tags) instead of manually wiring them into a compiler pass, unless the wiring genuinely needs custom ordering logic a tag can't express.

## Doctrine ORM

- Migrations are the only path to schema change in every environment including local dev. Never rely on `doctrine:schema:update --force` outside a throwaway sandbox — it has no rollback and drifts from what migrations describe.
- One entity, one table, one repository — don't reach into another aggregate's repository from inside a service when the entity's own repository already exposes what you need.
- Use the repository pattern Symfony ships (`ServiceEntityRepository`) rather than hand-rolling a data-mapper on top of the `EntityManager` in application code — query methods belong on the repository, not scattered through controllers/services.
- Avoid N+1 query patterns: eager-fetch or DQL-join associations you know you'll access in a loop; don't `foreach` over an entity collection expecting Doctrine to have loaded a related entity for free.

## Messenger (async)

- Reach for Messenger when work should survive the request — emails, webhooks, heavy processing — not as a default for every side effect. A synchronous call is simpler and easier to debug when the caller genuinely needs the result before responding.
- One message class, one handler (`#[AsMessageHandler]`). Handlers stay thin: deserialize the message, delegate to the actual domain/service code, don't grow business logic inside the handler itself.
- Configure a failure transport and either a retry strategy or an explicit dead-letter path — an unhandled message that silently disappears after N retries is a production incident waiting to happen.

## Console commands

- One command class per operation (`#[AsCommand(name: 'app:...')]`), constructor-injected like any other service — commands are services, so DI works the same way here as in a controller.
- Validate `InputInterface` arguments before doing anything with side effects; fail with a clear message and non-zero exit code rather than half-running.
- Keep the command class thin — same discipline as a controller: parse input, call application/domain code, format output.

## Environment and secrets

- `.env` in the repo holds non-sensitive defaults, committed. `.env.local` (gitignored) overrides per-machine values and never gets committed.
- Real secrets (API keys, DB credentials in prod) go through the Symfony secrets vault (`secrets:set`, encrypted `.env.<env>.encrypted`) or the deployment platform's secret store — never as plaintext in `.env.local.php` or a committed `.env.prod`.
- `APP_SECRET` and any credential must differ between environments; a shared secret across dev/staging/prod defeats the vault's purpose.

## Testing

- `KernelTestCase` for tests that need the container/services but not HTTP — boot the kernel, fetch a service, assert behavior.
- `WebTestCase` for functional tests through the HTTP layer — `$client->request()`, assert response status/content, exercise routing and the full middleware stack.
- Use a dedicated `test` environment database, reset between test runs (fixtures or transaction rollback) — functional tests sharing dev's database produce flaky, order-dependent failures.
- Unit-test domain/service logic without booting the kernel at all; reserve `KernelTestCase`/`WebTestCase` for what actually needs the framework wired up.
