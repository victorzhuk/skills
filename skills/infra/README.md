# Infra Skills

Deployment discipline across Kubernetes, Terraform/OpenTofu, self-hosted VPS targets, and the GitHub Actions pipelines that ship to them.

## Model-invoked

Model- or user-reachable via skill name and trigger phrasing.

- **[z-k8s-deploy](./z-k8s-deploy/SKILL.md)** — Production Kubernetes deploys with Helm — securityContext, resource limits, probe design with preStop/terminationGracePeriodSeconds shutdown, PDB/HPA/NetworkPolicy, chart/rollout/debug flow.
- **[z-terraform](./z-terraform/SKILL.md)** — Infrastructure-as-code discipline for Terraform/OpenTofu — remote state locking, thin-env modules with pinned versions, plan-before-apply review, drift detection, workspaces-vs-directory trade-off.
- **[z-selfhost-deploy](./z-selfhost-deploy/SKILL.md)** — Startup-cheap self-hosted deploys on a VPS — Docker Compose production patterns, systemd units, Caddy/Traefik reverse proxy with automatic TLS, backup-and-restore discipline, and base hardening.
- **[z-deploy-pipeline](./z-deploy-pipeline/SKILL.md)** — GitHub Actions delivery pipelines — environments with protection rules, OIDC over long-lived secrets, buildx build/push with layer cache, deploy patterns, concurrency, rollback.
