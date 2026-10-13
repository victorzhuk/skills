---
name: z-dokploy-cli
description: Use when managing or scripting a self-hosted Dokploy server from the terminal — authenticating, creating projects/environments, deploying applications or Docker Compose stacks, reading deploy logs, or managing databases, domains, backups, and servers. Triggers include "dokploy", "deploy to dokploy", the dokploy CLI, @dokploy/cli, and self-hosted PaaS deploys.
---

# Dokploy CLI

Discover the installed CLI and server versions before copying commands. Generated command names, authentication storage, flags, and response shapes can change; use [Dokploy's CLI documentation](https://docs.dokploy.com/docs/core/cli) and the installed help.

## Discover

1. Read the project's deployment wrapper and configuration.
2. Check `dokploy --version` and `dokploy --help`.
3. Inspect the relevant group's help, then the exact command's help.
4. Confirm the target server, project, environment, application, and image/source from read-only API results. Do not invent identifiers.

Do not install or upgrade the CLI simply to match an example.

## Authenticate

Use the installed version's documented environment variables or credential mechanism. Read credentials from the existing secret store; never print them or pass them in a logged command. Check credential-file location and permissions rather than assuming a particular package-directory path. Avoid loading an unrelated directory's environment file.

## Workflow

- Resolve the project and environment before creating or updating a service. Reuse an existing resource when the requested outcome is an update.
- Discover required fields and inspect the JSON response before extracting an ID. Stop on a failed command, empty ID, or unexpected response shape.
- Configure the verified source and build method before deployment. Prefer an immutable image digest; verify the application's actual listening port before configuring a domain.
- Review the intended target and change before mutation. Preserve the prior source/image and configuration needed for rollback.
- Start the authorized deployment, then poll its documented status to a terminal result. Read logs for diagnosis without exposing secrets.
- Verify application health through the intended route; successful submission or a log response alone does not prove deployment success.

## Do not

- Assume every group uses the same list verb, ID field, boolean flag, or JSON shape.
- Treat an observed help-output anomaly as a universal shell-loop restriction.
- Copy a sample image and unrelated port into a real deployment.
- Infer server compatibility from the CLI package version alone.

## Verify

- Read back the changed resource and compare it with the intended configuration.
- Record the final deployment status and health result.
- For backups, verify the result through an isolated restore drill; a successful request is insufficient.

See [[z-selfhost-deploy]] for host, firewall, and backup discipline and [[z-deploy-pipeline]] for delivery gates.
