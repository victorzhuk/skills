---
name: z-go-service-bootstrap
description: "Bootstrap a new Go HTTP service. Select entrypoint, configuration, health checks, build, and CI artifacts from the service requirements. Follow the linked skill for each artifact."
---

# Go Service Bootstrap

Identify the deployment target, runtime dependencies, configuration source, and health contract before creating files.

## Establish the service

1. Select the module path and Go version. Run `go mod init` only for a new module.
2. Add a thin `main` and a testable entrypoint. Give shutdown a deadline. See [[z-go-entrypoint]].
3. Set inbound limits and HTTP timeouts for the supported routes. See [[z-go-safety]].
4. Define liveness and readiness for the target platform. Check only required dependencies during readiness. See [[z-go-observability]].

## Select supporting artifacts

| Requirement | Action |
|---|---|
| Environment configuration | Document required keys and safe example values. Use [[z-go-env-v11]] for env v11. |
| Local build commands | Reuse the project runner. See [[z-go-makefile]] when Make owns the build. |
| Version reporting | Match the build metadata to the variables the binary reports. |
| Container deployment | Build the runtime image. Add Compose services only for actual local dependencies. See [[z-go-dockerfile]]. |
| Metrics or profiling | Restrict management routes to their intended audience. Keep profiling off public listeners. |
| OpenAPI transport | Generate declared operations with [[z-go-ogen]]. Preserve the project's existing probe contract. |
| Lint and CI | Use the project policies in [[z-go-lint]] and [[z-go-ci]]. Scan images when the service ships images. |

## Verification

Build the service with its supported toolchain. Start it with documented local configuration.
Exercise a public route and the configured probes. Check readiness with a required dependency unavailable.
When the contract includes private diagnostics, check that the public listener does not serve them.
Send the shutdown signal. Check the exit status and how the service handles an in-flight request.
Run the bounded project checks for the selected artifacts.
