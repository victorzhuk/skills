---
name: z-go-api-design
description: REST API contract design for OpenAPI-first Go, before ogen generates the transport — path versioning, keyset/cursor pagination, Idempotency-Key, RFC 9457 problem+json errors, PATCH-merge-patch semantics, and ETag/If-Match concurrency. Triggers on "REST versioning", "cursor pagination", "Idempotency-Key", "problem+json", "PATCH vs PUT", "ETag". Does not cover codegen, aggregates, or keyset SQL; see [[z-go-ogen]], [[z-domain-modeling]], [[z-go-database]].
---

# REST API contract design

The contract is what's frozen into `openapi.yaml` before `ogen` generates a single line of transport code. Get these decisions right there — regenerating code is cheap, migrating clients off a wrong contract is not.

## Quick reference

| Decision | Default | Escalate to |
|---|---|---|
| Versioning | Path (`/v1`) | — pick once, org-wide |
| Pagination | Keyset/cursor | Offset only for small bounded admin lists |
| Idempotency | `Idempotency-Key` + server-side key store | required on every unsafe POST that creates or charges |
| Errors | RFC 9457 `application/problem+json` | — one shared schema, always |
| Update semantics | `PATCH` = JSON Merge Patch (RFC 7396) | JSON Patch (RFC 6902) only for array-position ops or atomic `test` preconditions |
| Concurrency | none (last-write-wins) | ETag/If-Match once lost updates are a real, reported problem |

## Versioning

- Put the version in the path: `/v1/orders`. Pick this once, org-wide — don't let one service run path versioning while another runs headers.
- Evolve additively within a version: new fields, new optional query params, new endpoints. Existing clients keep working untouched.
- Bump the version only on a breaking change: removing or renaming a field, changing a field's type or meaning, tightening validation on existing input, or removing an endpoint.
- Honest note on the alternative: header/media-type versioning (`Accept: application/vnd.myapp.v2+json`) is the cleaner design on paper — content negotiation instead of URL churn. It loses in practice because CDNs, proxies, and gateway routing rules key on the path far more reliably than on `Accept`, ad-hoc `curl`/browser debugging needs the version visible in the URL, and canary/blue-green routing is trivial against a path prefix and awkward against a header. Path versioning is the pragmatic default for exactly this reason.
- Never bump the major version for an additive change — that forces every client to re-integrate for nothing.

## Pagination

- Default to keyset (cursor) pagination for any collection that grows without bound: orders, bookings, events, audit logs.
- Offset (`?page=3&size=20`) skips or duplicates rows under concurrent writes — a row inserted or deleted between page 2 and page 3 shifts every offset after it. Acceptable only for small, bounded, low-write lists (a country lookup table, an admin config list) where the whole set is cheap to scan anyway.
- Cursor shape: opaque to the client. Base64-encode the last row's sort key(s) as a small JSON object, e.g. base64 of `{"created_at":"2026-07-01T12:00:00Z","id":"01912e3e-7b1a-..."}`. Clients pass it back as `?cursor=<token>` and must never construct or decode it themselves — treat the shape as private and free to change.
- `ORDER BY` needs a unique tie-breaker column: `ORDER BY created_at DESC, id DESC`. Sorting on `created_at` alone drops or duplicates rows whenever two rows share a timestamp; a UUIDv7 id (below) breaks every tie deterministically because it's already time-ordered.
- Response shape: `{"items": [...], "next_cursor": "..." | null}`. `next_cursor: null` means last page — don't make clients infer it from `len(items) < page_size`.
- The keyset `WHERE (created_at, id) < (?, ?)` query itself belongs to the repository layer; see [[z-go-database]].

## Idempotency

- Every unsafe POST that creates or charges something — order creation, payment capture, refund — accepts an `Idempotency-Key` header from the caller:

```yaml
parameters:
  IdempotencyKey:
    name: Idempotency-Key
    in: header
    required: true
    schema: { type: string, format: uuid }
```

- Note on status: `Idempotency-Key` is not an RFC. `draft-ietf-httpapi-idempotency-key-header` expired in the IETF httpapi working group without reaching Proposed Standard. Treat it as the de-facto convention Stripe popularized, not a ratified spec — solid enough to ship, but don't cite it as "per RFC" in your own docs.
- Server-side store: `(client_id, key) → (request_hash, response_body, status_code, expires_at)`. On a repeat request with the same key:
  - same `request_hash` → replay the stored response verbatim, without re-executing the handler.
  - different `request_hash` under the same key → `409`/`422`, reject it. A client reusing a key for a different request body is a bug on their side; never silently execute either version.
- TTL the key store — 24 hours is a common default, long enough to cover retry storms, short enough that the table doesn't grow unbounded.
- This is the duplicate-charge guard on the money path. Treat a missing or broken idempotency store on a payment endpoint as a P0, not a nice-to-have.
- Scope keys per authenticated client, not globally — two different clients reusing the same key string must never collide.
- The calling side's job — retrying with the same key, backing off, honoring `Retry-After`, walking `next_cursor` pages — is a separate contract; see [[z-go-http-client]].

## Error shape

- Use RFC 9457 `application/problem+json` for every error response — it obsoletes RFC 7807 and keeps the same media type with refined fields.
- This shop's shared schema requires `type`, `title`, `status` — RFC 9457 itself leaves every member optional/advisory, but pinning these three keeps error bodies predictable across services. `detail`/`instance` are free-form extras, not contractual. `type` is the stable, machine-readable field clients branch on — a short code like `order/insufficient_stock`, not a URI that has to resolve, and never free text that changes wording between releases. Add extension members for field-level validation detail.
- Only a `type` change is a breaking change. `title`/`detail` wording is free to improve without a version bump.
- Declare the problem schema once in `openapi.yaml` as a reusable component and reference it from every operation's error responses. One shared shape — not a bespoke error body per endpoint:

```yaml
components:
  schemas:
    Problem:
      type: object
      required: [type, title, status]
      properties:
        type: { type: string, example: order/insufficient_stock }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        instance: { type: string }
  responses:
    Problem:
      description: Error response
      content:
        application/problem+json:
          schema: { $ref: "#/components/schemas/Problem" }
```

## PUT vs PATCH

- `PUT` replaces the whole resource: the body is the complete representation, omitted fields are cleared rather than left alone. Idempotent by definition — the same body applied twice leaves the same state.
- `PATCH` default: JSON Merge Patch (RFC 7396, which obsoleted the original RFC 7386), media type `application/merge-patch+json`. The body mirrors the resource shape — present fields overwrite, `null` deletes, absent fields are untouched. It matches how most callers already think about "change these fields."
- Escalate to JSON Patch (RFC 6902, `application/json-patch+json`) only when Merge Patch genuinely can't express the operation: positional array insert/move/remove, or an atomic multi-op request with a `test` precondition. Most CRUD resources never need this.
- Pick one `PATCH` semantics per resource and put it in the spec's `content` type — don't offer both on the same path.

## Resource naming

- Plural nouns for collections: `/orders`, `/excursions`. Never `/order` or `/getOrders`.
- No verbs in paths. `POST /orders/{id}/cancel` is the accepted exception for a state transition that isn't naturally a field update — don't extend the pattern to `/orders/{id}/updateStatus` when a `PATCH` on `status` would do.
- Sub-resource when the child can't exist without the parent and is fetched in that context: `/orders/{id}/items`. Query filter when it's the same collection sliced differently: `/orders?status=pending`, never `/orders/pending`.
- Nest one level deep at most. `/orders/{id}/items/{itemId}` is fine; `/orders/{id}/items/{itemId}/discounts/{discountId}` is a sign `discounts` wants its own top-level collection with a filter.

## Timestamps and IDs

- Timestamps: RFC 3339, UTC, always with an explicit offset (`2026-07-01T12:00:00Z`). Never a bare date or a local-time string. Store and transmit UTC; let the client localize.
- IDs: UUIDv7 (RFC 9562, which obsoletes RFC 4122 and adds versions 6–8). The leading 48 bits are a millisecond timestamp, so UUIDv7 sorts chronologically and stays index-friendly in Postgres, unlike UUIDv4's random scatter. Document the ID as opaque to the client regardless — never let a client parse the embedded timestamp or assume the format is stable.

## Concurrency control

- Default: none. Last-write-wins is fine for most resources — nobody notices two admins editing a description field seconds apart.
- Escalate to ETag/If-Match once lost updates are a real, reported problem: concurrent edits to the same resource are common, and silently dropping one is costly (inventory counts, booking availability, anything with a "two people edited this at once" ticket already in its history).
- Shape: `GET` returns `ETag: "<version-or-hash>"`. `PUT`/`PATCH` requires `If-Match: "<etag>"`; the server responds `412 Precondition Failed` when the current ETag doesn't match, and the client re-fetches and retries. Don't add this preemptively — it answers a specific "two writers clobbered each other" problem, not a general hardening pass:

```yaml
parameters:
  IfMatch:
    name: If-Match
    in: header
    required: true
    schema: { type: string }
responses:
  "412":
    description: resource was modified since the ETag was read
    content:
      application/problem+json:
        schema: { $ref: "#/components/schemas/Problem" }
```

## Do not

- Mix versioning schemes across services in the same org — one team on path, another on headers, breaks every shared gateway rule.
- Default to offset pagination for anything past a small bounded admin list — it silently drops or duplicates rows under concurrent writes.
- Skip idempotency on a POST that touches money because "retries are rare" — retries happen exactly when the network is unreliable, which is exactly when a duplicate charge is worst.
- Return free-text error bodies or a bespoke error shape per endpoint — every client ends up parsing `error.message` with a regex.
- Reach for JSON Patch when Merge Patch covers the update — it forces the client to construct an ordered operation array for what's usually "change these fields."
- Add ETag/If-Match to every resource by default — it answers a real lost-update problem, not a checkbox; most resources never see a concurrent-edit conflict.
- Expose an internal sequential integer as the public resource ID — it leaks row counts and growth rate and invites enumeration.

## Verify

Read the diff against `openapi.yaml` and confirm:

- every path carries the version prefix, and no endpoint bumps the major version for an additive change
- every collection likely to outgrow a page or two takes a `cursor` query param, not `page`/`offset`
- every unsafe POST that creates or charges declares `Idempotency-Key` as a request header
- every operation's error responses reference one shared `application/problem+json` schema with a `type` field, not an inline one-off
- `PATCH` operations declare `application/merge-patch+json` (or, deliberately, `application/json-patch+json`) as the request content type
- paths use plural nouns with no verbs beyond documented state-transition actions
- every timestamp field uses `format: date-time` (RFC 3339), never a bare `date`-only field standing in for one
- only resources with a documented concurrent-edit history return `ETag` and require `If-Match` on mutation
