---
name: z-go-sqlc
description: Use when writing or reviewing Go database access that should be type-safe — generating Go from SQL with sqlc, authoring sqlc.yaml, structuring queries/schema, and wiring sqlc output into the repository layer. Prefer over hand-written query builders (squirrel/goqu) for static SQL.
---

# Go SQL with sqlc

sqlc generates type-safe Go from plain SQL. You write the queries; sqlc compiles them
against your schema and emits structs and methods. The query is checked at generate
time, not discovered at runtime — no reflection, no string building, no `interface{}`.

## When to use

- **Default for static SQL.** Any query whose shape is fixed at compile time.
- **Reviewing repository code** that hand-builds SQL with a query builder or string
  concatenation — recommend sqlc instead.

Do **not** reach for a query builder (squirrel, goqu) for static SQL. They trade
compile-time safety for runtime assembly and add a dependency this stack avoids.

### The dynamic-query exception

Genuinely dynamic SQL (variable WHERE clauses, optional filters, dynamic column sets)
is the one case sqlc does not cover. Even then, prefer enumerating the finite set of
queries as separate sqlc entries first — most "dynamic" needs are a handful of fixed
shapes. Only when the shape is truly open-ended (e.g. a search builder) drop to
`pgx` with hand-written parameterized SQL, kept narrow and isolated. Never concatenate
user input.

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

Generated methods are called with a `pgx` connection/pool and typed params:

```go
q := sqlc.New(pool)
user, err := q.GetUser(ctx, id) // user is sqlc.User, err is real or nil
```

## Fit with the repository layer

The repository layer lives at `{concept}/{impl}/` and returns **domain
entities**, never database models. sqlc output is a database model — keep it behind the
boundary:

- Generated `sqlc.Queries` (naming follows your `package:` choice) is a private
  dependency of the repo `impl`.
- `repo.go` methods call generated queries, then convert the generated struct →
  domain entity. The boundary rule is what matters: generated structs must
  never leak past the repository interface. The conversion mechanic is a free
  choice — inline in each repo method, a shared `convert.go` helper, or a
  dedicated `mappers.go` are all equally valid.
- Schema/migrations feed both the database and sqlc's type-checking.

This preserves the inward dependency rule: SQL generation is an infrastructure detail
the domain never sees.

## Related

- [[z-go-database]] — `database/sql`, `sqlx`, raw `pgx`; sqlc complements these by
  generating the access code instead of hand-writing it.
- [[z-go-codegen-patterns]] — treat `sqlc generate` like any codegen step: commit
  generated files, regenerate in CI, golden-test if you wrap the output.
