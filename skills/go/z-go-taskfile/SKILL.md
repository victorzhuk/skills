---
name: z-go-taskfile
description: "Write Go project tasks in Taskfile.yml. Use for task dependencies, arguments, migrations, or E2E orchestration. Delegate to [[z-go-makefile]] when Make already owns a command."
---

# Go Taskfile (orchestration)

Preserve the project runner. When Task and Make coexist, delegate to existing Make targets.

## Delegate to Make

```yaml
test:
  desc: Run all Go tests (pass GO_TEST_FLAGS="-run Foo")
  vars:
    GO_TEST_FLAGS: '{{.GO_TEST_FLAGS | default ""}}'
  cmds:
    - make test GOTESTFLAGS={{.GO_TEST_FLAGS | shellQuote}}

fmt:   { desc: Format Go code, cmds: [make fmt] }
lint:  { desc: Run linter,    cmds: [make lint] }
build: { desc: Build the app, cmds: [make build] }
```

Pass optional selectors separately from fixed deadlines and worker limits. A command-line Make assignment overrides a `?=` default, even when empty.

## Discoverability

A `default` that lists tasks, and a one-line `desc:` on every task:

```yaml
version: '3'
dotenv: ['.env']

tasks:
  default:
    desc: List all tasks
    cmds: [task --list]
```

## Inputs

- Optional vars with fallbacks: `'{{.LIMIT | default "10"}}'`.
- Mandatory vars guarded up front:

```yaml
migrate:create:
  desc: Create a migration (NAME=... required)
  requires: { vars: [NAME] }
  cmds:
    - 'goose -dir {{.MIGDIR | shellQuote}} create {{.NAME | shellQuote}} sql'
```

- Forward caller-supplied arguments with `CLI_ARGS`. Check quoting rules in the project's Task version.

```yaml
run:
  desc: 'task run -- --source X --limit 10'
  cmds:
    - 'go run ./cmd/tool {{.CLI_ARGS}}'
```

- Use `sh:` when a variable needs command output.

```yaml
vars:
  RUN_DIR: { sh: 'echo "run-$(date +%Y%m%d-%H%M%S)"' }
```

## Dependencies and safety

- `deps: [db:up]` boots prerequisites (and runs them in parallel) before the task.
- `prompt:` gates destructive actions behind a confirmation.
- `task: other` composes pipelines from existing tasks.

```yaml
migrate:up:
  desc: Apply migrations
  deps: [db:up]
  cmds:
    - 'goose -dir {{.MIGDIR | shellQuote}} postgres "$DATABASE_URL" up'

db:nuke:
  desc: Drop the database volume (DESTRUCTIVE)
  prompt: This deletes all data. Continue?
  cmds: ['{{.COMPOSE}} down -v']
```

## Layer split, concretely

| Concern | Lives in | Why |
|---|---|---|
| Build, test, format, lint, generate | Existing project runner | One definition of each command |
| Provision local dependencies | Task when already used | Explicit environment prerequisites |
| Run an integration workflow | Task or the existing equivalent | Ordered steps and observable results |

Use the project's pinned migration tool. Make and Task can share one migration recipe while using different environment prerequisites.

## Do not

- Re-implement build/test/lint/fmt that the Makefile owns — delegate via `make`.
- Omit `desc:` — it's what `task --list` shows.
- Rename a task another tool/CI/script calls (`task db:up`, `task migrate:up`) without
  updating callers.
- Hide a destructive action behind an innocuous name with no `prompt:`.
- Load sample configuration as runtime defaults unless the project explicitly defines that behavior.

## Verification

```sh
task --list                       # renders every task with its desc
task --dry test                   # inspect the rendered recipe
```
