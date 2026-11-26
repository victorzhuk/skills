---
name: z-php-core
description: "Maintain PHP services with scalar types, enums, Composer, PHPStan, and Pest or PHPUnit. Use the framework reference for Symfony, Laravel, or Yii2."
---

# PHP services

## Use the deployed language version

Check the supported PHP versions in Composer and CI before introducing syntax.
Put `declare(strict_types=1);` at the start of a PHP source file when using strict scalar types.
The calling file controls scalar parameter coercion for calls from PHP code. The declaring file controls scalar return checks.
Strict typing still permits an integer for a float parameter. Check external data against its input contract. [PHP type declarations](https://www.php.net/manual/en/language.types.declarations.php)

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

Type public parameters, properties, and results. Document known array shapes or use a dedicated value type.
Use constructor promotion for simple assignments. A readonly property can still refer to a mutable object.

```php
enum OrderStatus: string
{
    case Pending = 'pending';
    case Shipped = 'shipped';
    case Cancelled = 'cancelled';
}
```

Use a backed enum for a closed set with a stable external representation.
Use `match` for value-returning branches. An unmatched value without a default raises `UnhandledMatchError`.

```php
$label = match ($status) {
    OrderStatus::Pending   => 'Awaiting shipment',
    OrderStatus::Shipped   => 'On the way',
    OrderStatus::Cancelled => 'Cancelled',
};
```

First-class callable syntax, such as `strlen(...)`, requires a compatible PHP version.

## Manage dependencies and style

Commit the application lockfile. Install project tools through `require-dev`.
Set Composer's platform constraint when resolving on a different runtime. Check actual platform requirements on the deployment target.

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

Use the project's PSR-4 mapping for new classes. Match the existing formatter, such as PHP-CS-Fixer or Laravel Pint.
Use the configured PHPStan level. Review each baseline entry when adopting analysis on an existing codebase.

```sh
vendor/bin/phpstan analyse --generate-baseline
```

## Preserve error and test contracts

Return typed values and throw specific exceptions for failures in new APIs when that matches project conventions.
Catch exceptions where a caller can recover or translate the error. Keep broad exception handling at the application boundary.

```php
// An existing lookup that returns false needs an explicit caller branch.
if (($user = $repository->findUser($id)) === false) {
    throw new UserNotFoundException($id);
}

// A repository that promises User can raise the exception at the lookup.
final class UserRepository
{
    /** @param array<string, User> $users */
    public function __construct(private array $users) {}

    public function findUser(string $id): User
    {
        return $this->users[$id] ?? throw new UserNotFoundException($id);
    }
}
```

Preserve the existing PHPUnit or Pest suite. Test the actual invariant. Reject negative amounts only if the domain requires that rule.
Run tests through the bounded project wrapper. See [[z-testing-strategy]] and [[z-security-hardening]].

## Check the project

1. Run `composer validate` and the project's dependency audit.
2. Run the configured PHPStan and formatter checks. Use check mode when inspecting the tree.
3. Exercise the changed behavior through the project's runtime and framework.

Read the applicable [Symfony](references/symfony.md), [Laravel](references/laravel.md), or [Yii2](references/yii.md) reference.
