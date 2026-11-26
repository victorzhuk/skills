---
name: z-go-makefile
description: "Write or maintain Make targets for Go builds, generators, tests, lint, and version metadata. Use [[z-go-taskfile]] for Task orchestration."
---

# Go Makefile (the inner loop)

Reuse the project's build runner. When Make and Task coexist, let [[z-go-taskfile]] call Make targets that already own the commands.

## Self-documenting help

Follow the existing help convention. This example uses inline target comments.

```make
.PHONY: help
help: ## show available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## compile the main binary
	$(GO_BUILD) -o $(BUILD_DIR)/app ./cmd/app
```

This alternative uses a standalone help comment above each target.

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
GIT_COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo none)
BUILD_DATE ?= $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
LDFLAGS   := -ldflags "-w -s -X main.Version=$(VERSION) -X main.CommitHash=$(GIT_COMMIT) -X main.BuildDate=$(BUILD_DATE)"
GO_BUILD  := CGO_ENABLED=0 go build $(LDFLAGS) -trimpath

build: ## build: compile the main binary
	@mkdir -p $(BUILD_DIR)
	$(GO_BUILD) -o $(BUILD_DIR)/app ./cmd/app

build-cli: ## build-cli: compile the admin CLI
	@mkdir -p $(BUILD_DIR)
	$(GO_BUILD) -o $(BUILD_DIR)/cli ./cmd/cli
```

- Create the build directory before writing binaries. Use an order-only prerequisite if several targets share it.
- Use `-X` with actual package variables of type `string`. Match their names to the release and image builds.
- Check whether the target supports `CGO_ENABLED=0`. Reproducibility also requires stable inputs and build metadata. See [[z-go-dockerfile]].

### Create a shared build directory

An order-only prerequisite creates the directory before the build without treating its modification time as a source change.

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

Pin generators such as ogen and sqlc. Use the project’s existing reproducible installation method. The `go.mod` tool directive requires Go 1.24 or later.

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

Reserve `GOTESTFLAGS` for trusted optional selectors. Keep package operands, shell input, and deadline or worker overrides outside this variable.
Bound the process, each test binary, package concurrency, and parallel tests separately. Use [[z-testing-strategy]] for runner limits.
Set `BASE_REF` from the actual review target. Preserve caller-supplied commands.

## dotenv and DSN handling

Include a local environment file only when you trust its contents as Make syntax. Make can evaluate expressions while reading it.
If the project's file uses dotenv syntax, use its existing dotenv loader. Handle quoted values according to that format.

```make
-include .env
strip = $(patsubst "%",%,$(patsubst '%',%,$(1)))
```

## .PHONY hygiene

List every target that is not a real file (`build test lint fmt …`). If you use the
optional order-only dir-prereq pattern, keep the dir target (e.g. `$(BUILD_DIR)`) **off**
`.PHONY` — that's what makes the order-only prereq work.

## .gitignore for a Go service

```gitignore
bin/
coverage.out
coverage.html
.env
*.test
dist/
```

Ignore `.air.toml` only for a local configuration. Keep a shared configuration under version control.

## dev target

```make
dev: ## dev: watch-reload via air
	go tool air
```

Pin the selected Air version. Build into the project output directory. If Task already calls this recipe, keep that delegation.

## Do not

- Bare root `go build` (drops a binary in the tree) — always `-o $(BUILD_DIR)/…`.
- Repeat the same `go build` flags across recipes — hoist them into `GO_BUILD`.
- Mix the two help-comment conventions (inline and standalone) in the same Makefile.
- Install an unreviewed generator version during a build. Use the project's pinned tool mechanism.
- Comments restating WHAT a recipe does — the help annotation is the doc.

## Verification

```sh
make help          # renders, lists every target
make -n build  # dry-run: recipes expand with full flags, no tab errors
make vet test-unit lint
```
