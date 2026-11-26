---
name: z-dokploy-cli
description: "Operate Dokploy applications and Compose stacks through the installed CLI. Use for project discovery, authentication, deployments, logs, domains, or backups. See [[z-selfhost-deploy]] for host changes."
---

# Dokploy CLI

## Discover the target

1. Read the deployment wrapper and the project's configuration.
2. Run `dokploy --version` and `dokploy --help`. Read the relevant group's help and the exact command's help.
3. Identify the server version separately. Check its compatibility with the selected command.
4. Read back the project, environment, application, source, and listening port. Use the identifiers from those results.

Use the installed version's credential mechanism. Read credentials from the existing secret store.
Check credential storage permissions. Keep credentials out of command output and logs.
Consult the [Dokploy CLI documentation](https://docs.dokploy.com/docs/core/cli) when names or response shapes differ.

## Change a service

- Match the requested operation to the existing resource. An update must target the existing resource ID.
- Inspect required fields and response structure. Stop on an empty ID, failed command, or unexpected result.
- Record the current source, image, and configuration for rollback.
- Configure the intended build source or immutable image. Match the domain to the application's listening port.
- Submit the authorized deployment. Poll the documented status until completion or the applicable deadline.

## Check the deployment

Read the changed configuration. Check the terminal deployment status and the application through its intended route.
For backups, restore into an isolated target before reporting recovery as verified.
See [[z-selfhost-deploy]] and [[z-deploy-pipeline]].
