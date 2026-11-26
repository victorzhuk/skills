---
name: z-postgres-table-design
description: "Design PostgreSQL tables, constraints, indexes, partitions, and row security. Use for DDL, JSONB, or physical storage. See [[z-go-database]] for queries and [[z-go-goose]] for migrations."
---

# PostgreSQL table design

## Define the data contract

1. Check the deployed PostgreSQL major version, extensions, access patterns, and retention requirements.
2. Give each identifiable entity a primary key. Define the required uniqueness for append-only data even when it lacks a primary key.
3. Normalize relationships first. Denormalize where measurements justify the extra consistency work.
4. Declare required fields with `NOT NULL`. A `CHECK` passes on unknown, so `CHECK (price > 0)` alone permits null.
5. Choose foreign-key actions to match parent updates and deletes. Add deferred checks only when a transaction requires them.
6. Use `UNIQUE NULLS NOT DISTINCT` on PostgreSQL 15+ when nulls must compare equal for uniqueness.

Primary and unique constraints normally create their supporting indexes. PostgreSQL does not automatically index *referencing* foreign-key columns.
Check existing indexes first. Add a suitable index when joins or parent updates and deletes would otherwise scan the child table.
An index can reduce lookup work. It does not eliminate locking. [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)

## Choose types

| Data | Decision |
|---|---|
| Identifier | Use identity columns for database-assigned integers. Sequences can have gaps. Choose UUIDs when distributed creation or the public contract requires them. |
| Numbers | Size integers for their range. Use `numeric` for exact decimal values. A constrained scale can round values. |
| Text and binary | Use `text` or `bytea`. Add a length constraint when required. Use a matching collation or expression index for case-insensitive comparisons. |
| Time | Use `timestamptz` for an instant, `date` for a calendar date, and `timestamp` for an intentional local wall time. |
| Current time | `now()` reports transaction start time. `clock_timestamp()` reads the current wall clock. |
| Categories | Use enums for stable sets. Consider a check constraint or reference table for evolving values. |
| Collections | Use arrays for lists and junction tables for relationships. Select range bounds explicitly for dates, times, or numbers. |
| Specialized values | Use native network, geometric, text-search, domain, or composite types when their operators match the contract. |
| Flexible attributes | Use `jsonb` for structured queries. Use `json` when the original input text matters. Keep relational fields in typed columns. |

Large tuples can trigger TOAST compression or out-of-line storage. The threshold applies to tuple size. Storage strategy and compressibility affect individual values.
Use `GENERATED ALWAYS AS (...) STORED` when a stored derived field fits. Check virtual-column availability and restrictions on PostgreSQL 18+.
Use `uuidv7()` only on a supporting version. Check extension availability before selecting pgvector, PostGIS, pg_trgm, citext, or TimescaleDB.

## Select indexes and storage

| Access pattern | Candidate |
|---|---|
| Equality, ranges, ordering | B-tree. Select key order from actual predicates. Inspect the plan before relying on a non-leading key. |
| Covering reads | Consider `INCLUDE`. Index-only scans can still visit heap pages when visibility information is absent. |
| Small recurring subset | Use a partial index when the planner can establish its predicate. Check parameterized queries. |
| Derived lookup | Use a matching expression index, such as `lower(email)`. |
| JSONB, arrays, full text | Match the GIN operator class to the query. Use an explicit text search configuration for indexed expressions. |
| Range overlap, geometry | Evaluate GiST and exclusion constraints. Check the operator class, including mixed scalar/range exclusions. |
| Large correlated ranges | Evaluate BRIN with representative on-disk ordering. |

For JSONB, default GIN supports existence and containment. `jsonb_path_ops` supports `@>`, `@?`, and `@@`, without key-existence operators.
For scalar range filters, compare a typed expression or generated column with a B-tree index.
Use constraints such as `CHECK (jsonb_typeof(attrs) = 'object')` when clients require an object.

Choose temporary tables for session data. Use unlogged tables for rebuildable data where crash loss is acceptable.
Inspect HOT updates and page space before changing fillfactor. Each index adds write cost.
For bulk ingestion, compare `COPY` and multi-row inserts. Preserve constraints while loading.
Use a matching unique arbiter for `ON CONFLICT DO UPDATE`. Use `DO NOTHING` when the application can skip the conflicting row.

## Partition and migrate

Use partitioning for measured pruning or bounded maintenance, such as dropping expired date ranges. There is no universal row-count threshold.
Choose range, list, or hash partitions from the workload. Check that key constraints include all required partition columns.
Use `ORDER BY` for defined result order. Neither a primary key nor a one-time `CLUSTER` guarantees read order.

Check DDL locks, rewrite cost, and dependency changes on the deployed major.
Run `CREATE INDEX CONCURRENTLY` outside a transaction block. Check index validity after a failure.
Check whether a new column default requires a rewrite. Changing a function's argument types can create an overload.
Use [[z-go-goose]] for migration execution and [[z-go-database]] for transaction handling.

## Restrict row access

Derive identity from authenticated context. Define read and write policies for the actual application role.
Ordinary owners bypass RLS unless forced. Superusers and roles with `BYPASSRLS` can bypass even forced policies.
Check permitted and denied reads and writes as the application role.

## Examples

```sql
CREATE TABLE users (
  user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON users (LOWER(email));
CREATE INDEX ON users (created_at);
```

```sql
CREATE TABLE orders (
  order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','CANCELED')),
  total NUMERIC(10,2) NOT NULL CHECK (total > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON orders (user_id);
CREATE INDEX ON orders (created_at);
```

```sql
CREATE TABLE profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(user_id),
  attrs JSONB NOT NULL DEFAULT '{}',
  theme TEXT GENERATED ALWAYS AS (attrs->>'theme') STORED
);
CREATE INDEX profiles_attrs_gin ON profiles USING GIN (attrs);
```

## Check the schema

Run the DDL on a disposable database with the deployed major. Exercise constraints, conflicts, and cross-tenant access.
Use representative query plans and lock observations to justify indexes. Compare migration behavior with existing data.
