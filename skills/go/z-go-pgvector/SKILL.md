---
name: z-go-pgvector
description: pgvector-backed similarity search in Go — declaring vector(N) columns, encoding []float32 via pgvector.NewVector, distance operators (<->, <=>, <#>), ORDER BY ... LIMIT k queries, and choosing exact scan vs ivfflat vs hnsw indexes. Use when adding embedding storage or writing ANN queries. Triggers on "pgvector", "vector(1536)", "cosine distance", "<=>", "ivfflat", "pgvector.NewVector". Does not cover general SQL access or migrations; see [[z-go-database]].
---

# pgvector similarity search in Go

pgvector is a PostgreSQL extension that adds a `vector` type and distance
operators for ANN search. `github.com/pgvector/pgvector-go` wraps a `[]float32`
in a `pgvector.Vector` that pgx sends as a regular query parameter — no ORM,
no manual text encoding, once `pgxvec.RegisterTypes` is wired into the pool.

## Extension and column

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE items (
    id      bigserial PRIMARY KEY,
    content text      NOT NULL,
    embedding vector(1536)  -- dimension must match your model's output
);
```

The dimension is fixed at column creation. Changing it later requires
`ALTER TABLE items ALTER COLUMN embedding TYPE vector(N)` plus re-embedding
every row.

## Encoding []float32 for a query

Primary: `github.com/pgvector/pgvector-go` wraps a `[]float32` in a `pgvector.Vector`
that pgx sends as a query parameter directly — no manual casting.

```go
import (
    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/pgvector/pgvector-go"
    pgxvec "github.com/pgvector/pgvector-go/pgx"
)

cfg, err := pgxpool.ParseConfig(dsn)
if err != nil {
    return nil, fmt.Errorf("parse pool config: %w", err)
}
cfg.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
    return pgxvec.RegisterTypes(ctx, conn)
}
pool, err := pgxpool.NewWithConfig(ctx, cfg)
```

`pgxvec.RegisterTypes` in `AfterConnect` runs once per pooled connection. After
that, every SQL site passes `pgvector.NewVector(vec)` as a plain `$n` parameter:

```go
_, err = pool.Exec(ctx,
    "INSERT INTO items (content, embedding) VALUES ($1, $2)",
    content, pgvector.NewVector(embedding))
```

Fallback: skip the dependency and encode the vector as a Postgres text literal
yourself, cast with `::vector` at the call site:

```go
func toVectorLiteral(v []float32) string {
    parts := make([]string, len(v))
    for i, f := range v {
        parts[i] = fmt.Sprintf("%g", f)
    }
    return "[" + strings.Join(parts, ",") + "]"
}
```

```go
_, err = pool.Exec(ctx,
    "INSERT INTO items (content, embedding) VALUES ($1, $2::vector)",
    content, toVectorLiteral(embedding))
```

## Distance operators

| Operator | Distance | Notes |
|---|---|---|
| `<->` | L2 (Euclidean) | default; good for normalized unit vectors |
| `<=>` | cosine | use when vector magnitude is not meaningful |
| `<#>` | inner product | multiply by -1 to get similarity |

Choose one and be consistent — the index operator class must match the query
operator (see Index trade-off below).

## k-nearest-neighbour query

```sql
SELECT id, content,
       embedding <=> $1 AS distance
FROM items
ORDER BY distance
LIMIT $2
```

```go
type Result struct {
    ID       int64
    Content  string
    Distance float64
}

func Search(ctx context.Context, db *pgxpool.Pool, embedding []float32, k int) ([]Result, error) {
    rows, err := db.Query(ctx,
        `SELECT id, content, embedding <=> $1 AS distance
         FROM items
         ORDER BY distance
         LIMIT $2`,
        pgvector.NewVector(embedding), k)
    if err != nil {
        return nil, fmt.Errorf("vector search: %w", err)
    }
    defer rows.Close()

    var out []Result
    for rows.Next() {
        var r Result
        if err := rows.Scan(&r.ID, &r.Content, &r.Distance); err != nil {
            return nil, fmt.Errorf("scan: %w", err)
        }
        out = append(out, r)
    }
    return out, rows.Err()
}
```

Post-filter by a distance threshold in the use case, not in SQL — keeps the
query stable and avoids returning zero results when the threshold is tight:

```go
const maxDistance = 0.35

var filtered []Result
for _, r := range results {
    if r.Distance <= maxDistance {
        filtered = append(filtered, r)
    }
}
```

## Embedder interface

Define the embedder on the consumer side (use-case or repository package),
not in the infra package:

```go
type Embedder interface {
    Embed(ctx context.Context, text string) ([]float32, error)
}
```

Validate dimensionality at the infra boundary before returning:

```go
if len(vec) != cfg.Dim {
    return nil, fmt.Errorf("embed: got %d dims, want %d", len(vec), cfg.Dim)
}
```

Wire any OpenAI-compatible provider (OpenAI, Azure, LM Studio, vLLM) behind
this interface. Do not mark the API key as `required` if local keyless
providers must be supported.

## Index trade-off

| | Exact scan | ivfflat | hnsw |
|---|---|---|---|
| Index | none | `CREATE INDEX … USING ivfflat` | `CREATE INDEX … USING hnsw` |
| Build time | — | fast | slow (memory-intensive) |
| Query speed | O(n) full scan | fast | faster |
| Recall | 100 % | ~95–99 % (tune `lists`) | ~99 % (tune `m`, `ef_construction`) |
| When to add | < 100 k rows | 100 k – 1 M rows | > 1 M rows, latency-critical |

Start without an index. Exact scan is accurate and simple; add an index only
after profiling shows it matters.

```sql
-- ivfflat: lists ≈ sqrt(row_count), probe at query time with SET ivfflat.probes
CREATE INDEX ON items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- hnsw: higher m = better recall, more memory
CREATE INDEX ON items USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
```

The operator class (`vector_cosine_ops`, `vector_l2_ops`, `vector_ip_ops`)
must match the distance operator used in queries.

## Do not

- Skip `pgxvec.RegisterTypes` in `AfterConnect` when using pgvector-go — without
  it pgx has no codec for `pgvector.Vector` and the query fails to encode.
- Forget the `::vector` cast on the hand-rolled text-literal fallback — Postgres
  can't infer the column type from a bare string parameter.
- Change the vector column dimension without re-embedding all rows and running
  a migration.
- Apply distance thresholds in SQL (`WHERE embedding <=> $1 < 0.35`) — this
  prevents index use for `hnsw`/`ivfflat`.
- Mix operator classes between the index and query — results will be wrong
  or the index unused.

## Verify

```sh
# extension present
psql -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';"

# column type and dimension
psql -c "\d+ items"

# query uses index (look for "Index Scan" when index exists)
psql -c "EXPLAIN SELECT id, embedding <=> '[0,1,0]'::vector AS d FROM items ORDER BY d LIMIT 5;"

go test -short -race ./internal/repository/...
```
