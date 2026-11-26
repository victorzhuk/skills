---
name: z-selfhost-deploy
description: "Deploy and recover services on a VPS with Compose, systemd, a TLS proxy, and offsite backups. Use [[z-k8s-deploy]] for Kubernetes."
---

# Deploy a service to a VPS

## Run the service

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
  app-net: {}
```

Set the restart policy to match operator intent. `unless-stopped` preserves a deliberate stop across daemon restart.
Pin a release tag or immutable digest. Inspect the effective CPU and memory limits on the running container.
Keep private services on project-scoped networks. The healthcheck executable must exist in the image.

For a native daemon, configure a systemd service.

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

The wait-online service can delay startup until local network configuration completes. Remote dependencies can still be unavailable.
Handle reconnection and restrict access to environment files.

## Route HTTPS traffic

For a Caddy container, put Caddy and the application on a network where `app` resolves to the backend.

```
app.example.com {
    reverse_proxy app:8080
}
```

For Traefik, configure the Docker provider, entry point, and certificate resolver before using these labels.

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.app.rule=Host(`app.example.com`)
  - traefik.http.routers.app.entrypoints=websecure
  - traefik.http.routers.app.tls.certresolver=le
  - traefik.http.services.app.loadbalancer.server.port=8080
```

Select one proxy for each listening address and port. Check DNS, certificate issuance, backend reachability, and renewal.

## Protect and recover the host

- Store offsite backups of required volumes and databases. Use a database dump or a supported consistent backup.
- Restore an isolated copy periodically. Exercise the application against the restored data.
- Check a separate non-root sudo login before disabling root access.
- Keep the existing SSH session open. Check `sshd -t` and effective settings with `sshd -T`. Include connection parameters when `Match` rules apply.
- For key-only access, require `AuthenticationMethods publickey` and enable `PubkeyAuthentication`. Disable password authentication.
- After reload, test a separate key login and the rejected password-only and keyboard-interactive methods.
- Permit the actual SSH port before enabling the firewall. Allow only intended public service ports.
- Check Docker exposure from another host. Published ports can follow forwarding rules outside ordinary UFW input rules.
- Apply the project's security update policy. Use fail2ban when its additional controls address an identified need.

Use [[z-dokploy-cli]] when an existing Dokploy service owns deployment.

## Check the service

```sh
docker compose config -q                    # syntax + resolution check, no output on success
curl -f https://app.example.com/healthz
# restore drill: restore the latest backup onto a scratch instance and confirm the app boots against it
```
