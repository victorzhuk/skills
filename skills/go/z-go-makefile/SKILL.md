---
name: z-go-makefile
description: Author a clean Makefile for a Go project's inner loop — DRY build recipes, build-dir handling (inline mkdir or order-only prereq), self-documenting help, version stamping, go tool codegen, and test/lint layering. Use when writing or refactoring a Makefile, adding a make target, or splitting build commands from orchestration. Triggers on "Makefile", "make target", "make build", ".PHONY", "build/test/lint command", "GO_BUILD".
---

# Go Makefile (the inner loop)

The Makefile owns the **Go inner loop**: build, run, test, lint, fmt, generate, migrate.
Push docker, pipelines, and shell orchestration into a Taskfile (see `z-go-taskfile`); the
Taskfile delegates back to `make` so each command has one definition.

## Self-documenting help

Two conventions exist. **Inline `target: ## desc`** puts the comment on the target line
itself — the more common real pattern (go-ent, gdebenz-buddy-bot, homyak all use it):

```make
.PHONY: help
help: ## show available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## compile the main binary
	$(GO_BUILD) -o $(BUILD_DIR)/app ./cmd/app
```

**Standalone `## name: desc`** as its own comment line above the target is an equally
valid variant — pick whichever a project already has, don't mix both in one Makefile:

```make
## build: compile the main binary
build:
	$(GO_BUILD) -o $(BUILD_DIR)/app ./cmd/app
```

```make
.PHONY: help
help: ## help: show targets
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/^## /  /' | column -t -s ':'
```

Put `help` first (or set `.DEFAULT_GOAL := help`) so a bare `make` is discoverable.

## DRY the build

Define the build incantation once and reuse it for every binary — flags can't drift apart:

```make
BUILD_DIR ?= bin
VERSION   ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
LDFLAGS   := -ldflags "-w -s -X main.Version=$(VERSION)"
GO_BUILD  := CGO_ENABLED=0 go build $(LDFLAGS) -trimpath

build: ## build: compile the main binary
	@mkdir -p $(BUILD_DIR)
	$(GO_BUILD) -o $(BUILD_DIR)/app ./cmd/app

build-cli: ## build-cli: compile the admin CLI
	@mkdir -p $(BUILD_DIR)
	$(GO_BUILD) -o $(BUILD_DIR)/cli ./cmd/cli
```

- Inline `@mkdir -p $(BUILD_DIR)` in the recipe body is the house pattern — every real
  Makefile here does it this way. `mkdir -p` is a no-op once the directory exists, so
  repeating it across recipes costs nothing at build time.
- Stamp the version through `-ldflags -X`; `-trimpath` + `CGO_ENABLED=0` for reproducible,
  static binaries.

### Optional: order-only dir prereq

A `$(BUILD_DIR)` target with an order-only prereq (`| $(BUILD_DIR)`) avoids repeating
`@mkdir -p` across recipes — a DRY-er alternative worth it once a Makefile grows many
build targets, at the cost of one more moving part:

```make
$(BUILD_DIR):
	@mkdir -p $@

build: | $(BUILD_DIR)
	$(GO_BUILD) -o $(BUILD_DIR)/app ./cmd/app
```

## Never write binaries to the repo root

A bare `go build ./cmd/app` drops an `app` binary in the working dir and pollutes the tree.
Always pass `-o $(BUILD_DIR)/<name>`.

## Embedded assets

If a binary `//go:embed`s built assets (a frontend bundle, templates), make the Go build
depend on the asset build, and offer a stub for asset-free local compiles:

```make
build: assets
	@mkdir -p $(BUILD_DIR)
	$(GO_BUILD) -o $(BUILD_DIR)/app ./cmd/app
assets-stub:                  ## assets-stub: minimal placeholder for Go-only builds
	@mkdir -p web/dist && echo '<!doctype html>' > web/dist/index.html
```

## Codegen via `go tool`

Pin generators in the `go.mod` `tool` block and invoke `go tool <x>` — versions stay
reproducible, no `@latest` drift, no global installs:

```make
generate: ## generate: regenerate code from schemas
	go tool ogen --target internal/gen --clean api/v1/openapi.yaml
```

Real Makefiles are mixed, not fully migrated: codegen tools that emit source into the repo
(ogen) tend to be pinned via `go tool`; standalone dev-CLI tools (goose, sqlc,
golangci-lint) are commonly still `go install`ed at `@latest`. Both conventions coexist —
prefer `go tool` for anything new, but an `@latest` install elsewhere isn't a bug to fix.

## Test and lint layering

```make
GOTESTFLAGS ?=
test:            ## test: all tests
	go test $(GOTESTFLAGS) ./...
test-unit:       ## test-unit: fast tests, no external deps
	go test -short ./...
test-integration: ## test-integration: needs docker
	go test -run Integration ./...
lint:            ## lint: full lint
	golangci-lint run
lint-new:        ## lint-new: only changed code
	golangci-lint run --new-from-rev=main ./...
fmt:             ## fmt: format
	go fmt ./... && golangci-lint fmt
vet:             ## vet: go vet
	go vet ./...
```

Keep a `GOTESTFLAGS ?=` passthrough so a Taskfile (or a human) can inject `-run Foo`.

## dotenv and DSN handling

Optionally load a `.env` for local runs; strip surrounding quotes from any DSN you pass on a
command line (a quoted `DATABASE_URL="…"` in `.env` otherwise reaches the tool with quotes):

```make
-include .env
strip = $(patsubst "%",%,$(patsubst '%',%,$(1)))
```

## .PHONY hygiene

List every target that is not a real file (`build test lint fmt …`). If you use the
optional order-only dir-prereq pattern, keep the dir target (e.g. `$(BUILD_DIR)`) **off**
`.PHONY` — that's what makes the order-only prereq work.

## Do not

- Bare root `go build` (drops a binary in the tree) — always `-o $(BUILD_DIR)/…`.
- Repeat the same `go build` flags across recipes — hoist them into `GO_BUILD`.
- Mix the two help-comment conventions (inline and standalone) in the same Makefile.
- Add a new codegen tool via `go install @latest` without considering `go tool` first —
  pin new generators there; an existing `@latest` install for a dev-CLI tool elsewhere
  is an accepted coexisting convention, not something to migrate unprompted.
- Comments restating WHAT a recipe does — the help annotation is the doc.

## Verify

```sh
make help          # renders, lists every target
make -n build-all  # dry-run: recipes expand with full flags, no tab errors
make vet test-unit lint
```
