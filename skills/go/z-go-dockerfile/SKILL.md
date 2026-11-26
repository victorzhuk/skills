---
name: z-go-dockerfile
description: "Build container images for Go services. Use for multi-stage Dockerfiles, BuildKit caches, cross-compilation, version metadata, runtime assets, and local Compose."
---

# Go Dockerfile

Separate module downloads, compilation, and runtime files into build stages. Select the runtime image from the binary's dependencies.

## Final image choice

| Base | Certs & tzdata | Shell / exec debugging | Reach for it when |
|---|---|---|---|
| Distroless static nonroot | Includes CA roots and zone data | No shell in the nonroot runtime image | Static Go binaries |
| `scratch` | Supply the assets the program needs | No shell | Minimal static runtime |
| Alpine | Inspect the selected tag and installed packages | Includes a shell | Shell scripts or compatible musl-linked binaries |

Inspect the actual base tag, architecture, libraries, and image size. A smaller compressed image alone does not establish a security property.

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
ARG GIT_COMMIT=none
ARG BUILD_DATE=
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -trimpath \
    -ldflags="-s -w -X main.Version=${VERSION} -X main.CommitHash=${GIT_COMMIT} -X main.BuildDate=${BUILD_DATE}" \
    -o /out/app ./cmd/app

FROM gcr.io/distroless/static-debian13:nonroot
COPY --from=build /out/app /app
USER 65532:65532
ENTRYPOINT ["/app"]
```

Use a numeric nonzero UID when Kubernetes must enforce `runAsNonRoot` from image metadata. A Pod security context can also specify the UID.

Copy `go.mod` and `go.sum` before source files. This lets the builder reuse the dependency step after source-only edits.

## BuildKit cache mounts

Use a BuildKit frontend that supports `RUN --mount`. The syntax directive selects the Dockerfile frontend. The example mounts both Go caches.

- `/go/pkg/mod` — `GOMODCACHE`, the default under the official `golang` image's `GOPATH=/go`.
- `/root/.cache/go-build` — `GOCACHE`, the compiler's build-artifact cache (builder stage runs as root, hence `/root`).

Cache mounts depend on the chosen builder and preservation mechanism. Check a cold build and a repeated build in CI.

## Version stamping

Match linker variable names to the binary and the local build. Exercise the version output in the final image. See [[z-go-makefile]].

Use `-s -w` to strip linker symbol and debug information. Build a separate unstripped target when the debugger needs those symbols.

## ca-certificates and tzdata on scratch

Supply trusted roots for TLS peers and zone data for named locations when the binary needs them. Test representative calls in the final image.

```dockerfile
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /usr/share/zoneinfo /usr/share/zoneinfo
```

`distroless/static` already bundles both — this is the main reason it beats `scratch` for anything that makes an HTTPS call or handles time zones.

## Healthcheck reality

Use exec-form health checks with a binary present in the image. Configure Kubernetes probes separately.

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
compose.override.yml
```

Keep `vendor/` in the context for vendored builds. Exclude `.git` unless the build explicitly needs its metadata.

## Multi-arch

BuildKit auto-populates `TARGETOS`/`TARGETARCH` for cross-compiling the same Dockerfile to `linux/arm64` and `linux/amd64`:

```dockerfile
FROM --platform=$BUILDPLATFORM golang:1.26-bookworm AS build
ARG TARGETOS
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /out/app ./cmd/app
```

Use `BUILDPLATFORM` for the builder and target arguments for the output binary. CGO can require a target C toolchain and matching runtime libraries.

## Local Compose stack

Commit a `compose.yml` for local dev — one file, `docker compose up` gives the service a real database and cache:

```yaml
services:
  app:
    build:
      context: .
      args:
        VERSION: ${VERSION:-dev}
        GIT_COMMIT: ${GIT_COMMIT:-none}
        BUILD_DATE: ${BUILD_DATE:-}
    env_file: [.env]
    ports:
      - "8080:8080"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 3s
      retries: 5
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
```

Publish the management listener only in an explicitly selected local Compose override.

```yaml
services:
  app:
    ports: ["127.0.0.1:9090:9090"]
```

Use `docker compose -f compose.yml -f compose.mgmt.yml up` for loopback access. The default file should publish only intended application ports.

Use [[z-selfhost-deploy]] for production Compose, including immutable artifacts and the deployment's restart policy.

Prefer the binary's health subcommand for shell-free images. Use `wget` only when the image contains it. See [[z-go-observability]].

## Runtime checks

Inspect the final image's UID, assets, and libraries. Keep a debug artifact when the production build strips symbols.

```sh
DOCKER_BUILDKIT=1 docker build -t app:local .
docker run --rm app:local  # exits/serves without a missing-cert or missing-tzdata error
docker inspect app:local --format '{{.Config.User}}'   # 65532:65532, not root/empty
docker history app:local --no-trunc | head             # deps layer cached, no shell/package manager baked in
```
