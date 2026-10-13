---
name: z-qa-spec-writer
description: "Discover the existing test framework and generate requested compilable scaffolding. Use for test stubs, framework detection, or skipped tests. Readable acceptance scenarios belong to [[z-bdd]], test plans to [[z-qa-analyst]]. Skipped scaffolding is not acceptance proof."
---

# Test scaffolding

Generate skipped scaffolding only when requested. Executable regression tests and test-first implementation use [[z-tdd]].

## Discover the dialect

Read the project runner, dependency manifest, test configuration, and one to three relevant tests. Match imports, assertions, names, fixtures, and module style.

Detect the actual frameworks, including Jest, Vitest, Playwright, stdlib Go, testify, Ginkgo, or pytest when declared. Do not assume one from another project's history.

Map requested scenarios to existing test interfaces. Several source files may be covered by one integration test; do not create one stub file per implementation file by default.

## Write the stubs

- Reuse the project's skip/todo mechanism.
- Name each test for the behavior from the approved plan.
- Keep skipped bodies minimal and compilable; do not add meaningless assertions to consume imports.
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

## Verify the artifact

Use the repository's test-compilation or collection target.

- **Go:** `go build` ignores `_test.go`. Use a bounded `go test -c` for each target package, with explicit build parallelism and outputs in the project's binary directory. A `go test -run '^$'` alternative still executes init/TestMain.
- **TypeScript:** run the project's typecheck that includes the new test files, then the runner's collection or skipped-test check.
- **Python:** `py_compile` checks syntax only. Use bounded pytest collection to resolve imports and fixtures; collection can execute module setup.
- Confirm the requested stubs report skip/todo, not pass or fail. Report intentionally unimplemented coverage as a gap.

Honor [[z-testing-strategy]] and literal dispatched command contracts. Do not call skipped stubs completed behavior tests.

See [[z-qa-analyst]], [[z-qa-debugger]], [[z-go-testing]], [[z-go-bdd]].
