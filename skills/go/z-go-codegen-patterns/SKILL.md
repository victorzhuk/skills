---
name: z-go-codegen-patterns
description: "Write Go generators and scaffolding tools. Use for AST edits, templates, YAML configuration, deterministic output, and golden tests. See [[z-go-ogen]] for OpenAPI transport generation."
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

Parse Go files before modifying declarations or imports. String substitution can match comments or unrelated tokens.

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

Use `go/parser` and `astutil` for structural edits. Use a decoration-preserving library when comments or exact placement require it.

Use textual searches to locate candidates. Inspect the syntax tree when the presence of a declaration decides whether to edit.

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

Use spaces for YAML indentation. Tabs inside quoted scalar values have different rules.

```
yaml: found a tab character where an indentation space is expected
```

Rules:
- 2-space indentation in all YAML templates.
- Use spaces in generated indentation.
- Test YAML templates by parsing the output with `yaml.Unmarshal` — don't just assert strings.

## Schema Validation Before Render

Check the manifest or schema before executing templates.

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
    want, err := os.ReadFile(golden)
    require.NoError(t, err)
    assert.Equal(t, string(want), string(got))
}
```

Regenerate golden files with the project's documented update mechanism. Repeat generation and check the output for unexpected drift.

## Injection Pipeline

A safe pipeline order prevents partial writes:

1. Register capabilities (extension points) and injections (what to insert).
2. Check that every insertion target exists before writing files.
3. Sort injections by priority (lower = applied first).
4. Group by target file.
5. Parse each target file once.
6. Apply typed injectors (`import`, `field`, `code`, `struct`).
7. Write the formatted output only if it differs from the existing file.

Check all generated files before replacing destinations. If publication can fail partway, provide a recovery path for earlier replacements.

## Checks

- Parse emitted YAML and Go files. Compile generated Go packages with the project wrapper.
- Compare representative output with reviewed golden files. Include a malformed-input case.
- Generate twice with identical inputs. Check that the second run produces no diff.
- Exercise a failed generation against disposable output. Check that existing results remain usable.

## Related Skills

- [[z-go-style]] — formatting, naming, structure of the generated code itself
- [[z-go-testing]] — table-driven tests, golden file patterns, test helpers
- [[z-go-errors]] — error wrapping at pipeline stage boundaries
