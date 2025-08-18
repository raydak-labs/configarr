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
