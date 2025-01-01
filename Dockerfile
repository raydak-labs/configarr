# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md
# TODO because multiarch build has problems with QEMU and Node we cannot use alpine here: https://github.com/nodejs/docker-node/issues/1798
FROM node:22.12.0-slim AS base
WORKDIR /app

ENV PNPM_HOME="/opt/pnpm"
ENV COREPACK_HOME="/opt/corepack"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./

# Do it here to add the packageManager field to the package.json
RUN corepack enable \
    && corepack prepare pnpm@9 --activate \
    && corepack use pnpm@9

RUN pnpm config set store-dir ~/.pnpm-store

RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store pnpm install --frozen-lockfile

FROM base AS builder
COPY src src/
COPY esbuild.ts ./

RUN pnpm run build

FROM base AS dev
# manually mount src etc

CMD [ "pnpm", "start" ]

# https://github.com/evanw/esbuild/issues/1921
FROM node:22.12.0-alpine AS prod
WORKDIR /app

RUN apk add --no-cache libstdc++ dumb-init git

# TODO maybe in future. Results in breaking change
#USER node

COPY --from=builder /app/bundle.cjs /app/index.js

# Run with dumb-init to not start node with PID=1, since Node.js was not designed to run as PID 1
CMD ["dumb-init", "node", "index.js"]
