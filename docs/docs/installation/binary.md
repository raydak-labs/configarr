---
sidebar_position: 4
title: Binary
description: "Run configarr as binary file"
keywords: [configarr binary, configarr executable]
---

import Admonition from "@theme/Admonition";
import CodeBlock from "@theme/CodeBlock";
import DockerBasicConf from "!!raw-loader!./\_include/docker-basic-conf.yml";

# Executable / Binary <span className="theme-doc-version-badge badge badge--secondary configarr-badge">1.17.0</span>

With <span className="theme-doc-version-badge badge badge--secondary configarr-badge">1.17.0</span> we have started to distribute configarr additionally as binary files.
This is currently based on [Bun Compilation](https://bun.com/docs/bundler/executables)

If you have problems or feedback feel free to create an issue to discuss potential problems or optimizations.

## Quick Start

Checkout the releases in [Github](https://github.com/raydak-labs/configarr/releases/).
There we will attach binaries for different architectures and systems.

The files are probably compressed and need to be extracted.
Afterwards you can run the executable as any other program or tool.

Need more help? [open an issue](https://github.com/raydak-labs/configarr/issues).

## FAQ

- `On MacOS if I download files the file is corrupt`: If downloaded via browser or something the resulting executable can be quarantined.
  - To check attributes: `xattr ./configarr -l`
  - To remove quarantine: `xattr -dr com.apple.quarantine ./configarr`
