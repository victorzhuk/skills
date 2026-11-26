---
name: z-go-sqlc
description: "Generate Go database methods from SQL and schema files with sqlc. Use for sqlc.yaml, query annotations, static queries, and generated repository adapters. See [[z-go-database]] for runtime behavior."
---

# Go SQL with sqlc

Use sqlc for fixed query shapes in projects that generate Go database access from SQL.

## Choose the query shape

Inspect the project's database engine, driver, generator configuration, and schema source.
Represent a small set of query shapes with named queries when that keeps SQL readable.
For open-ended queries, bind values as parameters. Allowlist dynamic identifiers that the driver cannot bind.
Keep query-specific code at the database boundary.

## Workflow

1. **`schema.sql`** — the DDL sqlc type-checks against (or point at your migrations).
2. **`query.sql`** — queries annotated with a name and return kind:
   - `:one` returns a single row, `:many` returns a slice, `:exec` returns no rows
     (`:execrows` for affected count, `:batchexec` for batches).
3. **`sqlc.yaml`** — config (engine, query/schema paths, codegen target).
4. **`sqlc generate`** — emits `models.go`, `db.go`, and `*.sql.go` query methods.
5. **Use the generated `Queries`** from the repository layer.

## Minimal config (pgx/v5)

```yaml
# sqlc.yaml
version: "2"
sql:
  - engine: postgresql
    schema: db/migrations
    queries: db/queries
    gen:
      go:
        package: sqlc
        out: internal/infra/store/postgres/sqlc
        sql_package: pgx/v5
        emit_interface: true
        emit_json_tags: false
        emit_empty_slices: true
```

Paths above are one real layout, not a mandated one — `schema`/`queries`/`out`
go wherever fits the project.

```sql
-- query.sql
-- name: GetUser :one
SELECT id, email, created_at FROM users WHERE id = $1;

-- name: ListActiveUsers :many
SELECT id, email FROM users WHERE active = true ORDER BY created_at DESC;

-- name: CreateUser :exec
INSERT INTO users (email) VALUES ($1);
```

Call the generated methods with a `pgx` connection or pool and the generated parameter types.

```go
q := sqlc.New(pool)
user, err := q.GetUser(ctx, id) // user is sqlc.User, err is real or nil
```

## Fit with the repository layer

Keep generated query types within the database adapter when the domain has an independent contract.
Use the project's existing package layout. Convert database rows to domain values at that boundary.
Use the same schema source for the generator and database deployment.

## Verification

Regenerate with the project's pinned binary. Check the generated diff for the affected query.
Build the calling package. Exercise representative values, absent rows, and applicable SQL constraints against the supported database.

## Related

- [[z-go-database]] covers the database drivers that sqlc targets.
- [[z-go-codegen-patterns]] covers generator pins and reproducible output.
