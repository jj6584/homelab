# Observability

Flux deploys kube-prometheus-stack, Loki, and Alloy from this directory.

## Coverage

- Alloy tails Kubernetes container stdout/stderr in **every namespace**, including namespaces created later. A DaemonSet agent runs on each node, including tainted nodes, and discovers only pods assigned to that node. No per-app log configuration is needed.
- Logs carry `cluster="homelab"`, `namespace`, `pod`, `container`, `node`, and `app`. The app label uses `app.kubernetes.io/name`, then `app`, then the container name. Existing media queries continue to work.
- Prometheus collects node, kubelet/cAdvisor, and kube-state-metrics data across the cluster. New workloads automatically have CPU, memory, network, readiness, and restart metrics where those signals are exposed by Kubernetes.
- Prometheus discovers ServiceMonitors, PodMonitors, Probes, and PrometheusRules in all namespaces, without requiring a Helm release label. Alloy and Loki ServiceMonitors expose log collector and storage health metrics as well.
- Grafana discovers ConfigMaps labeled `grafana_dashboard: "1"` across all namespaces. The provisioned **Kubernetes / All Workloads** dashboard combines metrics and logs with dynamic namespace, pod, and container selectors. Existing Kubernetes, Flux, and media dashboards remain available.

This covers Kubernetes workload logs and resource metrics. Logs written only to files inside containers must also be sent to stdout/stderr or collected with an app-specific pipeline. Talos host/service logs and services outside Kubernetes need separate collectors. Application business metrics require instrumentation or an exporter; discovery cannot create metrics an app does not expose. `prometheus.io/scrape` annotations alone do not configure this stack.

## Adding an application

Container logs and Kubernetes resource metrics require no observability manifest changes. Use `app.kubernetes.io/name` on the pod template for a stable log app label, and write logs to stdout/stderr.

If a Helm chart supports a ServiceMonitor or PodMonitor, enable it in that app's chart values. Otherwise expose a named metrics port and add a monitor alongside the app. For example, for a pod in `my-app` with label `app.kubernetes.io/name: my-app` and a container port named `metrics`:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: my-app
  namespace: my-app
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: my-app
  podMetricsEndpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

Include the monitor in the app's `kustomization.yaml`. The monitoring CRDs must exist before that resource reconciles. Use either the chart's monitor or a manually defined monitor for a given endpoint to avoid duplicate scrapes. Configure authentication, TLS, and NetworkPolicy access when an endpoint requires them.

App-specific dashboards can live alongside their apps as labeled ConfigMaps. Use datasource UIDs `prometheus` and `loki`; no edits to the central dashboard list are needed for independently provisioned ConfigMaps.

## Validation and rollout

Validate the manifests before committing:

```sh
flux build kustomization observability \
  --path ./infrastructure/observability \
  --kustomization-file ./clusters/homelab/observability.yaml \
  --dry-run > /tmp/homelab-observability.yaml
```

After the changes reach the branch watched by Flux and reconcile:

1. Check `kubectl -n observability get daemonset alloy`: desired, current, and ready agents should match the eligible node count.
2. Check `kubectl -n observability get prometheus -o yaml`: monitor and namespace selectors should be `{}`. Check Prometheus Targets for failed scrapes, including Alloy.
3. Open **Kubernetes / All Workloads** in Grafana. Select `finance`, `homepage`, `flux-system`, or another namespace and check CPU/memory and recent logs. The default All selection includes infrastructure. Namespace and pod lists use Kubernetes metrics so apps with no recent logs remain selectable. Use All to include historical logs from deleted pods.
4. In Loki Explore, query `{cluster="homelab",namespace="finance"}` or `sum by (namespace) (count_over_time({cluster="homelab"}[5m]))`. Only containers that emit logs will appear; collection cannot reconstruct logs already rotated away.
5. Add a new workload in a new namespace and confirm it appears without changing observability configuration. For a metrics endpoint, add its monitor and confirm `up` is 1.

The namespace-level scrape-health and deployment panels intentionally ignore pod/container filters. Error-like log counts use text matching and are a troubleshooting aid, not a structured severity metric.

Loki retains logs for seven days on its existing 10 GiB volume. Cluster-wide collection increases storage and collector usage; monitor volume utilization and Alloy errors as traffic grows. Prometheus retains seven days but currently has no persistent volume configured, so its history can be lost when its pod is replaced. Grafana dashboards are provisioned from Git; UI-only changes are not durable.

## Configuration references

- [Alloy Kubernetes discovery](https://grafana.com/docs/alloy/latest/reference/components/discovery/discovery.kubernetes/)
- [Prometheus Operator monitor selection](https://prometheus-operator.dev/docs/api-reference/api/)
