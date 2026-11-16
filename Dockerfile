# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md
# TODO because multiarch build has problems with QEMU and Node we cannot use alpine here: https://github.com/nodejs/docker-node/issues/1798
FROM node:26.13.1-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS base
WORKDIR /app

ENV CI=true

RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Prod copies the bundle and runs node. pnpm is only for this build stage and the dev target.
# Node 26 does not ship corepack. corepack install reads packageManager from package.json.
# renovate: datasource=npm depName=corepack
ARG COREPACK_VERSION=0.36.0
RUN npm install -g corepack@$COREPACK_VERSION \
    && corepack enable \
    && corepack install

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --store-dir /pnpm/store

FROM base AS builder
COPY src src/
COPY esbuild.ts ./

ARG CONFIGARR_VERSION=dev
ARG BUILD_TIME=""
ARG GITHUB_RUN_ID=""
ARG GITHUB_REPO=""
ARG GITHUB_SHA=""

ENV CONFIGARR_VERSION=${CONFIGARR_VERSION}
ENV BUILD_TIME=${BUILD_TIME}
ENV GITHUB_RUN_ID=${GITHUB_RUN_ID}
ENV GITHUB_REPO=${GITHUB_REPO}
ENV GITHUB_SHA=${GITHUB_SHA}

RUN pnpm run build

FROM base AS dev
# manually mount src etc

ARG CONFIGARR_VERSION=dev
ENV CONFIGARR_VERSION=${CONFIGARR_VERSION}

CMD [ "pnpm", "start" ]
# https://github.com/evanw/esbuild/issues/1921
FROM node:26.13.1-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS prod
WORKDIR /app

RUN apk add --no-cache libstdc++ dumb-init git

# Allow global git access independent of container user and directory user. See #240, #241
RUN git config --global --add safe.directory '*'

# TODO maybe in future. Results in breaking change
#USER node

COPY --from=builder /app/bundle.cjs /app/index.js

ARG CONFIGARR_VERSION=dev
ENV CONFIGARR_VERSION=${CONFIGARR_VERSION}
# Run with dumb-init to not start node with PID=1, since Node.js was not designed to run as PID 1
CMD ["dumb-init", "node", "index.js"]

# Compatibility target pinned to Alpine 3.22.
# Useful for testing old-kernel behavior with a fixed Alpine/git stack.
FROM node:26.3.0-alpine3.22@sha256:c7932b9e5e337b0e733d6e16abc1b0e104759e8b05e59ed56586cce967d26dfe AS prod-alpine-3-22
WORKDIR /app

RUN apk add --no-cache libstdc++ dumb-init git

# Allow global git access independent of container user and directory user. See #240, #241
RUN git config --global --add safe.directory '*'

COPY --from=builder /app/bundle.cjs /app/index.js

ARG CONFIGARR_VERSION=dev
ENV CONFIGARR_VERSION=${CONFIGARR_VERSION}
CMD ["dumb-init", "node", "index.js"]
