---
name: z-terraform
description: "Plan and review Terraform or OpenTofu changes. Use for state locking, imports, environment isolation, drift detection, or saved plans. See [[z-deploy-pipeline]] for deployment wiring."
---

# Terraform state and plans

## Identify the target

Inspect the CLI version, backend, root module, workspace, and credentials. Check backend options against the selected Terraform or OpenTofu release.
Use separate root modules and credentials when environments require access isolation. CLI workspaces in one backend separate state.
Share modules for common resources. Pin external module sources and constrain providers. Use the project's provider lockfile.

## Protect state

Use a shared backend for a shared environment. Restrict access, enable encryption, and keep state out of source control and logs.

| Terraform backend | Locking |
|---|---|
| S3 | Enable supported S3 lockfiles with `use_lockfile = true`. Check migration requirements for legacy DynamoDB locking. |
| GCS | The backend supports locking through object generation. |
| HCP Terraform or Terraform Enterprise | The workspace provides locking. |
| Local | Filesystem locking applies to local state. Independent copies do not share a lock. |

Investigate a stuck lock before using `force-unlock`. Identify the owner and check for active operations.

## Review and apply

1. Create the plan for the intended workspace and backend. Review replacements, deletions, and changes to dependent resources.
2. For a gated deployment, use `plan -out` and inspect the saved artifact with `show`.
3. Protect the plan like state. It can contain secrets.
4. Apply the reviewed plan only to its approved target. Review any replacement plan separately.
5. Schedule drift checks for long-lived environments. With `plan -detailed-exitcode`, 0 means no changes, 1 means error, and 2 means changes.

## Import an existing resource

Match its real identifier and configuration to the intended state address.
Use `terraform import` or a supported `import` block. Run a new plan after import.
Explain each difference before applying. An intentional later change needs its own review.

## Check the plan

```sh
terraform fmt -check -recursive
terraform validate
tflint
terraform plan -detailed-exitcode
```

Read the exit status and resource actions. Check that the saved plan, target environment, and approved change agree.
See [[z-k8s-deploy]] for Kubernetes workload behavior.
