---
name: z-go-dockerfile
description: Multi-stage Dockerfile authoring for Go services — a deps layer cached separately from source, BuildKit cache mounts for GOMODCACHE/GOCACHE, CGO_ENABLED=0 static builds, and the scratch vs distroless vs alpine final-image call. Use when writing or reviewing a service Dockerfile, picking a base image, wiring version stamping into a build, or explaining why a container has no shell to exec into. Triggers on "Dockerfile", "multi-stage build", "distroless", "scratch image", "BuildKit cache mount", "CGO_ENABLED=0", "nonroot user", ".dockerignore". Does not cover the pipeline that builds and pushes the image; see [[z-go-ci]]. Does not cover local build/version-stamping parity; see [[z-go-makefile]].
---

# Go Dockerfile

Multi-stage build: a `deps` stage that caches modules, a `build` stage that compiles a static binary, and a minimal final stage that only carries the binary. Every layer earns its place — no shell, no package manager, no root user in the shipped image unless a specific need demands it.

## Final image choice

| Base | Certs & tzdata | Shell / exec debugging | Reach for it when |
|---|---|---|---|
| `gcr.io/distroless/static-debian13:nonroot` | bundled (ca-certificates + tzdata) | none in `:nonroot`; swap to the `:debug` tag (busybox shell) to triage | **default** for a `CGO_ENABLED=0` Go binary |
| `scratch` | none — `COPY` both from the builder yourself | none, ever — no `:debug` variant exists | absolute minimal footprint is a hard requirement and you're fine hand-rolling certs/tzdata |
| `alpine` | `apk add --no-cache ca-certificates tzdata` (neither ships by default) | `ash` shell + `apk` built in | you need a shell for an entrypoint script, `kubectl exec` triage, or a musl-linked CGO build |

`distroless/static` is the sane default: it already carries what `scratch` forces you to reinvent, and it's smaller than `alpine` with a strictly smaller attack surface (no shell, no package manager). Reach for `scratch` only when a security policy mandates zero non-binary content, and for `alpine` only when something in the running container genuinely needs a shell.

## Reference Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

FROM golang:1.26-bookworm AS deps
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

FROM deps AS build
ARG VERSION=dev
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -trimpath \
    -ldflags="-s -w -X main.Version=${VERSION}" \
    -o /out/app ./cmd/app

FROM gcr.io/distroless/static-debian13:nonroot
COPY --from=build /out/app /app
USER 65532:65532
ENTRYPOINT ["/app"]
```

Numeric UID, not the `nonroot` name: a Pod with `securityContext.runAsNonRoot: true` fails to start against a string `USER` — Kubernetes can't verify non-root status from a name, only a number, and `65532` is the exact UID the `:nonroot` tag already sets up.

`go.mod`/`go.sum` land in their own `COPY` before the rest of the source, so `go mod download` only reruns when dependencies actually change — editing a `.go` file never invalidates that layer.

## BuildKit cache mounts

`--mount=type=cache,target=...` needs the `# syntax=docker/dockerfile:1` directive on line one; without it the mount flag is silently unsupported. Two mounts cover the two Go caches:

- `/go/pkg/mod` — `GOMODCACHE`, the default under the official `golang` image's `GOPATH=/go`.
- `/root/.cache/go-build` — `GOCACHE`, the compiler's build-artifact cache (builder stage runs as root, hence `/root`).

These caches persist across builds on the same daemon/builder — a cold CI runner still pays the full cost, but a warm local Docker daemon or a CI cache-mount backend (e.g. `--cache-from`/`--cache-to` in `docker buildx build`) turns a `go build` layer into an incremental one. This is the default accelerator, not optional hardening: skip it and every source-touching rebuild redownloads and recompiles the entire module graph.

## Version stamping

`-X main.Version=${VERSION}` mirrors the `-ldflags "-w -s -X main.Version=$(VERSION)"` convention in [[z-go-makefile]] — same variable name, same flags, so a local `make build` and the image produced by this Dockerfile report identical version strings. Pass `VERSION` at build time: `docker build --build-arg VERSION=$(git describe --tags --always --dirty) .`; the pipeline step that computes and passes it belongs in [[z-go-ci]].

`-s -w` strips the symbol table and DWARF debug info — smaller binary, but `dlv` can't symbolicate it. If a container image genuinely needs live `delve` debugging, build a second, unstripped target for that image; don't drop `-s -w` from the production build to accommodate a debugging session that happens rarely.

## ca-certificates and tzdata on scratch

`scratch` starts from nothing: no `/etc/ssl/certs`, no `/usr/share/zoneinfo`, no `/etc/passwd`. Any outbound TLS call or `time.LoadLocation` fails without an explicit copy from the builder:

```dockerfile
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /usr/share/zoneinfo /usr/share/zoneinfo
```

`distroless/static` already bundles both — this is the main reason it beats `scratch` for anything that makes an HTTPS call or handles time zones.

## Healthcheck reality

Docker's `HEALTHCHECK CMD` instruction needs a shell or an exec-able binary in the image, and it's meaningless in Kubernetes — the kubelet drives `livenessProbe`/`readinessProbe`/`startupProbe` from the Pod spec and never reads the image's `HEALTHCHECK` metadata. Define probes there (`httpGet`, `grpc`, or `exec` against a tiny health binary), not in the Dockerfile. A Dockerfile `HEALTHCHECK` only matters for `docker run`/Compose/Swarm, and on `scratch`/`distroless:nonroot` there's no shell for the shell form anyway.

## .dockerignore essentials

```
.git
bin/
dist/
*.md
.env
.env.*
.github/
testdata/
docker-compose*.yml
```

Don't ignore `vendor/` if the module actually vendors dependencies — the build stage needs it. Ignoring `.git` matters most: without it, every commit invalidates Docker's build-context cache even when no tracked file changed.

## Multi-arch

BuildKit auto-populates `TARGETOS`/`TARGETARCH` for cross-compiling the same Dockerfile to `linux/arm64` and `linux/amd64`:

```dockerfile
FROM --platform=$BUILDPLATFORM golang:1.26-bookworm AS build
ARG TARGETOS
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /out/app ./cmd/app
```

`--platform=$BUILDPLATFORM` pins the builder stage to the host's own architecture — Go then cross-compiles natively via `GOOS`/`GOARCH` with no QEMU emulation of the build step. Drop that pin and `buildx --platform linux/arm64` on an amd64 host emulates the entire builder under QEMU instead. The `docker buildx build --platform linux/amd64,linux/arm64` invocation and the CI job that runs it belong in [[z-go-ci]]; this Dockerfile only needs the platform pin and the two `ARG`s to be cross-compile-ready.

## Do not

- Copy the full source tree before `go mod download` — it collapses the deps-cache layer into the source layer, so every code change re-downloads every module.
- Ship `alpine` or a full `golang` image to production because a shell "might be useful someday" — that's exactly the attack surface `distroless` removes.
- Add a Dockerfile `HEALTHCHECK` as a substitute for a Kubernetes probe — the kubelet never reads it.
- Run the final stage as root — `distroless/static-debian13:nonroot` and an explicit `USER nonroot:nonroot`/numeric UID exist precisely so you don't have to.
- Strip `-s -w` from every build "just in case delve is needed" — keep it in prod, build a separate debug target for the rare session that needs symbols.

## Verify

```sh
DOCKER_BUILDKIT=1 docker build -t app:local .
docker run --rm app:local  # exits/serves without a missing-cert or missing-tzdata error
docker inspect app:local --format '{{.Config.User}}'   # 65532:65532, not root/empty
docker history app:local --no-trunc | head             # deps layer cached, no shell/package manager baked in
```
