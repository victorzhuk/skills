---
name: z-go-makefile
description: Author a clean Makefile for a Go project's inner loop — DRY build recipes, build-dir handling (inline mkdir or order-only prereq), self-documenting help, version stamping, go tool codegen, and test/lint layering. Use when writing or refactoring a Makefile, adding a make target, or splitting build commands from orchestration. Triggers on "Makefile", "make target", "make build", ".PHONY", "build/test/lint command", "GO_BUILD".
---

# Go Makefile (the inner loop)

Preserve the project's existing build tool and approved commands. When both Make and Task are already used, keep build/test/codegen recipes in Make and let [[z-go-taskfile]] delegate orchestration to them. Do not introduce a second tool solely to enforce this split.

## Self-documenting help

Two conventions exist. **Inline `target: ## desc`** puts the comment on the target line
itself:

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

- Inline `@mkdir -p $(BUILD_DIR)` is simple and idempotent; use an order-only prerequisite when it improves the existing file.
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

Pin source generators, including ogen and sqlc, to the project's selected versions. Preserve an existing installation convention when it is reproducible; do not silently move tools to `@latest`. The go.mod tool directive requires Go 1.24+.

## Test and lint layering

```make
GOTESTFLAGS ?=
test:            ## test: all tests
	timeout 5m go test $(GOTESTFLAGS) -timeout 2m -p 2 -parallel 4 ./...
test-unit:       ## test-unit: fast tests, no external deps
	timeout 5m go test -timeout 2m -p 2 -parallel 4 -short ./...
test-integration: ## test-integration: needs docker
	timeout 15m go test -timeout 10m -p 2 -parallel 4 -count=1 -run Integration ./...
lint:            ## lint: full lint
	golangci-lint run
lint-new:        ## lint-new: only changed code
	@test -n "$(BASE_REF)" || { echo "BASE_REF is required" >&2; exit 1; }
	golangci-lint run --new-from-rev=$(BASE_REF) ./...
fmt:             ## fmt: format
	go fmt ./... && golangci-lint fmt
vet:             ## vet: go vet
	go vet ./...
```

Keep `GOTESTFLAGS` for optional selectors such as `-run Foo`; do not accept `-args`, package operands, shell metacharacters, or timeout/concurrency overrides through this seam. Fixed bounds follow the selectors so ordinary selection cannot replace them. `timeout` bounds the whole command, `-timeout` each test binary, `-p` package concurrency, and `-parallel` parallel tests/fuzz workers. Select bounds for the project and use an equivalent process deadline where GNU timeout is unavailable. Discover `BASE_REF` from the actual review target before `lint-new`; never assume master. Preserve caller-emitted commands rather than rewriting them.

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
make -n build  # dry-run: recipes expand with full flags, no tab errors
make vet test-unit lint
```
