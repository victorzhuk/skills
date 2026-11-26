---
name: z-qa-spec-writer
description: "Create requested test scaffolding in the project's framework. Use for skipped stubs, framework discovery, or test collection. See [[z-bdd]] for acceptance scenarios and [[z-tdd]] for executable regression tests."
---

# Test scaffolding

Generate skipped scaffolding only when requested. Executable regression tests and test-first implementation use [[z-tdd]].

## Discover the dialect

Inspect the runner, manifest, configuration, and relevant tests. Match their imports, assertions, fixtures, naming, and module conventions.

Identify the declared framework before choosing a skip or todo mechanism.

Map each requested scenario to an existing test interface. One integration test can cover several source files.

## Write the stubs

- Reuse the project's skip/todo mechanism.
- Name each test for the behavior from the approved plan.
- Keep skipped bodies compilable. Remove unused imports.
- Use only existing fixtures or clearly identified scaffolding placeholders.
- Preserve acceptance IDs only when they already exist.
- Record an owner/reason for deferred coverage according to project convention.

For a stdlib Go scaffold:

```go
func TestRejectExpiredToken(t *testing.T) {
    t.Skip("pending implementation")
}
```

For a Vitest scaffold:

```ts
import { it } from 'vitest';

it.todo('rejects an expired token');
```

Do not treat these examples as framework installation instructions.

## Check the artifact

Use the repository's test-compilation or collection target.

- **Go.** Use bounded `go test -c` on each target package with explicit build parallelism and an output directory. `go build` ignores test files. A run with `-run '^$'` can still execute package initialization and `TestMain`.
- **TypeScript.** Run the project typecheck with the new test files in scope. Then run test collection or the skipped tests.
- **Python.** Use bounded pytest collection to check imports and test discovery. Collection can execute module code. Run the selected tests to exercise fixture setup when applicable.
- Check that every requested stub reports skip or todo. Record its unimplemented coverage as a gap.

Honor [[z-testing-strategy]] and literal dispatched command contracts. Do not call skipped stubs completed behavior tests.

See [[z-qa-analyst]], [[z-qa-debugger]], [[z-go-testing]], [[z-go-bdd]].
