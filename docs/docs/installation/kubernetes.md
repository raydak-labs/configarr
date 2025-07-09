---
sidebar_position: 2
title: Kubernetes Installation
description: "Learn how to install and configure Configarr using Kubernetes"
keywords: [configarr kubernetes, kubernetes installation, kubernetes setup, configarr configuration]
---

# Kubernetes Installation Guide

This guide will help you deploy Configarr in a Kubernetes environment. Configarr can be run as a CronJob to periodically sync your configurations.

## Prerequisites

- A working Kubernetes cluster
- `kubectl` configured to access your cluster
- Basic understanding of Kubernetes resources (ConfigMaps, Secrets, CronJobs)

## Installation Steps

### 1. Create the Configuration Files

First, you'll need to create two files:

- `config.yml` - Your main Configarr configuration
- `secrets.yml` - Contains sensitive information like API keys

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
              volumeMounts:
                - mountPath: /app/repos # Cache repositories
                  name: app-data
                  subPath: configarr-repos
                - name: config-volume # Mount specific config
                  mountPath: /app/config/config.yml
                  subPath: config.yml
                - name: secret-volume
                  mountPath: /app/config/secrets.yml # Mount secrets
                  subPath: secrets.yml
          volumes:
            - name: app-data
              persistentVolumeClaim:
                claimName: media-app-data
            - name: config-volume
              configMap:
                name: configarr
            - name: secret-volume
              secret:
                secretName: configarr
          restartPolicy: Never
---
apiVersion: v1
kind: Secret
metadata:
  name: configarr
type: Opaque
stringData:
  secrets.yml: |
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
        api_key: !secret SONARR_API_KEY

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

3. **Secrets** (`/app/config/secrets.yml`):
   - Sensitive data mounted from Kubernetes Secret
   - Used for API keys and other credentials

### Security Considerations

- Store sensitive information in Kubernetes Secrets
- Use `!secret` in your config.yml to reference values from secrets.yml
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

2. Verify your secrets are properly mounted:

   ```bash
   kubectl describe pod <pod-name>
   ```

3. Ensure your PersistentVolumeClaim is bound:
   ```bash
   kubectl get pvc
   ```

For more detailed configuration options, refer to the [Configuration Guide](../configuration/config-file.md).
