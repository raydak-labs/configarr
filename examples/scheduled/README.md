# Configarr - scheduled exammple

This is an example how you could run configarr in a scheduled manner outside of kubernetes.
Kubernetes has built in support with CronJobs.

URLs:

- radarr: http://localhost:6501

Cleanup:

```bash
docker-compose -f docker-compose.ofelia.yml down -v
docker-compose -f docker-compose.cron.yml -p cron down -v
docker-compose down -v
```

## Variant: Ofelia (recommended)

Compose file: `docker-compose.ofelia.yml`

This is run with the `ofelia` image (https://github.com/mcuadros/ofelia).
Check guide of ofelia for more configs.
We can rerun an existing container and reuse it or create new containers.
Check `ofelia.ini` for example.

The example shows two variants.
Please just use one which matches your needs.
Both solutions work:

- running with an existing container which always exits and will be restarted
- always running a fresh new container.

```bash
# full path is needed in multiple docker-compose files. Either set direct in file or via env variable
export CONFIGARR_FULL_PATH=$(pwd)
docker-compose up -d

# ofelia
# Please update paths in ofelia.ini before running
docker-compose -f docker-compose.ofelia.yml -p ofelia up -d
docker-compose -f docker-compose.ofelia.yml -p ofelia logs
# clean
docker-compose -f docker-compose.ofelia.yml -p ofelia down -v
```

## Variant: Cron-Like

Compose file: `docker-compose.cron.yml`

This starts a container (https://github.com/BlackDark/dockerfiles/tree/main/cron-dind) which will run cron and we have to mount cron like configurations.
Check the compose file and mounted volumes for how this works.
In summary: mount folder with cron files, cron triggers commands defined there.

The example shows two variants.
Please just use one which matches your needs.
Both solutions work:

- running with an existing container which always exits and will be restarted
- always running a fresh new container.

```bash
# full path is needed in multiple docker-compose files. Either set direct in file or via env variable
export CONFIGARR_FULL_PATH=$(pwd)
docker-compose up -d

# cron like
# please update the paths and uncomment in dir ./cron/*
docker-compose -f docker-compose.cron.yml -p cron up -d cron

# Optional: If using the container reuse functionality:
docker-compose -f docker-compose.cron.yml -p cron up -d configarr

docker-compose -f docker-compose.cron.yml -p cron logs

# clean
docker-compose -f docker-compose.cron.yml -p cron down -v
```

## Side notes

With approaches like this you can easily extends functionalities like:

- notifications (errored state or not)
- cleanup procedures

## Drawbacks with some solutions

- because we are reusing the `docker.sock` (this means running containers on the host) we have to use absolute paths for mounts.
