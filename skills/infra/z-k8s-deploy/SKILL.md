---
name: z-k8s-deploy
description: Production Kubernetes deploys with Helm — securityContext, resource limits, probe design with preStop/terminationGracePeriodSeconds shutdown, PDB/HPA/NetworkPolicy, chart/rollout/debug flow. Use when writing a Helm chart or debugging a stuck rollout. Image build [[z-go-dockerfile]]; ship pipeline [[z-deploy-pipeline]].
---

# Kubernetes Deploy

A deployed manifest earns trust the same way a Dockerfile does: nothing runs as root, nothing gets more than it needs, and the cluster can tell a healthy pod from a broken one before traffic hits it.

## securityContext

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 65532
    seccompProfile: { type: RuntimeDefault }
  containers:
    - name: app
      securityContext:
        readOnlyRootFilesystem: true
        allowPrivilegeEscalation: false
        capabilities: { drop: ["ALL"] }
```

Pod-level `runAsNonRoot` fails the pod at admission if the image's own `USER` is root — set it even when the image already declares a non-root user, so a future base-image regression is caught here instead of in prod. `readOnlyRootFilesystem` forces any scratch space (temp files, caches) through an explicit `emptyDir` volume mount — that's the intended friction, not a bug to work around with a writable root.

## Resources

```yaml
resources:
  requests: { cpu: 100m, memory: 128Mi }
  limits: { memory: 256Mi }
```

Set a memory limit — an OOM-killed pod restarts cleanly. Think twice before a CPU limit: the kernel's CFS bandwidth controller throttles in fixed periods regardless of how briefly the burst lasted, which shows up as latency spikes worse than just letting the pod use spare node capacity. `requests` drive scheduling and are the number that actually matters; size them from observed usage, not a guess.

## Probes and graceful shutdown

```yaml
livenessProbe:  { httpGet: { path: /healthz, port: 8080 }, periodSeconds: 10, failureThreshold: 3 }
readinessProbe: { httpGet: { path: /readyz,  port: 8080 }, periodSeconds: 5 }
startupProbe:   { httpGet: { path: /healthz, port: 8080 }, periodSeconds: 2, failureThreshold: 30 }
lifecycle:
  preStop:
    exec: { command: ["sleep", "5"] }
terminationGracePeriodSeconds: 30
```

- **liveness** — restart the container if it's wedged; keep this cheap, no dependency checks.
- **readiness** — pull the pod out of Service endpoints without restarting it; this is where a broken DB connection belongs.
- **startup** — gates the other two on slow-booting apps so liveness doesn't kill a container still warming up.

On `kubectl delete`/rollout, the kubelet fires `preStop` *before* sending SIGTERM, and only sends SIGTERM once `preStop` returns. Endpoint removal from the Service and the SIGTERM race each other across kube-proxy/ingress — a short `sleep` in `preStop` buys time for that propagation to catch up so in-flight requests don't land on a pod that's already gone. `terminationGracePeriodSeconds` must exceed `preStop` duration plus the app's own shutdown timeout, or the kubelet SIGKILLs mid-drain.

## PDB, HPA, NetworkPolicy — when they earn their keep

| Pattern | Add it when |
|---|---|
| `PodDisruptionBudget` (`minAvailable`/`maxUnavailable`) | replicas > 1 and a voluntary disruption (node drain, cluster upgrade) shouldn't take every pod down at once |
| `HorizontalPodAutoscaler` | load is variable enough to justify it; needs `metrics-server` for CPU/memory targets, KEDA or a custom metrics adapter for anything else |
| `NetworkPolicy` | multi-tenant namespaces or a compliance requirement demands segmentation — default-deny ingress, then explicit allows. Requires a policy-enforcing CNI (Calico, Cilium); plain Flannel silently ignores it |

None of these is a default add for a single-tenant, low-traffic service — each is real cost (another object to reconcile, another failure mode to debug) that should track a real requirement.

## Helm chart structure

- `values.schema.json` alongside `values.yaml` — `helm lint`/`helm install` reject malformed values before they reach the API server.
- `templates/_helpers.tpl` for shared label/name templates (`{{ include "app.labels" . }}`) — one definition, not copy-pasted blocks per template.
- Pin `Chart.yaml` `version` (chart semver) separately from `appVersion` (the image tag); bump both on every release.
- Keep templates declarative. A chart that needs `{{ if }}`/`{{ range }}` nesting three levels deep to express one deploy usually means the values schema is wrong, not that the template needs another conditional.

## Rollout and debug flow

```sh
kubectl rollout status deployment/app
kubectl rollout undo deployment/app                    # back to previous revision
kubectl rollout undo deployment/app --to-revision=N
```

Triage order on a stuck or crashing pod: `kubectl describe pod <pod>` first — the Events section at the bottom shows scheduling failures, image pull errors, and probe failures before you ever need a log line. Then `kubectl logs <pod>` (add `--previous` for a pod that already restarted). Then `kubectl get events --sort-by=.lastTimestamp` for cluster-wide context (evictions, OOM kills elsewhere).

For a distroless image with no shell, `kubectl debug -it pod/app --image=busybox --target=app` attaches an ephemeral debug container sharing the target's process namespace — no restart, no rebuilding the image with a shell just to `curl` from inside it.

## Config and secrets

`ConfigMap` for non-sensitive config only. Never put secrets in `values.yaml` or a plain `Secret` manifest — both land unencrypted in the Helm release history and in version control if committed. Source secrets from an external store (cloud KMS-backed secret manager, External Secrets Operator, Sealed Secrets) that injects them at deploy time; the chart references the resulting `Secret` name, never the value.

## Do not

- Set `runAsNonRoot: true` and stop there — pair it with a numeric `runAsUser` or a `USER` in the image that's actually non-root, or the pod fails to start.
- Add a CPU `limit` by default — profile first; CFS throttling under a limit often causes worse tail latency than no limit at all.
- Rely on `livenessProbe` to check downstream dependencies — a flaky DB then restart-loops every pod that depends on it.
- Skip `terminationGracePeriodSeconds` tuning on a service with real in-flight requests — the 30s default is a guess, not a measurement.
- Put a NetworkPolicy in the chart without confirming the cluster's CNI enforces it — it silently does nothing on Flannel.

## Verify

```sh
helm lint ./chart
helm template ./chart | kubeconform -summary -
kubectl diff -f ./chart/rendered.yaml     # or: helm diff upgrade (if the plugin is installed)
kubectl rollout status deployment/app
```
