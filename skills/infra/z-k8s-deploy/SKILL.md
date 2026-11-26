---
name: z-k8s-deploy
description: "Deploy Kubernetes workloads with Helm. Use for pod security, resources, readiness, graceful shutdown, or rollout failures. See [[z-go-dockerfile]] for images and [[z-deploy-pipeline]] for delivery."
---

# Kubernetes deployments

## Set container security and resources

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

Match the effective UID to the image's file permissions and cluster admission policy.
Use a nonzero numeric UID when the kubelet cannot establish whether a named user has UID 0.
Provide writable mounts only for required paths when using a read-only root filesystem.

```yaml
resources:
  requests: { cpu: 100m, memory: 128Mi }
  limits: { memory: 256Mi }
```

Size requests from measured demand. The scheduler uses requests for placement.
Choose memory limits against observed peaks. Under memory pressure, the kernel can kill a process that exceeds the container limit.
Check the pod's restart policy. Select CPU limits with the cluster policy and tail-latency measurements.

## Configure probes and shutdown

```yaml
livenessProbe:  { httpGet: { path: /healthz, port: 8080 }, periodSeconds: 10, failureThreshold: 3 }
readinessProbe: { httpGet: { path: /readyz,  port: 8080 }, periodSeconds: 5 }
startupProbe:   { httpGet: { path: /healthz, port: 8080 }, periodSeconds: 2, failureThreshold: 30 }
lifecycle:
  preStop:
    exec: { command: ["sleep", "5"] }
```

Set `spec.terminationGracePeriodSeconds` on the Pod. Probe and lifecycle fields belong to each container.
Use a supported sleep hook or application drain hook if the image lacks the `sleep` executable.

- **Startup** gates readiness and liveness while the application starts.
- **Readiness** decides whether the endpoint should receive traffic. Include a dependency only when losing it prevents service.
- **Liveness** detects a local failure that requires a restart. A shared dependency outage should not restart every replica.

The grace period includes the `preStop` hook and process shutdown. Allow time for both.
Endpoint updates propagate asynchronously. Measure request completion and endpoint removal during a rollout.

## Select cluster controls

| Control | Requirement |
|---|---|
| PodDisruptionBudget | Limit concurrent voluntary disruptions. Check that the selected replicas can satisfy the budget. |
| HorizontalPodAutoscaler | Provide metrics for the selected target. Check behavior at minimum and maximum replicas. |
| NetworkPolicy | Check that the cluster network plugin enforces the selected ingress or egress rules. |

## Render and operate the chart

Use `values.schema.json` to check input shape. Keep shared labels in `templates/_helpers.tpl`.
Version the chart when its contents change. Set `appVersion` to the packaged application version when it changes.
The image tag or digest comes from the rendered workload. Inspect that field directly.

Keep credentials outside committed values and manifests. Reference the managed Secret by name.
Use ConfigMaps only for non-sensitive configuration.

Check rollout status with `kubectl rollout status deployment/app --timeout=5m`. For an approved rollback, use the release owner.

- For a Helm release, roll back the release revision. For GitOps, revert the desired state through the controller.
- For an unmanaged Deployment, use `kubectl rollout undo deployment/app` or select the reviewed revision with `--to-revision=N`.

Read pod events for scheduling, image, and probe failures. Inspect previous container logs after a restart.
Use a permitted ephemeral debug container when the application image lacks diagnostic tools.
Check runtime support before relying on a shared process namespace.

## Check the workload

Run these examples against the intended namespace, release, and cluster. Preserve both pipeline and command exit codes.
For `kubectl diff`, exit 1 means differences and a higher code indicates an error.

```sh
helm lint ./chart
helm template ./chart | kubeconform -summary -
helm template ./chart | kubectl diff -f -
kubectl rollout status deployment/app --timeout=5m
```
