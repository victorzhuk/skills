---
name: z-selfhost-deploy
description: Startup-cheap self-hosted deploys on a VPS — Docker Compose production patterns, systemd units, Caddy/Traefik reverse proxy with automatic TLS, backup-and-restore discipline, and base hardening (SSH keys, firewall, unattended upgrades). Use when deploying to a VPS instead of Kubernetes. Cluster-scale is [[z-k8s-deploy]].
---

# Self-Hosted Deploy

A VPS deploy earns the same trust a cluster deploy does with far less machinery: services restart themselves, the proxy terminates TLS without a human touching a cert, and a backup nobody has restored is not a backup.

## Docker Compose production patterns

```yaml
services:
  app:
    image: registry.example.com/app:1.4.2   # never :latest in prod
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 3s
      retries: 3
    deploy:
      resources:
        limits: { cpus: "1.0", memory: 512M }
    networks: [app-net]

networks:
  app-net:
    name: app-net
```

- `restart: unless-stopped` over `always` — it honors a deliberate `docker compose stop`, `always` fights you back on the next boot.
- `deploy.resources.limits` applies outside Swarm mode under the Compose Specification (Compose v2) — no need for the older standalone `mem_limit`/`cpus` keys on a current Compose version.
- Pin an explicit tag or digest. `:latest` means the next `docker compose pull` silently ships whatever the registry has today.
- A named network per stack keeps one Compose project's containers from resolving another's by service name on the default bridge.

## systemd units for non-container daemons

For anything not worth containerizing — a small binary, a cron-style job — a unit file gives you the same restart/health guarantees Compose gives a container:

```ini
[Unit]
Description=app
After=network-online.target
Wants=network-online.target

[Service]
EnvironmentFile=/etc/app/app.env
ExecStart=/usr/local/bin/app
Restart=on-failure
RestartSec=5
User=app

[Install]
WantedBy=multi-user.target
```

`After=network-online.target` (not plain `network.target`) actually waits for a configured interface, not just the networking service having started. `EnvironmentFile` keeps secrets out of the unit file itself — root-only permissions on that file, not on the unit.

## Reverse proxy and TLS

Pick one proxy per host — running both invites port conflicts and duplicate cert issuance.

**Caddy** — automatic HTTPS with zero ACME config, a Caddyfile is usually 3 lines per site:

```
app.example.com {
    reverse_proxy app:8080
}
```

**Traefik** — automatic HTTPS via Docker labels, no separate Caddyfile-equivalent:

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.app.rule=Host(`app.example.com`)
  - traefik.http.routers.app.entrypoints=websecure
  - traefik.http.routers.app.tls.certresolver=le
  - traefik.http.services.app.loadbalancer.server.port=8080
```

Caddy is the simpler default for a handful of services on one host — no separate router/certresolver config to maintain. Traefik earns its extra config when the proxy needs to auto-discover routes across many dynamically-started containers or multiple hosts.

## Backup discipline

- **What** — named Docker volumes and database dumps (`pg_dump`, not just a filesystem snapshot of a running DB's data directory — a live snapshot can capture a torn write).
- **Where** — offsite, not on the same VPS. A backup that dies with the host it's backing up isn't a backup.
- **Restore, actually tested** — schedule a periodic restore drill onto a scratch instance. A backup job that's "been running fine" for a year and has never been restored is an unverified assumption, not a safety net.

## Base hardening

- SSH key-only auth: `PasswordAuthentication no` in `sshd_config`; disable root login (`PermitRootLogin no`) once a non-root sudo user is confirmed working.
- Firewall default-deny inbound, explicit allows only (`ufw default deny incoming`, then `ufw allow 22,80,443/tcp`).
- Unattended security upgrades (`unattended-upgrades` on Debian/Ubuntu) so a known CVE doesn't sit unpatched for a release cycle.
- `fail2ban` is optional hardening on top of key-only SSH — worth adding once the host is internet-facing and you want automatic banning of brute-force scan noise, not required to be safe.

## Managed alternative

Dokploy (and similar self-hosted PaaS tools) wraps most of the above — Compose deploys, reverse proxy with automatic TLS, backups — behind a UI and a CLI, trading direct control for less manual wiring. Reach for it when the team wants Heroku-style deploys without hand-rolling this skill's patterns per host; reach for the patterns above when a specific piece (custom systemd unit, non-standard proxy rule) needs control the PaaS doesn't expose.

## Do not

- Ship `:latest` to a production Compose file — pin a tag or digest.
- Rely on `restart: always` to survive a deliberate stop-then-reboot cycle — use `unless-stopped`.
- Store secrets inline in a unit file or `docker-compose.yml` — an `EnvironmentFile`/`.env` with restricted permissions, not committed.
- Keep backups only on the host they protect.
- Leave password SSH auth on "just in case" once key auth is confirmed working.

## Verify

```sh
docker compose config -q                    # syntax + resolution check, no output on success
curl -f https://app.example.com/healthz
# restore drill: restore the latest backup onto a scratch instance and confirm the app boots against it
```
