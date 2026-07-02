---
name: z-go-codegen-patterns
description: Use when authoring Go code generators, scaffold tools, AST manipulation, template-based codegen, golden-file tests, or YAML-driven generation pipelines. Also use when debugging generated output (wrong file content, injection failures, template rendering errors, YAML parse errors). Does not cover quality of the generated code itself; see [[z-go-style]] and [[z-go-testing]].
---

# Go Code Generation Patterns

Code generators produce Go source files from templates, AST manipulation, or a combination. The key principle: manipulate Go as a structured program, not as text.

## When to Use

- Writing or editing a code generator or scaffold tool
- Authoring Go templates (`*.go.tmpl`)
- Designing a YAML-driven manifest or block schema
- Adding AST injection to a generator pipeline
- Writing golden-file tests for generated output
- Debugging injection failures or template rendering errors

## AST Over String Edit

Never build generated Go source with `strings.Replace` or template string concatenation — it's fragile and breaks on formatting changes:

```go
// Bad — fragile, breaks on formatting changes
content = strings.Replace(content, "// INSERT FIELDS HERE", newField, 1)

// Good — parse, mutate, format
fset := token.NewFileSet()
f, err := parser.ParseFile(fset, path, src, parser.ParseComments)
if err != nil {
    return fmt.Errorf("parse %s: %w", path, err)
}
if !astutil.AddNamedImport(fset, f, alias, importPath) {
    return fmt.Errorf("add import %q: already present or failed", importPath)
}
var buf bytes.Buffer
if err := format.Node(&buf, fset, f); err != nil {
    return fmt.Errorf("format %s: %w", path, err)
}
```

Default toolchain: stdlib `go/parser` + `golang.org/x/tools/go/ast/astutil` — `astutil.AddNamedImport`, `astutil.Apply` for cursor-based traversal. Reach for `github.com/dave/dst` (`dstutil.Apply`) only when the edit must preserve comments through the round-trip — `go/ast` + `go/printer`/`format.Node` drops them.

Regex on Go source is fine for read-only existence checks — it's writing new source by string edit that's fragile, not detecting whether something already exists:

```go
func HasGoFunction(src []byte, name string) bool {
    pat := `func\s+(\([^)]*\)\s+)?` + regexp.QuoteMeta(name) + `\s*\(`
    return regexp.MustCompile(pat).Match(src)
}
```

> Read [references/codegen-patterns.md](references/codegen-patterns.md) for the full injection pipeline design, virtual contract patterns, and common failure modes.

## Template Context Design

Pass a well-typed struct to templates, not `map[string]any`:

```go
type GenerationContext struct {
    ModuleName  string
    PackageName string
    Vars        map[string]string
}

// Add helper methods for logic that would be messy in the template
func (c GenerationContext) ImportPath(rel string) string {
    return path.Join(c.ModuleName, rel)
}
```

Keep templates free of business logic. Move decisions (if/else chains, string transforms) into helper methods on the context struct.

## YAML Indent Discipline

YAML uses spaces, never tabs. A single tab causes a parse error:

```
yaml: found a tab character where an indentation space is expected
```

Rules:
- 2-space indentation in all YAML templates.
- Never use `\t` in any YAML literal.
- Test YAML templates by parsing the output with `yaml.Unmarshal` — don't just assert strings.

## Schema Validation Before Render

Validate the manifest or schema before executing templates:

```go
if err := schema.Validate(block); err != nil {
    return fmt.Errorf("validate block %s: %w", block.ID, err)
}
```

Early validation produces readable errors. Template execution errors on invalid input are hard to trace back to a source.

## Test Strategy

Use golden files for generated output:

```go
var update = flag.Bool("update", false, "update golden files")

func TestGenerate_HTTPServer(t *testing.T) {
    got, err := generator.Render(ctx, httpServerBlock, testVars)
    require.NoError(t, err)

    golden := filepath.Join("testdata", "http_server.go.golden")
    if *update || os.Getenv("UPDATE_GOLDEN") == "1" {
        require.NoError(t, os.WriteFile(golden, got, 0o644))
    }
    want, _ := os.ReadFile(golden)
    assert.Equal(t, string(want), string(got))
}
```

Regenerate goldens on intentional changes with `-update` or `UPDATE_GOLDEN=1 go test ./...` — both are real, equally valid toggles; pick whichever fits how the project already invokes tests. Never commit goldens that fail to compile — run `go build ./...` on generated output in CI.

## Injection Pipeline

A safe pipeline order prevents partial writes:

1. Register capabilities (extension points) and injections (what to insert).
2. Validate every injection target exists — fail before writing any files.
3. Sort injections by priority (lower = applied first).
4. Group by target file.
5. Parse each target file once.
6. Apply typed injectors (`import`, `field`, `code`, `struct`).
7. Write formatted Go only when the file was modified.

If any step fails, abandon the entire generation run — never leave a partially-injected file.

## Quick Reference

| Pattern | Rule |
|---|---|
| AST manipulation | `go/parser` + `astutil` by default; `dst` only to preserve comments |
| Existence detection | Regex on raw source is fine for read-only checks |
| Template context | Typed struct with helpers, not `map[string]any` |
| YAML indentation | Spaces only, 2-space indent, tested by parse |
| Schema validation | Before render, not after |
| Test strategy | Golden files + `-update` flag or `UPDATE_GOLDEN=1` env var |
| Injection pipeline | Parse once, apply all injectors, write only if modified |

## Checklist

- [ ] No `strings.Replace` or string concatenation to write generated Go source
- [ ] Regex on Go source, if used, is read-only detection, not a source edit
- [ ] Template context is a typed struct, not `map[string]any`
- [ ] YAML templates tested by parsing output (not just string matching)
- [ ] Schema validated before template execution
- [ ] Golden files exist for non-trivial generated output
- [ ] Golden files compile in CI
- [ ] Injections write only modified files

## Related Skills

- `z-go-style` — formatting, naming, structure of the generated code itself
- `z-go-testing` — table-driven tests, golden file patterns, test helpers
- `z-go-errors` — error wrapping at pipeline stage boundaries
