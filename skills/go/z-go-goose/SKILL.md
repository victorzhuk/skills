---
name: z-go-goose
description: "Manage Go database migrations with goose. Use for numbered SQL files, Up and Down annotations, PL/pgSQL blocks, embedded migrations, and startup schema checks."
---

# Goose migrations

goose manages schema migrations as numbered SQL files with annotation markers. Apply them from
the CLI during development and CI, or embed them in the binary so the service ships its own schema.

## File structure

Put migration files in one directory. Give each file a unique numeric prefix and a descriptive name.

```
migrations/
  00001_init.sql
  00002_add_users.sql
  00003_add_status_index.sql
```

Goose compares numeric versions. Use a consistent filename width for directory listings. Gaps are valid.

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

Test each reversible Down migration. For irreversible changes, document and test the recovery procedure before deployment.

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

Give each compound SQL statement its own annotation pair.

## CLI usage

```sh
go install github.com/pressly/goose/v3/cmd/goose@v3.29.0

goose -dir ./migrations postgres "$DATABASE_URL" create add_jobs sql
goose -dir ./migrations postgres "$DATABASE_URL" status
goose -dir ./migrations postgres "$DATABASE_URL" up
goose -dir ./migrations postgres "$DATABASE_URL" down
```

Install the CLI at the version selected by the project.

Apply migrations during deployment or local setup. If startup owns migration, complete it before the process accepts traffic.

## Embed in the binary

Embed migrations when the executable must carry its own SQL files.

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

Configure the package-level filesystem and dialect once before concurrent use. See [[z-go-database]] for startup policy.

### Instance-specific migration sets

Use `goose.NewProvider` for an instance-specific filesystem or dialect. Check that the pinned goose version supports it.

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

Check the schema version before starting code that depends on a migration.

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

Update the required version with the code that depends on the migration.

## PostgreSQL enum storage

PostgreSQL native enums do not support removing individual values. Check the target server's rules before adding and using a value in one transaction.

```sql
-- Native enum
CREATE TYPE job_status AS ENUM ('pending', 'done');
ALTER TABLE jobs ADD COLUMN status job_status NOT NULL;
```

A text column permits Go-side validation. Other writers can bypass that validation.

```sql
-- Go validates the value
status text NOT NULL
```

Check existing rows and older readers before removing a value. Add a database constraint when all writers must use the same set.

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

Before running Down, migrate any rows that use `cancelled`. Coordinate accepted values with all running application versions.

## Migration maintenance

- Keep applied migrations immutable. Correct an error in a new migration.
- Separate heavy backfills from schema changes. Give the operator a resumable procedure.

## Checks

```sh
goose -dir ./migrations postgres "$DATABASE_URL" status
timeout 15m go test -parallel 4 -p 2 -count=1 -run Integration -timeout 10m ./...
```

Exercise Up on an empty database and on the previous schema with representative rows. Exercise Down or the documented recovery procedure on disposable data.
