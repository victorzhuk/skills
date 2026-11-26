---
name: z-go-api-design
description: "Design Go REST contracts before generating OpenAPI transport code. Use for pagination, idempotency, problem details, PATCH, and optimistic concurrency. Client retries belong to [[z-go-http-client]]."
---

# REST API contract design

Define caller-visible behavior in the OpenAPI contract before generating Go transport code.

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

- Preserve the project's versioning scheme. A path prefix such as `/v1/orders` lets gateways route by version.
- Test additions against deployed clients. A strict decoder can reject an unfamiliar response field.
- Version incompatible changes to fields, validation, meanings, or endpoints. Preserve compatible clients within the existing version.

## Pagination

- Use keyset pagination for growing collections. Offset pagination suits bounded lists with few concurrent writes.
- Treat the cursor as opaque. It can encode the last row's sort values, such as `created_at` and `id`.
- Reject invalid cursor fields. Base64 provides encoding only.
- Use a unique tie-breaker in `ORDER BY created_at DESC, id DESC`. Apply the same order in the continuation predicate.
- Return `items` and `next_cursor`. Return a null cursor on the final page. See [[z-go-database]].

## Idempotency

- Specify `Idempotency-Key` for create or payment requests that callers can retry.

```yaml
parameters:
  IdempotencyKey:
    name: Idempotency-Key
    in: header
    required: true
    schema: { type: string, format: uuid }
```

- Document the header's syntax, scope, expiry, and error responses. Check its [IETF status](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) before citing a standard.
- Store the request hash, state, response, and expiry under a unique authenticated client and key.
- Claim the key atomically before performing an effect. Reject mismatched payloads. Document the response to matching requests in progress.
- Replay the stored status and response for a completed request. Commit local effects and the completed result in one transaction.
- Persist an external operation before dispatch. Use the same downstream key for retries. Reconcile uncertain outcomes with the provider.
- Preserve unresolved operations across key expiry. Define the retry window against the provider's retention policy.
- Fail closed for payments when the idempotency store is unavailable. See [[z-go-messaging]] and [[z-go-http-client]].

## Error shape

- Use a shared `application/problem+json` schema when the API adopts RFC 9457.
- Document required members. This example requires `type`, `title`, and `status`. RFC 9457 permits their omission.
- Use a stable URI reference for `type`. An absolute URI avoids resolving one relative identifier differently across endpoints.
- Document extensions that clients can depend on. Changing those contracts or the meaning of a type can break clients. [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457#section-3.1.1)

```yaml
components:
  schemas:
    Problem:
      type: object
      required: [type, title, status]
      properties:
        type: { type: string, format: uri-reference, example: "https://example.org/problems/insufficient-stock" }
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

- Define which resource state a complete `PUT` replaces. Preserve server-managed fields according to the contract.
- Use JSON Merge Patch (`application/merge-patch+json`) for object updates. A null member removes the target member. An array value replaces the entire target array.
- Use JSON Patch (`application/json-patch+json`) for positional array changes or ordered operations with a `test` precondition.
- Declare the supported media type for each resource.

## Resource naming

- Use plural collection names such as `/orders`. Use a subresource for a child addressed through its parent.
- Use query parameters for filters, such as `/orders?status=pending`.
- Use an action endpoint for a state transition when a resource update cannot express the contract.

## Timestamps and IDs

- Represent instants with RFC 3339 and an explicit offset. Use UTC for services that require a canonical representation.
- Preserve the existing public ID contract. UUIDv7 includes a millisecond timestamp. Treat public IDs as opaque.

## Concurrency control

- Decide whether a lost update is acceptable before selecting last-write-wins.
- For costly concurrent changes, return a strong `ETag` on read. Require `If-Match` on updates.
- Reject a stale tag with `412 Precondition Failed`. Refetch the resource and reconcile changes before retrying.

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

## Checks

- Compare the new OpenAPI schema with the prior contract. Exercise an existing client.
- Page across equal sort keys. Check the continuation and final cursor.
- Test concurrent requests with one idempotency key. Cover a changed payload, rollback, unresolved external effect, and expired key.
- Check problem types, status, patch semantics, and timestamp round trips. Exercise a stale conditional update when supported.
