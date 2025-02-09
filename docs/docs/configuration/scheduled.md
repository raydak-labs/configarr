---
sidebar_position: 5
title: Scheduling
description: "How to run configarr regulary/schedueld"
keywords: [configarr configuration, schedule, scheduler, regular, cron]
---

# Scheduling configarr

This section describes how you could run configarr in a scheduled manner.
Depending on your used deployment or third party ([check](../installation/third-party.md)) you can have different methods for running in schedule.

:::info
Configarr does not support scheduled execution inside the container and most likely never will.
Scheduling functionalities should be something which is handled outside of the container and something which should be bundled inside each app.
:::

## Kubernetes

Kubernetes support for scheduling jobs is straigthforward.
We have explicit resources for this tasks: `CronJobs`
See [Kubernetes Setup](/docs/installation/kubernetes) for more information.

## Docker

For docker and docker-compose we do not have explicit functionalities.
Therefore we have to create our own scheduled tasks.
There are different ways we could achieve this:

- default cron scheduler on linux systems
- running scheduler containers which executes other docker containers

We have create examples for how to run the container based solutions.
Check [examples/scheduled](/docs/examples#scheduled-example) for more information.
