---
sidebar_position: 2
title: Kubernetes Installation
description: "Learn how to install and configure Configarr using Kubernetes"
keywords: [configarr kubernetes, kubernetes installation, kubernetes setup, configarr configuration, helm, app-template]
---

# Kubernetes Installation Guide

This guide will help you deploy Configarr in a Kubernetes environment. Configarr can be run as a CronJob to periodically sync your configurations.

Configarr does not publish its own Helm chart. Use the manifests below, or the [bjw-s app-template](https://bjw-s-labs.github.io/helm-charts/docs/app-template/) example further down.

## Prerequisites

- A working Kubernetes cluster
- `kubectl` configured to access your cluster
- Basic understanding of Kubernetes resources (ConfigMaps, Secrets, CronJobs)

## Installation Steps

### 1. Create the Configuration Files

First, create `config.yml` and choose how to provide sensitive values:

- `config.yml` - Your main Configarr configuration (required)
- Environment variables via Kubernetes `Secret` + `!env` in `config.yml` (recommended)
- `secrets.yml` + `!secret` in `config.yml` (optional alternative)

For detailed configuration options, see the [Configuration Guide](../configuration/config-file.md).

### 2. Deploy to Kubernetes

Below is a complete example of the necessary Kubernetes resources. Save this as `configarr.yaml`:

```yaml title="configarr.yaml"
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: configarr
spec:
  schedule: "0 * * * *" # Runs every hour
  successfulJobsHistoryLimit: 1
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: configarr
              image: ghcr.io/raydak-labs/configarr:latest
              imagePullPolicy: Always
              tty: true # for color support
              envFrom:
                - configMapRef:
                    name: common-deployment-environment
                - secretRef:
                    name: configarr-env
              volumeMounts:
                - mountPath: /app/repos # Cache repositories
                  name: app-data
                  subPath: configarr-repos
                - name: config-volume # Mount specific config
                  mountPath: /app/config/config.yml
                  subPath: config.yml
          volumes:
            - name: app-data
              persistentVolumeClaim:
                claimName: media-app-data
            - name: config-volume
              configMap:
                name: configarr
          restartPolicy: Never
---
apiVersion: v1
kind: Secret
metadata:
  name: configarr-env
type: Opaque
stringData:
  SONARR_API_KEY: "your-sonarr-api-key-here"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: configarr
data:
  config.yml: |
    trashGuideUrl: https://github.com/TRaSH-Guides/Guides
    recyclarrConfigUrl: https://github.com/recyclarr/config-templates

    sonarr:
      series:
        base_url: http://sonarr:8989
        api_key: !env SONARR_API_KEY

        quality_definition:
          type: series

        include:
          # WEB-1080p
          - template: sonarr-quality-definition-series
          - template: sonarr-v4-quality-profile-web-1080p
          - template: sonarr-v4-custom-formats-web-1080p

          # WEB-2160p
          - template: sonarr-v4-quality-profile-web-2160p
          - template: sonarr-v4-custom-formats-web-2160p

        custom_formats: []
    radarr: {}
```

### 3. Deploy the Resources

Apply the configuration to your cluster:

```bash title="shell"
kubectl apply -f configarr.yaml
```

## Helm with app-template

The same workload can be installed with [app-template](https://bjw-s-labs.github.io/helm-charts/docs/app-template/) 5.2.1. That chart renders a CronJob, ConfigMap, and PersistentVolumeClaim from `values.yaml`. Values changed between major versions, so check the [upgrade notes](https://bjw-s-labs.github.io/helm-charts/docs/app-template/#upgrade-instructions) before moving off 5.x. The chart needs Kubernetes 1.28 or newer.

Create the API key outside the chart. Do not commit it in `values.yaml`. Helm stores release values in the cluster, and a committed file ends up in git.

```bash title="shell"
kubectl create secret generic configarr-env \
  --from-literal=SONARR_API_KEY='your-sonarr-api-key-here'
```

Save the values as `configarr-values.yaml`:

```yaml title="configarr-values.yaml"
controllers:
  configarr:
    type: cronjob
    cronjob:
      schedule: "0 * * * *" # hourly
      timeZone: Etc/UTC
      concurrencyPolicy: Forbid # skip a new run while the previous one is still active
      startingDeadlineSeconds: 600
      backoffLimit: 1
      successfulJobsHistory: 1
      failedJobsHistory: 3
    containers:
      configarr:
        image:
          repository: ghcr.io/raydak-labs/configarr
          tag: "1.33.0" # pin a release; avoid latest
          pullPolicy: IfNotPresent
        tty: true # colored logs
        env:
          TZ: Etc/UTC
        envFrom:
          - secret: configarr-env
        resources:
          requests:
            cpu: 50m
            memory: 128Mi
          limits:
            memory: 1Gi

configMaps:
  config:
    data:
      config.yml: |
        trashGuideUrl: https://github.com/TRaSH-Guides/Guides
        recyclarrConfigUrl: https://github.com/recyclarr/config-templates

        sonarr:
          series:
            base_url: http://sonarr:8989
            api_key: !env SONARR_API_KEY

            quality_definition:
              type: series

            include:
              # WEB-1080p
              - template: sonarr-quality-definition-series
              - template: sonarr-v4-quality-profile-web-1080p
              - template: sonarr-v4-custom-formats-web-1080p

              # WEB-2160p
              - template: sonarr-v4-quality-profile-web-2160p
              - template: sonarr-v4-custom-formats-web-2160p

            custom_formats: []
        radarr: {}

persistence:
  config:
    type: configMap
    identifier: config
    advancedMounts:
      configarr:
        configarr:
          - path: /app/config/config.yml
            subPath: config.yml
            readOnly: true
  repos:
    type: persistentVolumeClaim
    accessMode: ReadWriteOnce
    size: 1Gi
    retain: true
    globalMounts:
      - path: /app/repos
```

`identifier: config` is the chart's name for that ConfigMap. With a single controller, app-template names the CronJob after the Helm release.

Install it:

```bash title="shell"
helm repo add bjw-s https://bjw-s-labs.github.io/helm-charts
helm repo update
helm install configarr bjw-s/app-template --version 5.2.1 -f configarr-values.yaml
```

The OCI chart is the same package: `oci://ghcr.io/bjw-s-labs/helm/app-template`.

### What this values file sets

Configarr exits when the sync finishes, so the controller type is `cronjob`. There is no Service or Ingress.

`concurrencyPolicy: Forbid` stops a second sync from starting while the previous Job is still running. `startingDeadlineSeconds: 600` still starts the Job if the cluster misses the schedule by up to 10 minutes. The chart default is 30 seconds. `backoffLimit: 1` retries a failed sync once. The chart default is 6.

`failedJobsHistory: 3` keeps a few failed Pods so you can still read the logs. `successfulJobsHistory: 1` matches the manifest example above.

`/app/repos` is a PersistentVolumeClaim. Configarr clones TRaSH Guides and the Recyclarr templates there, and the cache avoids downloading them on every run. `retain: true` keeps that claim when you uninstall the release. `ReadWriteOnce` is enough for one CronJob.

The memory limit is a starting point. Raise it if the Job is OOMKilled while cloning those repositories.

`tty: true` keeps colored log output, same as the manifest example. The image tag is pinned. Change `1.33.0` when you upgrade. `pullPolicy: IfNotPresent` is enough for a fixed tag.

The container reads `SONARR_API_KEY` from the Secret created above. `config.yml` references it with `!env`. Add other instance keys the same way. If you use local custom formats or templates, add mounts for `/app/cfs` and `/app/templates`. See [Docker volume mappings](docker.md#volume-mappings).

The image runs as root.

## Configuration Details

### CronJob Configuration

- `schedule`: Set how often Configarr should run (default: hourly)
- `successfulJobsHistoryLimit` and `failedJobsHistoryLimit`: Control how many completed/failed jobs to keep

### Volume Mounts

1. **Repository Cache** (`/app/repos`):
   - Persists downloaded repositories to avoid repeated downloads
   - Requires a PersistentVolumeClaim

2. **Configuration** (`/app/config/config.yml`):
   - Main configuration file mounted from ConfigMap
   - See [Configuration Guide](../configuration/config-file.md) for options

3. **Environment Variables** (`envFrom.secretRef`):
   - Sensitive data loaded from Kubernetes Secret
   - Referenced with `!env` in `config.yml`
   - Avoids duplicating API keys in both Kubernetes Secrets and a mounted `secrets.yml`

### Security Considerations

- Store sensitive information in Kubernetes Secrets
- Use `!env` in `config.yml` to read values injected from Kubernetes Secrets
- If you prefer mounted secret files, `!secret` with `secrets.yml` is still supported
- Consider using sealed secrets or external secret management solutions

## Alternative Deployment Options

If Kubernetes is not suitable for your environment, consider:

- [Docker Installation](docker.md) for simpler containerized deployment
- Running directly on the host system

## Troubleshooting

1. Check the CronJob logs:

   ```bash
   kubectl get pods | grep configarr
   kubectl logs <pod-name>
   ```

2. Verify your secret-backed environment variables are present:

   ```bash
   kubectl describe pod <pod-name>
   ```

3. Ensure your PersistentVolumeClaim is bound:
   ```bash
   kubectl get pvc
   ```

For more detailed configuration options, refer to the [Configuration Guide](../configuration/config-file.md).
