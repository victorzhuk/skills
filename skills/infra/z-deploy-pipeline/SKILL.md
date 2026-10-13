---
name: z-deploy-pipeline
description: GitHub Actions delivery pipelines — environments with protection rules, OIDC over long-lived secrets, buildx build/push with layer cache, deploy patterns (helm --atomic --wait, ssh+compose pull/up), concurrency, rollback. Use when wiring a deploy workflow. Go CI [[z-go-ci]]; charts [[z-k8s-deploy]]; server [[z-selfhost-deploy]].
---

# Deploy Pipeline

A deploy workflow earns trust the same way the artifact it ships does: it can't run twice at once, it holds no standing credential worth stealing, and every failure mode has a stated way back.

## Environments and protection rules

A GitHub Actions `environment:` applies the protection rules actually configured for that environment. The field alone does not require approval:

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

GitHub issues a signed JWT for the run; the provider validates it and exchanges it for temporary credentials. Restrict the trust policy to the expected issuer, audience, repository, and subject/environment. `id-token: write` permits token issuance; it does not itself limit the cloud role. Replace example identifiers with verified deployment values.

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

Check the builder driver, containerd image-store setting, and BuildKit/Buildx versions for cache-backend support. The setup action is one way to provision a compatible builder. `mode=max` also exports intermediate-stage cache; verify actual cache hits in the build log.

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
  group: deploy-production-app
  cancel-in-progress: false
```

Use a group identifying the actual deployment target, shared by every workflow/ref that can deploy there; the name above is illustrative. `cancel-in-progress: false` protects the running deployment. Under the default concurrency behavior, a newer pending job replaces an older pending job; it is not a durable FIFO queue. Check current GitHub queue options if every deployment must run.

## Rollback path

State the rollback per pattern before you need it, not while paging:

- **Helm** — `helm rollback app <previous-revision>`, or rely on `--atomic` catching the failure automatically during the same run.
- **VPS/Compose** — redeploy the previous image tag (`docker compose pull && docker compose up -d` with the prior tag pinned), since Compose has no revision history of its own to roll back to.

## Secrets hygiene

Scope secrets to the environment and grant minimal token permissions. Do not print secrets or transformed secret values; log masking is a backstop. Review the exact immutable image digest or saved plan that the approved job will deploy.

## Do not

- Run a deploy job without an `environment:` gate on anything that reaches production.
- Store a long-lived cloud access key in a secret when the provider supports OIDC.
- Set `cancel-in-progress: true` on a deploy concurrency group — a cancelled mid-deploy leaves state half-applied.
- Skip the plan/dry-run job before an apply — the human approving the environment gate should see what's about to happen, not just that a workflow started.
- Assume cache configuration works without checking the selected builder and build log.

## Verify

```sh
actionlint .github/workflows/*.yml
# a dry-run/plan job (terraform plan, helm upgrade --dry-run, or an equivalent) runs and its output is visible before the apply job gates on approval
```
