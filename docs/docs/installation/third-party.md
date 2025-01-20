---
sidebar_position: 3
title: Third party
description: "Learn how to install and configure Configarr in third party services."
keywords: [configarr docker, docker installation, docker setup, unraid]
---

# Third partys

This guide will walk you through setting up Configarr in 3rd party services.

:::tip
As this is new and you are missing some services feel free to create a PR!

Contributions welcome!
:::

## Unraid

:::tip
Existing apps in Unraid CA are not maintained by us!
If donating it is not directed to us! Please check configarr Github pages if you want to donate.
Contributions welcome!
:::

Setting up in Unraid with docker is straigth forward and combined with `ofelia` we can schedule the containers easily.

_HINT_: The provided Apps in Unraid are not maintained by us!

Make sure to enable Advanced/extended view in Unraid (top right).

- Configarr:

  ```
  Name: configarr (we need this later on)
  Repository: configarr/configarr:latest # Recommendation: use tags like 1.9.0

  (add volume mappings like your setups requires it. Example with <name> - <host/unraid path>:<container path>)
  Config volume - /mnt/user/appdata/configarr/config:/app/config
  Repo cache - /mnt/user/appdata/configarr/repos:/app/repos
  Custom formats - /mnt/user/appdata/configarr/cfs:/app/cfs
  Templates - /mnt/user/appdata/configarr/templates:/app/templates
  ```

  - Add other variables or mapping as your setup requires it
  - Afterwards create the required files in the config volume `config.yml` and `secrets.yml` (check examples or this guide)

- Ofelia (scheduler):

  ```
  Name: ofelia
  Repository: mcuadros/ofelia:latest # Recommendation: use specific tags not latest
  Post Arguments: daemon --config=/opt/config.ini

  (add volume mappings like your setups requires it. Example with <name> - <host/unraid path>:<container path>)
  Docker socket - /var/run/docker.sock:/var/run/docker.sock (Read Only)
  Ofelia config file - /mnt/user/appdata/ofelia/ofelia.ini:/opt/config.ini (Read only)
  ```

  - Make sure to create the `ofelia.ini` file best before starting the container

  ```ini
  [job-run "run-configarr-existing-container"]
  schedule = @every 10s # adjust as required. Recommendation every 3h or so
  container = configarr # this is the name of container we gave
  ```

  - you can also activate `autostart` for ofelia

![Unraid Setup with the containers](_images/unraid_setup.webp)

Now start both containers.
Check the logs if configarr works as expected (exit code should be 0).
Ofelia should keep running and restarting the configarr in your defined interval.

**Enjoy!**

 
