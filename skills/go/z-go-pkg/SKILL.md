---
name: z-go-pkg
description: Query the official pkg.go.dev API (v1beta) for Go module and package metadata — package info, module versions, symbols, imported-by, search, and vulnerabilities. Use for authoritative, machine-readable Go module data instead of scraping pkg.go.dev HTML or guessing. Triggers on module version lookup, symbol listing, imported-by search, vulnerability check, package search.
---

# pkg.go.dev API

Authoritative metadata for published Go modules via a stateless, GET-only HTTP API. Use this instead of scraping pkg.go.dev HTML or relying on stale training data about versions, symbols, or dependents.

Base URL: `https://pkg.go.dev/v1beta`
Interactive spec: https://pkg.go.dev/api · OpenAPI: https://pkg.go.dev/v1beta/openapi.yaml

## Endpoints

| Endpoint | Returns |
|---|---|
| `GET /v1beta/package/{path}` | Package metadata at `{path}` |
| `GET /v1beta/module/{path}` | Module metadata at `{path}` |
| `GET /v1beta/versions/{path}` | Versions of the module at `{path}` |
| `GET /v1beta/packages/{path}` | Packages contained in the module at `{path}` |
| `GET /v1beta/search?q={query}` | Search results |
| `GET /v1beta/symbols/{path}` | Symbols declared by the package at `{path}` |
| `GET /v1beta/imported-by/{path}` | Paths importing the package at `{path}` |
| `GET /v1beta/vulns/{path}` | Vulnerabilities for the module/package at `{path}` |

`{path}` is the import path appended directly, e.g. `/v1beta/package/github.com/google/go-cmp/cmp`.

## Versions

`package`, `module`, and `symbols` endpoints accept an optional `?version=` query param. Default is the latest tagged version.

- Semantic version: `?version=v1.2.3`
- Branch: `?version=master` or `?version=main` only (resolves to a pseudo-version). Arbitrary branch names are NOT supported.

## Precision over convenience

The API requires the module to be unambiguous. If a package path could be provided by multiple modules (e.g. `example.com/a/b/c` from either `example.com/a` or `example.com/a/b`), the API does NOT apply the web UI's "longest module path" rule — it returns candidates and an error asking you to be more specific. The web interface auto-resolves; the API does not.

## Usage

Plain `curl` + `jq`:

```bash
curl -s https://pkg.go.dev/v1beta/package/github.com/google/go-cmp/cmp | jq .
curl -s "https://pkg.go.dev/v1beta/package/github.com/google/go-cmp/cmp?version=master" | jq '{path, version}'
```

Example package response:

```json
{
  "modulePath": "github.com/google/go-cmp",
  "version": "v0.7.0",
  "isLatest": true,
  "isStandardLibrary": false,
  "goos": "all",
  "goarch": "all",
  "path": "github.com/google/go-cmp/cmp",
  "name": "cmp",
  "synopsis": "Package cmp determines equality of values.",
  "isRedistributable": true
}
```

## Reference CLI (pkgsite-cli)

A reference client. CLI surface is NOT yet stable; the HTTP API is.

```bash
go install golang.org/x/pkgsite/cmd/internal/pkgsite-cli@latest

pkgsite-cli search "uuid"
pkgsite-cli package github.com/google/go-cmp/cmp
pkgsite-cli package --imported-by github.com/google/go-cmp/cmp
pkgsite-cli package --symbols github.com/google/go-cmp/cmp
pkgsite-cli module -versions github.com/google/go-cmp
pkgsite-cli module -packages -versions github.com/google/go-cmp
```

It handles pagination and formatting for you.

## Notes

- Stateless and cacheable — safe to call repeatedly; prefer it over HTML scraping.
- `/v1beta` is current; a stable `/v1` is intended after the feedback period. Backward compatibility is committed to for existing integrations.
- When in doubt about exact field names or new endpoints, fetch the OpenAPI spec rather than guessing.
