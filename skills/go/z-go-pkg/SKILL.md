---
name: z-go-pkg
description: "Query the pkg.go.dev v1 API for Go versions, package metadata, symbols, importers, and vulnerability records. Use for published modules. Use [[z-go-stdlib]] for the local toolchain."
---

# pkg.go.dev API

Use `https://pkg.go.dev/v1` for published package metadata. Consult the [API reference](https://pkg.go.dev/v1/api) for endpoint parameters and response fields.

## Endpoints

| Endpoint | Returns |
|---|---|
| `GET /v1/package/{path}` | Package metadata at `{path}` |
| `GET /v1/module/{path}` | Module metadata at `{path}` |
| `GET /v1/versions/{path}` | Versions of the module at `{path}` |
| `GET /v1/packages/{path}` | Packages contained in the module at `{path}` |
| `GET /v1/search?q={query}` | Search results |
| `GET /v1/symbols/{path}` | Symbols declared by the package at `{path}` |
| `GET /v1/imported-by/{path}` | Paths importing the package at `{path}` |
| `GET /v1/vulns/{path}` | Vulnerabilities for the module/package at `{path}` |

`{path}` is the import path appended directly, e.g. `/v1/package/github.com/google/go-cmp/cmp`.

## Versions

Use the route's documented `version` filter. Pin an exact version when answering a compatibility question.
Where supported, `main` and `master` select a default branch. Use the resolved version in the result.
If several modules provide a path, inspect the candidates. Select the owning module before reporting metadata.

## Handle responses

1. Check the HTTP status before decoding a successful response. A JSON error object is not a package record.
2. For a paginated route, continue while `nextPageToken` is nonempty, including after an empty page.
3. Repeat the original request with the returned token in the `token` parameter. Preserve the other parameters.
4. On HTTP 429, pause before retrying. Respect `Retry-After` when present. Bound retry time and attempts.
5. Report incomplete results when a required page fails. Keep incomplete results out of negative findings.

## Usage

Use an HTTP client that returns failure for unsuccessful responses. In Bash:

```bash
set -o pipefail
curl -fsSL --max-time 15 https://pkg.go.dev/v1/package/github.com/google/go-cmp/cmp | jq .
curl -fsSL --max-time 15 'https://pkg.go.dev/v1/package/github.com/google/go-cmp/cmp?version=master' | jq '{path, version}'
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

If the CLI is already installed, check its version and help first. The commands below illustrate the pinned client.

```bash
go install golang.org/x/pkgsite/cmd/internal/pkgsite-cli@v0.6.0

pkgsite-cli search "uuid"
pkgsite-cli package github.com/google/go-cmp/cmp
pkgsite-cli package --imported-by github.com/google/go-cmp/cmp
pkgsite-cli package --symbols github.com/google/go-cmp/cmp
pkgsite-cli module -versions github.com/google/go-cmp
pkgsite-cli module -packages -versions github.com/google/go-cmp
```

It handles pagination and formatting for you.

## Verification

Check the returned module path and resolved version against the requested package.
For a list response, check every continuation token before claiming the result is complete.
Check the [OpenAPI description](https://pkg.go.dev/v1/openapi.yaml) when a route or field differs.
