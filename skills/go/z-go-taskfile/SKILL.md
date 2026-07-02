---
name: z-go-taskfile
description: Author a Taskfile.yml (go-task) for orchestration around a Go project — docker, databases, pipelines, CLI shortcuts, E2E — while delegating the inner loop to the Makefile. Use when adding a task, wiring docker/db dependencies, passing CLI args, or splitting orchestration from build. Triggers on "Taskfile", "task target", "go-task", "docker compose task", "task --list", "requires vars".
---

# Go Taskfile (orchestration)

Task owns **orchestration**: docker, databases, data pipelines, CLI shortcuts, E2E
harnesses — the multi-step, environment-touching commands. The Go inner loop
(build/test/lint) stays in the Makefile (see [[z-go-makefile]]); Task delegates to it so
each command has exactly one definition.

## Single source of truth — delegate, don't duplicate

Never re-implement a Makefile command in a task. Call `make`:

```yaml
test:
  desc: Run all Go tests (pass GO_TEST_FLAGS="-run Foo")
  vars:
    GO_TEST_FLAGS: '{{.GO_TEST_FLAGS | default ""}}'
  cmds:
    - make test GOTESTFLAGS='{{.GO_TEST_FLAGS}}'

fmt:   { desc: Format Go code, cmds: [make fmt] }
lint:  { desc: Run linter,    cmds: [make lint] }
build: { desc: Build the app, cmds: [make build] }
```

A copied-out `go build`/`golangci-lint` drifts from the Makefile (missing flags, stale
install step). Delegation keeps them identical.

## Discoverability

A `default` that lists tasks, and a one-line `desc:` on every task:

```yaml
version: '3'
dotenv: ['.env', '.env.example']

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
  cmds: [go tool goose -dir {{.MIGDIR}} create {{.NAME}} sql]
```

- Free-form passthrough to a CLI: `{{.CLI_ARGS}}` (everything after `--`):

```yaml
run:
  desc: 'task run -- --source X --limit 10'
  cmds: [go run ./cmd/tool {{.CLI_ARGS}}]
```

- Dynamic values via `sh:` (computed once at parse):

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
  cmds: [go tool goose -dir {{.MIGDIR}} postgres "$DATABASE_URL" up]

db:nuke:
  desc: Drop the database volume (DESTRUCTIVE)
  prompt: This deletes all data. Continue?
  cmds: ['{{.COMPOSE}} down -v']
```

## Layer split, concretely

| Concern | Lives in | Why |
|---|---|---|
| build / test / lint / fmt / generate | Makefile (task delegates) | pure Go inner loop |
| docker up/down, db shell, migrate-with-db | Taskfile | needs a running environment |
| pipelines, seeds, E2E, CLI shortcuts | Taskfile | multi-step orchestration |

Migration nuance: a Makefile `migrate-up` (bare goose, no docker — for CI/remote DBs) and
a Task `migrate:up` (`deps: [db:up]` then the same goose) coexist on purpose; the Task one
can still delegate the goose call to `make migrate-up` to avoid duplicating the command.

## Do not

- Re-implement build/test/lint/fmt that the Makefile owns — delegate via `make`.
- Omit `desc:` — it's what `task --list` shows.
- Rename a task another tool/CI/script calls (`task db:up`, `task migrate:up`) without
  updating callers.
- Hide a destructive action behind an innocuous name with no `prompt:`.
- Re-derive env the Makefile already loads — set `dotenv:` once at the top.

## Verify

```sh
task --list                       # renders every task with its desc
task --dry test                   # shows it expands to `make test …`, runs nothing
```
