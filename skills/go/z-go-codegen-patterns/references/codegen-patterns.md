# Code Generation Patterns

## Injection Pipeline

A safe pipeline prevents partial writes and inconsistent output:

1. **Register** capabilities (extension points) and injections (what to insert) from all blocks.
2. **Validate** that every injection target exists — fail before writing any files.
3. **Sort** injections by priority (lower number = applied first).
4. **Group** injections by target file.
5. **Parse** each target file once using `dst.ParseFile` — `dst` here, not `go/parser`, because injection must preserve comments.
6. **Apply** typed injectors (`import`, `field`, `code`, `struct`).
7. **Print and write** formatted Go only when the file was modified.

If any step fails, abandon the entire generation run. Never leave a partially-injected file.

## AST With Comments

`go/ast` loses comments when printing modified trees. Use `github.com/dave/dst`:

```go
import (
    "github.com/dave/dst"
    "github.com/dave/dst/decorator"
    "github.com/dave/dst/dstutil"
)

fset := token.NewFileSet()
f, err := decorator.ParseFile(fset, path, src, parser.ParseComments)
if err != nil {
    return fmt.Errorf("parse %s: %w", path, err)
}

dstutil.Apply(f, func(cursor *dstutil.Cursor) bool {
    // inspect and modify nodes
    return true
}, nil)

var buf bytes.Buffer
if err := decorator.Fprint(&buf, fset, f); err != nil {
    return fmt.Errorf("print %s: %w", path, err)
}
```

## Virtual Contracts

Virtual entries in a manifest are contracts with no templates — they define a role that concrete entries can satisfy:

```yaml
# virtual/logger — contract only
id: virtual/logger
type: virtual
templates: []
provides:
  - match: logger

# infrastructure/zerolog — satisfies the contract
id: infrastructure/zerolog
provides:
  - match: logger
```

The registry resolves a consumer's `requires: logger` to whichever concrete provider is selected or the default. This decouples consumers from specific implementations — swap `zerolog` for `slog` without changing consumers.

## Manifest Schema Conventions

Consistent field naming reduces bugs in template context assembly:

| Field | Purpose | Convention |
|---|---|---|
| `id` | Unique identifier | `<category>/<slug>`, kebab-case |
| `name` | Human-readable label | Title case |
| `version` | Schema version | Semver `major.minor.patch` |
| `provides` | Roles this entry satisfies | Role strings, kebab-case |
| `requires` | Roles this entry depends on | Role strings, kebab-case |
| `conflicts` | Entries that cannot coexist | Full IDs |
| `capabilities` | Extension points exposed | See capability naming rules |

## Common Failures

| Symptom | Cause | Fix |
|---|---|---|
| `missing capability` | Required provider not selected or not exposing the capability | Add/select the providing entry |
| `comment marker not found` | Template marker and capability position drifted after refactor | Restore marker or update capability location |
| `failed to parse code` | Injection content is not valid Go | Fix the injection, run through `gofmt` first |
| YAML tab parse error | Tab in YAML indentation | Replace all tabs with 2 spaces |
| Bad import path | Import written manually instead of via injection | Use the injection pipeline for all import additions |
| Golden test drift | Template changed without updating golden files | Run tests with `-update`, review diff, commit |
| Formatted output differs | `gofmt` whitespace applied post-injection | Run `format.Source` on the complete file before writing |

## Golden File Workflow

```
1. Write test with golden comparison (fail on mismatch)
2. Run: go test -run TestGenerate -update ./...
3. Review generated diff: git diff testdata/
4. Confirm output is correct Go that compiles
5. Commit golden files alongside the generator change
```

CI runs the same test without `-update`. Any drift in generated output is a test failure.
