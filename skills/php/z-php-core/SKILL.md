---
name: z-php-core
description: Modern PHP baseline — strict_types, typed properties/returns, enums, readonly, match, first-class callables; composer discipline, PSR-12, PHPStan, Pest/PHPUnit. Use for PHP, Symfony, Laravel, or Yii2 work — framework depth in references/{symfony,laravel,yii}.md. Does not cover input validation; see [[z-security-hardening]].
---

# PHP core

Write PHP like a maintained 8.x codebase, not a 5.x-era one: types everywhere, exceptions over error codes, composer as the only install path.

## Language baseline

`declare(strict_types=1);` as the first statement in every file that isn't a bootstrap/config file — without it, PHP coerces `"5"` to `5` at a typed call boundary instead of raising a `TypeError`.

```php
<?php

declare(strict_types=1);

final class Money
{
    public function __construct(
        public readonly int $cents,
        public readonly string $currency,
    ) {}
}
```

- Type every property, parameter, and return — including `void`, `never`, and union/nullable types. No untyped public property, no bare `array` where a shape is known (a class or a documented array-shape beats an untyped array).
- `readonly` properties for anything that shouldn't change after construction — value objects, DTOs, config structs. Combine with constructor promotion as above; don't write a separate assignment block for what promotion already does.
- Backed enums for closed sets of values instead of class constants or magic strings:

```php
enum OrderStatus: string
{
    case Pending = 'pending';
    case Shipped = 'shipped';
    case Cancelled = 'cancelled';
}
```

- `match` over `switch` for value-returning branches — no fallthrough footgun, and a missing case is a `\UnhandledMatchError` at runtime instead of a silently-skipped branch:

```php
$label = match ($status) {
    OrderStatus::Pending   => 'Awaiting shipment',
    OrderStatus::Shipped   => 'On the way',
    OrderStatus::Cancelled => 'Cancelled',
};
```

- First-class callable syntax instead of string/array callables — `strlen(...)`, `$this->method(...)` — they resolve at parse time and get full IDE/static-analysis support, unlike `'strlen'` or `[$this, 'method']`.
- Verify the exact current stable PHP release and your minimum target with find-docs before pinning `composer.json`'s `"php"` constraint — don't guess a version number here.

## Composer discipline

- Commit `composer.lock`. It pins the exact resolved dependency graph; without it, `composer install` can resolve a different tree on every machine and in CI.
- Set `"platform"` under `config` when the deploy PHP version differs from the dev machine's, so dependency resolution targets the right runtime:

```json
{
    "require": { "php": "^8.3" },
    "config": {
        "platform": { "php": "8.3.0" },
        "sort-packages": true
    },
    "autoload": {
        "psr-4": { "App\\": "src/" }
    }
}
```

- Autoload via PSR-4. No `classmap`/`files` autoloading for new application code except procedural bootstrap glue.
- Never `composer global require` a project dependency — global installs aren't reproducible across machines or CI. Project tooling (`phpstan`, `pest`, `php-cs-fixer`) goes in `require-dev`.
- Run `composer validate` before committing a `composer.json` change; run `composer audit` to catch known-vulnerable dependencies.

## Code style

- PSR-12 as the formatting floor, enforced by `php-cs-fixer` or `pint` (Laravel projects ship Pint by default). Pick one per repo — running both fights over the same file.
- Fix on save or via a pre-commit hook — never hand-format to match PSR-12, let the tool own it.
- One class per file, filename matches class name, namespace matches directory per PSR-4.

## Static analysis

- Run PHPStan at the highest level the codebase tolerates without drowning in noise. Level 9-10 (current major's ceiling) is the target for new code.
- Existing code adopts a baseline to freeze current debt and block new violations, not to silence analysis entirely:

```sh
vendor/bin/phpstan analyse --generate-baseline
```

- Don't raise the level and immediately suppress every new error with `@phpstan-ignore` inline — regenerate the baseline so debt stays visible and tracked, then pay it down incrementally instead of accreting more.
- Treat a PHPStan regression the same as a failing test: it blocks merge.

## Testing

- Pest is the default for new projects — expressive syntax, an active plugin ecosystem (architecture, browser testing), and it runs on top of PHPUnit so both can coexist:

```php
it('rejects a negative amount', function () {
    expect(fn () => new Money(-100, 'USD'))
        ->toThrow(InvalidArgumentException::class);
});
```

- An existing PHPUnit suite stays PHPUnit — don't force a framework migration to land a handful of new tests. A deliberate, dedicated migration is a different task from "add a test."
- Unit tests exercise domain logic in isolation; integration tests exercise framework-wired behavior (the harness differs per framework — see the references below).
- Test depth follows the project's own testing discipline; see [[z-testing-strategy]] for MVP vs existing-service classification.

## Error model

- Exceptions, not error codes or boolean return-and-check. A method that can fail either returns a definite value or throws — no `false`-on-failure APIs in new code.

```php
// bad — caller must remember to check, and the reason is lost
function findUser(string $id): User|false { ... }

// good — failure is explicit and carries a reason
function findUser(string $id): User
{
    return $this->users[$id] ?? throw new UserNotFoundException($id);
}
```

- Never suppress with `@` — it hides the failure instead of handling it. Catch the specific exception type, or let it propagate to a boundary that logs and converts it.
- Define domain exceptions per failure category (`UserNotFoundException extends DomainException`), not one generic `Exception` for everything catchable.
- Catch narrow, catch late — catch `Throwable` only at a true boundary (request handler, queue worker, CLI entrypoint), never mid-logic to swallow and continue.

## Framework routing

The language/tooling rules above apply everywhere; framework-specific depth lives in `references/` — read the matching file once you know which framework the code is in.

| Working in... | Read |
|---|---|
| Symfony | `references/symfony.md` |
| Laravel | `references/laravel.md` |
| Yii2 (most Yii2 work is maintaining an inherited app) | `references/yii.md` |

## Do not

- Suppress errors with `@` instead of catching or fixing the underlying condition.
- Leave a public property or function parameter untyped because "it could be anything."
- Autoload with `classmap`/`files` for new application code — PSR-4 only.
- Run `composer global require` for a project dependency, or skip committing `composer.lock`.
- Introduce a framework-specific pattern (Eloquent, Doctrine, ActiveRecord) without reading that framework's reference first — the conventions differ enough that Symfony habits break Laravel code and vice versa.
- Hand-format code to match PSR-12 instead of running the formatter.

## Verify

    composer validate
    vendor/bin/phpstan analyse
    vendor/bin/pest            # or: vendor/bin/phpunit
    vendor/bin/php-cs-fixer fix --dry-run --diff   # or: vendor/bin/pint --test

see [[z-testing-strategy]], [[z-security-hardening]]
