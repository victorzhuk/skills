---
name: z-terraform
description: Infrastructure-as-code discipline for Terraform/OpenTofu — remote state locking, thin-env modules with pinned versions, plan-before-apply review, drift detection, workspaces-vs-directory trade-off. Use when writing or reviewing Terraform modules. Kubernetes workloads [[z-k8s-deploy]]; deploy wiring [[z-deploy-pipeline]].
---

# Terraform

State is the single source of truth for what Terraform thinks exists — treat every decision below as protecting that file, because a corrupted or concurrently-written state file is how infra drifts silently or gets destroyed by accident.

## Remote state and locking

Local state (`terraform.tfstate` in the working directory) is a single-developer toy: no locking, no shared source of truth, and it's routinely committed by accident. Use a remote backend from day one — S3, GCS, Azure Blob, or Terraform Cloud/Enterprise — and enable locking:

- **S3** — `use_lockfile = true` in the backend block (native S3 conditional-write locking); the older DynamoDB-table lock is deprecated but still works on existing setups.
- **GCS** — locking is built into the backend via object generation, nothing extra to configure.
- **Terraform Cloud/Enterprise** — locking is automatic per workspace.

Locking exists to stop two `apply` runs from writing the same state concurrently and corrupting it — never disable it to "unblock" a run; find out why the lock is stuck (`terraform force-unlock` only after confirming no other run is actually in flight).

State is sensitive: it can contain plaintext secrets (DB passwords, API keys) pulled from resource attributes. Restrict backend bucket/table access the same way you'd restrict a secrets store — least-privilege IAM, encryption at rest, never fetched into a log or CI artifact, never committed to version control.

## Module layout

- Root modules per environment (`envs/staging`, `envs/prod`) stay thin — they call reusable modules with environment-specific variables, not their own copy of every resource block.
- Shared logic lives in `modules/*` — a VPC, a database, a service — versioned and reused across environments instead of copy-pasted per env directory.
- Pin explicit versions: `required_providers` with a version constraint per provider, and a pinned `source`/`version` on every module call (a Git ref or registry version, not a floating branch). An unpinned module is a silent breaking change waiting for the next `init`.

## Plan-before-apply discipline

Never `apply` without reading the plan that precedes it — review the *plan output*, not just the diff of `.tf` files. The code diff shows intent; the plan shows what Terraform will actually do, including changes triggered by provider defaults, data source drift, or a module bump that neither diff makes obvious. Treat an unreviewed `apply` the same as an unreviewed `rm -rf`.

`-detailed-exitcode` on `plan` turns "no changes" into a distinguishable exit code (0 = no diff, 2 = diff present, 1 = error) — the seam CI uses to fail a PR that would silently apply drift.

## Drift detection

Infra drifts when something changes outside Terraform — a console click, a manual `kubectl`-equivalent fix under pressure, another tool touching the same resource. Run `terraform plan` on a schedule against every long-lived environment (not just on PR) and alert on a non-empty diff; a drift check that only runs at PR time never catches drift introduced between PRs.

## Workspaces vs directory-per-env

Terraform workspaces (`terraform workspace new staging`) share one backend config and one set of modules across environments, switching only the state file. That's fine for small, structurally-identical, short-lived environments (feature-branch previews). For permanent environments — dev/staging/prod — prefer separate directories with separate backend configs: each environment is then fully explicit, readable on its own, can pin different provider/module versions, and an operator can't `apply` to the wrong environment by forgetting to `workspace select` first. Many teams mix both: directories for the permanent tiers, workspaces for ephemeral ones.

## Import for existing infra

`terraform import` (or the `import` block, generation-friendly since Terraform 1.5) brings a resource created outside Terraform under its management without recreating it. Import one resource at a time, run `plan` immediately after each import, and don't move on until the plan shows zero diff — a nonzero diff means the written config doesn't actually match the imported resource's real attributes, and applying from there would silently reconfigure it.

## Do not

- Store state locally or commit `.tfstate`/`.tfstate.backup` to version control — it can contain secrets and can't be safely shared.
- Skip locking "just for this one quick fix" — that's exactly the run that races another one.
- `apply` without reading the plan, or in CI without a human/gated approval step on a production environment.
- Leave module or provider versions unpinned — a bump you didn't choose becomes a production incident.
- Use workspaces to fake environment separation across structurally different environments — a resource that only exists in prod belongs in its own directory, not an `if var.environment == "prod"` conditional.

## Verify

```sh
terraform fmt -check -recursive
terraform validate
tflint
terraform plan -detailed-exitcode
```
