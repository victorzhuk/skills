---
name: z-dokploy-cli
description: Use when managing or scripting a self-hosted Dokploy server from the terminal — authenticating, creating projects/environments, deploying applications or Docker Compose stacks, reading deploy logs, or managing databases, domains, backups, and servers. Triggers include "dokploy", "deploy to dokploy", the dokploy CLI, @dokploy/cli, and self-hosted PaaS deploys.
---

# Dokploy CLI

## Overview

`dokploy` is the CLI for a self-hosted [Dokploy](https://dokploy.com) PaaS. It is **auto-generated from the server's API** — every command is a thin wrapper over `POST|GET /api/trpc/<group>.<procedure>`. There are ~49 groups and ~525 commands, but they all follow **one invocation pattern**, so you derive any command instead of memorizing them.

Install: `npm i -g @dokploy/cli` (or `bun add -g`). Check with `dokploy --version`.

## Authenticate

Two ways. **Prefer env vars for agents/CI/scripts** — they're explicit and survive CLI reinstalls:

```bash
export DOKPLOY_URL=https://panel.example.com
export DOKPLOY_API_KEY=<api-key-from-dashboard>   # alias: DOKPLOY_AUTH_TOKEN
```

Interactive (persists to a config file):

```bash
dokploy auth --url https://panel.example.com --token <api-key>
```

The API key comes from the Dokploy dashboard (Settings → API/Profile).

- The CLI also auto-loads a `.env` from the current directory.
- **Footgun:** `dokploy auth` writes the token to `config.json` *inside the npm package dir* (`.../@dokploy/cli/config.json`), so upgrading/reinstalling the CLI wipes it. Env vars don't have this problem.

## The one invocation pattern

```
dokploy <group> <command> --<camelCaseField> <value> ... [--json]
```

- Flags are the API's **camelCase** field names (`--applicationId`, `--environmentId`, `--dockerImage`).
- Boolean fields are **bare flags**: `--https`, `--isEnabled` (presence = true).
- IDs are always passed explicitly — there are no interactive pickers. Get IDs from the corresponding `... all` / `... search` / `... one` command.

Naming convention (it's the API procedure name): `all` = list, `one` = get one (needs `--<group>Id`), `create` / `update` / `remove`/`delete` = CRUD, `deploy` / `redeploy` / `start` / `stop` / `read-logs` = lifecycle.

## Discovering commands and flags

```bash
dokploy --help              # list all groups
dokploy <group> --help      # list a group's commands   (reliable)
dokploy <group> <command> --help    # show a command's flags
```

**Verified quirk:** leaf `--help` (e.g. `dokploy project create --help`) prints the *correct* help in a normal single call, but **reproducibly prints the root help when run inside a shell `for` loop / scripted batch**. So discover flags one command at a time, not in a loop. Group-level `--help` is loop-safe.

## Output

- Default: pretty-printed JSON (objects), the raw string (strings), or `OK` for empty/mutation responses.
- `--json`: force raw JSON on stdout — use this whenever you pipe to `jaq`/`jq` or parse output.

```bash
dokploy project all --json | jaq '.[].name'
```

## Core workflow

Hierarchy: **project → environment → service (application / compose / database) → deploy**. Applications attach to an **`environmentId`**, not a project directly.

```bash
# 1. project
PID=$(dokploy project create --name travel-api --json | jaq -r '.projectId')

# 2. environment under it
EID=$(dokploy environment create --name production --projectId "$PID" --json | jaq -r '.environmentId')

# 3. application in that environment
AID=$(dokploy application create --name api --appName travel-api \
        --environmentId "$EID" --json | jaq -r '.applicationId')

# 4. give it a source, then build type
dokploy application save-docker-provider --applicationId "$AID" --dockerImage nginx:latest
#   (git apps: application save-github-provider / save-gitlab-provider + save-build-type
#    --buildType nixpacks|dockerfile|static|heroku_buildpacks|paketo_buildpacks|railpack)

# 5. deploy + watch
dokploy application deploy --applicationId "$AID" --title "initial" --json
dokploy application read-logs --applicationId "$AID" --tail 200 --json

# 6. expose it
dokploy domain create --applicationId "$AID" --host api.example.com --port 3000 \
        --https --certificateType letsencrypt --domainType application --json
```

Docker Compose stacks use the `compose` group the same way (`compose create` → `compose deploy --composeId`, plus `compose import` / `deploy-template`).

## Quick reference

Verified flags shown; discover the rest with `dokploy <group> <command> --help`.

| Goal | Command |
|------|---------|
| List / get projects | `project all` · `project one --projectId <id>` |
| Create project | `project create --name <n> [--description <d>] [--env <vars>]` |
| Environments of a project | `environment by-project-id --projectId <id>` |
| Create app | `application create --name <n> --appName <slug> --environmentId <id> [--serverId <id>]` |
| Deploy / redeploy app | `application deploy --applicationId <id>` · `application redeploy --applicationId <id>` |
| Start / stop app | `application start\|stop --applicationId <id>` |
| App logs | `application read-logs --applicationId <id> --tail <n> [--since <t>] [--search <q>]` |
| Cancel / kill build | `application cancel-deployment --applicationId <id>` · `application kill-build ...` |
| Deployments history | `deployment all` · `deployment all-by-server` · `deployment all-by-type` |
| Domains | `domain create --applicationId <id> --host <h> --port <p> [--https] [--certificateType letsencrypt]` |
| Databases (all share one shape) | `postgres\|mysql\|mariadb\|mongo\|redis` → `create / deploy / start / stop / read-logs / change-password / remove` |
| Manual backup | `backup manual-backup-postgres ...` (also `-mongo`, `-my-sql`, `-mariadb`, `-compose`, `-web-server`) |
| Servers | `server all` · `server one --serverId <id>` · `server get-server-metrics` |
| Scheduled tasks / volume backups | `schedule list\|create\|run-manually` · `volume-backups list\|create\|run-manually` |

## Gotchas

- **Always pass `--json` in scripts.** The default human output is not contract-stable.
- **`all` is the list verb**, not `list` (databases/schedules use `list`, but project/app/server use `all`). When unsure, run `dokploy <group> --help`.
- A freshly created application has **no source** — `deploy` does nothing useful until you set `save-docker-provider` / a git provider and (for git) `save-build-type`.
- Discover leaf flags **one command at a time**, never in a `for` loop (see the `--help` quirk above).
- `--version` reports the CLI's own number (e.g. `0.3.0`); the published npm package version (`@dokploy/cli`) is separate.
