---
name: z-go-goose
description: >
  Schema migrations for Go services using goose (github.com/pressly/goose) — numbered SQL files,
  up/down annotation blocks, PL/pgSQL and multi-statement wrapping with StatementBegin/End,
  embed.FS embedding, CLI application, bare-text enum pattern, and startup migration-version gating.
  Use when adding or changing schema migrations, wiring goose into a Go binary, choosing
  between bare text, text+CHECK, and native enum types, or gating binary startup on a required
  schema version.
  Triggers on "goose", "+goose StatementBegin", "goose up", "embed.FS migrations", "goose create".
  Does not cover sqlc codegen; see [[z-go-sqlc]]. Does not cover repository query patterns; see [[z-go-database]].
  See also: [[z-go-database]], [[z-go-sqlc]].
---

# Goose migrations

goose manages schema migrations as numbered SQL files with annotation markers. Apply them from
the CLI during development and CI, or embed them in the binary so the service ships its own schema.

## File structure

Migrations live in a dedicated directory (conventionally `db/migrations/` or `migrations/`).
Each file is numbered and named descriptively:

```
migrations/
  00001_init.sql
  00002_add_users.sql
  00003_add_status_index.sql
```

goose orders files lexically, so the numeric prefix must sort correctly. Pick a width and keep
it consistent. Never reuse a number; goose will error on collisions.

## Up/Down anatomy

```sql
-- +goose Up
CREATE TABLE jobs (
    id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name       text        NOT NULL,
    status     text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE jobs;
```

Always write a working `-- +goose Down`. Rollback-less migrations turn drift into an incident.

## PL/pgSQL and multi-statement blocks

Functions, procedures, and triggers contain inner semicolons that goose must not split on.
Wrap each such statement with `StatementBegin` / `StatementEnd`:

```sql
-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;
-- +goose StatementEnd

CREATE TRIGGER trg_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +goose Down
DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
DROP FUNCTION IF EXISTS set_updated_at();
```

Each `StatementBegin` / `StatementEnd` pair wraps exactly one statement; use multiple pairs
when a migration creates several functions.

## CLI usage

```sh
go install github.com/pressly/goose/v3/cmd/goose@latest

goose -dir ./migrations postgres "$DATABASE_URL" create add_jobs sql
goose -dir ./migrations postgres "$DATABASE_URL" status
goose -dir ./migrations postgres "$DATABASE_URL" up
goose -dir ./migrations postgres "$DATABASE_URL" down
```

`go install @latest` into the dev machine's `$GOBIN` is the house practice for the goose
CLI — unlike codegen tools (e.g. ogen), it is not pinned via a `go.mod` `tool` directive.

Apply during local dev setup and in CI. Never call `goose.Up` from an HTTP handler or
gRPC method — DDL under traffic causes lock contention and partial rollouts.

## Embed in the binary

Embedding lets the binary carry its own migrations without shipping SQL files as sidecars:

```go
import (
    "context"
    "database/sql"
    "embed"
    "fmt"

    "github.com/pressly/goose/v3"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

func applyMigrations(ctx context.Context, db *sql.DB) error {
    goose.SetBaseFS(migrationFiles)
    if err := goose.SetDialect("postgres"); err != nil {
        return fmt.Errorf("set dialect: %w", err)
    }
    if err := goose.UpContext(ctx, db, "migrations"); err != nil {
        return fmt.Errorf("migrate up: %w", err)
    }
    return nil
}
```

`goose.SetBaseFS` + `goose.SetDialect` + `goose.UpContext` is the house pattern — call it
once in `main()` or the application startup path, before binding any handlers. The
package-level state is set once at startup and never touched again, so the shared globals
aren't a real problem in practice.

### Upgrade path: `goose.NewProvider`

`goose.NewProvider` (v3.18+) replaces the package-level globals with a provider value —
useful once a binary embeds more than one migration set or needs per-instance dialect
control. Nothing here has migrated to it yet; treat it as a deliberate upgrade, not the
default:

```go
import "io/fs"

func applyMigrations(ctx context.Context, db *sql.DB) error {
    fsys, err := fs.Sub(migrationFiles, "migrations")
    if err != nil {
        return fmt.Errorf("sub fs: %w", err)
    }
    p, err := goose.NewProvider(goose.DialectPostgres, db, fsys)
    if err != nil {
        return fmt.Errorf("goose provider: %w", err)
    }
    if _, err = p.Up(ctx); err != nil {
        return fmt.Errorf("migrate up: %w", err)
    }
    return nil
}
```

## Startup version gate

When new code depends on a specific schema change, guard the binary against starting with a
stale database:

```go
func checkMigration(db *sql.DB, required int64) error {
    current, err := goose.GetDBVersion(db)
    if err != nil {
        return fmt.Errorf("get migration version: %w", err)
    }
    if current < required {
        return fmt.Errorf("schema at version %d, need %d — run migrations", current, required)
    }
    return nil
}
```

Keep the required version as a named constant in the binary, updated alongside the migration
file that justifies the bump. Call this in startup before any handler registration.

## Enums: text over CREATE TYPE

Native `CREATE TYPE` enums cannot have values removed and require non-transactional `ALTER TYPE`
in Postgres < 12 — avoid them:

```sql
-- avoid
CREATE TYPE job_status AS ENUM ('pending', 'done');
ALTER TABLE jobs ADD COLUMN status job_status NOT NULL;
```

The baseline is a bare `text NOT NULL` column, with validity enforced entirely in Go
(`Parse*` / `IsValid*` on the enum type). No `CHECK` constraint:

```sql
-- baseline
status text NOT NULL
```

This keeps adding or removing a value a Go-only change — no migration needed for the value
set itself. Tighten with a `CHECK` once a table sees enough direct-SQL risk (ad-hoc queries,
other services writing rows) that Go-side validation alone isn't enough:

```sql
-- tightening, once direct-SQL risk justifies it
status text NOT NULL CHECK (status = ANY (ARRAY['pending', 'done', 'failed']))
```

To add a value under a `CHECK`, replace the constraint:

```sql
-- +goose Up
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
    CHECK (status = ANY (ARRAY['pending', 'done', 'failed', 'cancelled']));

-- +goose Down
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
    CHECK (status = ANY (ARRAY['pending', 'done', 'failed']));
```

Update the corresponding Go enum (`Parse*` / `IsValid*`) in the same commit.

## Hard rules

- **Never edit an applied migration.** Once applied anywhere (dev, CI, prod), the file is
  immutable. Add a new migration to correct mistakes.
- **Never reuse a version number.** goose orders by filename; a gap in the sequence is fine,
  a collision is not.
- **Keep Down in sync with Up.** A Down that does not fully reverse its Up leaves the schema
  in an unknown state after rollback.
- **No heavy data migrations inside schema migrations.** Bulk backfills belong in a separate
  admin command or a documented operator runbook with explicit rollback steps.
- **Apply in CI/CD and dev setup only.** Never trigger migrations from request-handling code.

## Verify

```sh
goose -dir ./migrations postgres "$DATABASE_URL" status
go test -short -run Integration ./...
```

Confirm all pending migrations are applied, then run integration tests against a clean
container (testcontainers or a local Compose DB) to catch migration regressions before merge.
