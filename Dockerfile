# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md
# TODO because multiarch build has problems with QEMU and Node we cannot use alpine here: https://github.com/nodejs/docker-node/issues/1798
FROM node:26.13.0-slim@sha256:e4db4c914bf8ad241bd24804fc25d272d89bad97e68cdc8a1414862790a02c39 AS base
WORKDIR /app

ENV PNPM_HOME="/opt/pnpm"
ENV COREPACK_HOME="/opt/corepack"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./

# Node 26 images no longer ship corepack. corepack use writes packageManager into package.json.
RUN npm install -g corepack@0.36.0 \
    && corepack enable \
    && corepack prepare pnpm@10 --activate \
    && corepack use pnpm@10

RUN pnpm config set store-dir ~/.pnpm-store

RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store pnpm install --frozen-lockfile

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
FROM node:26.13.0-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS prod
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
