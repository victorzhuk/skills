---
name: z-deploy-pipeline
description: GitHub Actions delivery pipelines — environments with protection rules, OIDC over long-lived secrets, buildx build/push with layer cache, deploy patterns (helm --atomic --wait, ssh+compose pull/up), concurrency, rollback. Use when wiring a deploy workflow. Go CI [[z-go-ci]]; charts [[z-k8s-deploy]]; server [[z-selfhost-deploy]].
---

# Deploy Pipeline

A deploy workflow earns trust the same way the artifact it ships does: it can't run twice at once, it holds no standing credential worth stealing, and every failure mode has a stated way back.

## Environments and protection rules

A GitHub Actions `environment:` on the deploy job gates it behind required reviewers, a wait timer, and environment-scoped secrets — the job simply doesn't start until approved:

```yaml
jobs:
  deploy:
    environment: production
    runs-on: ubuntu-latest
```

Configure required reviewers and deployment branch restrictions on the environment itself (repo Settings → Environments). A production environment with no protection rule is a secret with a workflow trigger instead of a login form.

## OIDC federation

Long-lived cloud credentials sitting in repository secrets are a standing liability — anyone with write access to the secret, or a leaked log, gets them indefinitely. OIDC federation trades that for a short-lived token minted per run:

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/deploy
      aws-region: us-east-1
```

GitHub issues a signed JWT for the run; the cloud provider (AWS IAM role trust policy, GCP Workload Identity Federation pool) validates it and exchanges it for temporary credentials. `id-token: write` is required at the job or workflow level or the token is never minted. Same idea applies to registry auth where the provider supports it — prefer OIDC over a static registry password wherever the option exists.

## Image build and push

```yaml
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v6
  with:
    context: .
    push: true
    tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

`setup-buildx-action` is not optional — the `type=gha` cache backend needs a BuildKit builder, not the plain `docker` driver. `mode=max` caches every layer, not just the final image, which matters most on multi-stage Dockerfiles ([[z-k8s-deploy]] covers what goes in the image itself).

## Deploy job patterns

**Kubernetes via Helm:**

```sh
helm upgrade --install app ./chart --atomic --wait --timeout 5m
```

`--atomic` rolls the release back automatically on a failed upgrade (it implies `--wait`). Helm 4 renames this flag to `--rollback-on-failure` for `upgrade` and drops atomic install entirely for a fresh `install` — check the Helm major version in use before copying this verbatim.

**VPS via Compose:**

```sh
ssh deploy@host "cd /srv/app && docker compose pull && docker compose up -d --wait"
```

Pull-then-up keeps the window between "new image available" and "container running" as short as possible; `--wait` blocks until the healthcheck (from [[z-selfhost-deploy]]) reports healthy before the job reports success.

## Concurrency groups

```yaml
concurrency:
  group: deploy-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false
```

Serializes deploys to the same ref — a second push while a deploy is running queues instead of racing it. `cancel-in-progress: false` on a deploy job specifically: cancelling a deploy mid-flight can leave a Helm release or a Compose pull half-applied, worse than waiting for it to finish before starting the next one.

## Rollback path

State the rollback per pattern before you need it, not while paging:

- **Helm** — `helm rollback app <previous-revision>`, or rely on `--atomic` catching the failure automatically during the same run.
- **VPS/Compose** — redeploy the previous image tag (`docker compose pull && docker compose up -d` with the prior tag pinned), since Compose has no revision history of its own to roll back to.

## Secrets hygiene

Scope secrets to the environment that needs them (`production` secrets never visible to a `staging` job), rely on GitHub's automatic masking of secret values in logs, and grant the deploy job's token the minimum `permissions:` block it needs — default to `contents: read` and add only what the job actually calls.

## Do not

- Run a deploy job without an `environment:` gate on anything that reaches production.
- Store a long-lived cloud access key in a secret when the provider supports OIDC.
- Set `cancel-in-progress: true` on a deploy concurrency group — a cancelled mid-deploy leaves state half-applied.
- Skip the plan/dry-run job before an apply — the human approving the environment gate should see what's about to happen, not just that a workflow started.
- Assume `docker/build-push-action` caches without `setup-buildx-action` — the `docker` driver silently ignores `cache-from`/`cache-to`.

## Verify

```sh
actionlint .github/workflows/*.yml
# a dry-run/plan job (terraform plan, helm upgrade --dry-run, or an equivalent) runs and its output is visible before the apply job gates on approval
```
