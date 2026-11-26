---
name: z-deploy-pipeline
description: "Configure GitHub Actions deployments with environments, OIDC, image builds, concurrency, and rollback. Use [[z-go-ci]] for Go checks and [[z-k8s-deploy]] for charts."
---

# Deployment workflows

## Protect the target

Select the deployment environment. Configure its required reviewers and branch restrictions. An `environment:` field applies the rules configured for that environment.

```yaml
jobs:
  deploy:
    environment: production
    runs-on: ubuntu-latest
```

Request only the permissions needed by the deploy job. Restrict the federated role's issuer, audience, repository, and subject.

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

`id-token: write` permits token issuance. The cloud trust policy decides which role the workflow can assume.
Use the verified role and region. Keep tokens, secret values, and transformed secrets out of logs.

## Build the image

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

Use the project's approved action versions. Configure registry authentication and push permissions before a push.
Check cache support in the selected builder and exporter. `mode=max` can export intermediate-stage cache.
Check cache hits in the build log. Record the resulting image digest.

## Deploy and recover

Review the rendered change and artifact before deployment. Bind approval to the exact digest or saved plan.

**Helm 3**

```sh
helm upgrade --install app ./chart --atomic --wait --timeout 5m
```

**Helm 4**

```sh
helm upgrade --install app ./chart --rollback-on-failure --timeout 5m
```

A failed upgrade can restore the previous release. A failed first install has no previous revision to restore.
On Helm 4, `helm install --rollback-on-failure` uninstalls a failed first install. Check the installed major before choosing flags.
For a manual rollback, select a known revision with `helm rollback app <previous-revision>`. [Helm install](https://helm.sh/docs/helm/helm_install/)

**Docker Compose**

```sh
ssh deploy@host "cd /srv/app && docker compose pull && docker compose up -d --wait"
```

Use the intended Compose project and pinned image. Configure a healthcheck for services whose readiness matters.
To recover, redeploy the known working digest and compatible configuration. Check database compatibility before rollback.

## Serialize deployments

```yaml
concurrency:
  group: deploy-production-app
  cancel-in-progress: false
```

Share the concurrency group across workflows that deploy the same target.
Protect a running production deployment from cancellation. Under the default policy, a newer pending job can replace an older pending job.
Check queue settings if every deployment must run.

## Check deployment and recovery

1. Run `actionlint .github/workflows/*.yml`. Inspect the rendered plan and the active environment rules.
2. Check the deployed revision or digest and exercise the intended service route.
3. Exercise the recovery procedure in the project's test environment. See [[z-selfhost-deploy]] for host checks.
