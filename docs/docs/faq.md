---
sidebar_position: 7
description: "FAQ for configarr and common problems"
keywords: [configarr, faq, troubleshoot]
---

# FAQ

Sometimes, you might encounter unexpected errors. Before reporting an issue, please try the following steps:

## Fresh Install

If you're experiencing strange issues, a fresh install can often resolve them. This involves removing existing data and caches.

- remove all folders (what you have defined in your compose or depending on your setup)
- rerun Configarr which recreates cache folders and more

## Custom TRaSH-Guide or Recyclarr Template URLs

If you have configured a custom `trashGuideUrl` or `recyclarrUrl`, caching issues might occur. In this case, clearing the cache folders is recommended.

- remove the folders for the caches
- rerun Configarr

## Error: "Recv failure: Connection reset by peer"

If you see an error like:

```
GitResponseError: unable to access 'https://github.com/recyclarr/config-templates/': Recv failure: Connection reset by peer
```

This can be caused by Docker bridge network issues, especially with DNS, TLS, or MTU settings. The problem may only occur when using Docker's default bridge network, and not with `network_mode: host`.

Reference issues:

- https://github.com/raydak-labs/configarr/issues/300 (thanks for @jtnqr for helping trouble shooting)

### Troubleshooting Steps

- Try running Configarr with `network_mode: host` in your Docker Compose file. This often resolves the issue immediately.
- Check your DNS and MTU settings if you use custom networking (VPN, Pi-hole, etc.).
- If you have a VPN or custom DNS setup, try disabling them temporarily to see if the problem persists.
- You can also manually clone the repo inside the container to verify if plain `git` works:

  ```sh
  docker exec -it <container_name> sh
  git clone https://github.com/recyclarr/config-templates/
  # also check git pull
  ```

### Example Docker Compose workaround

```yaml
services:
	configarr:
		network_mode: host
		# ...other options
```

> **Note:** Using `network_mode: host` is generally safe for Configarr, as it does not expose ports by default. However, be aware of your environment's security requirements.
