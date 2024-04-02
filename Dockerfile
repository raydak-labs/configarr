# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md
FROM node:22.9.0-slim AS base
ENV PNPM_HOME="/opt/pnpm"
ENV COREPACK_HOME="/opt/corepack"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json pnpm-lock.yaml /app/

# Do it here to add the packageManager field to the package.json
RUN corepack enable \
    && corepack prepare pnpm@9 --activate \
    && corepack use pnpm@9

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS builder
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build


FROM base AS dev
WORKDIR /app
ENV CONFIG_LOCATION=/app/config/config.yml
ENV SECRETS_LOCATION=/app/config/secrets.yml
CMD [ "pnpm", "start" ]

# https://github.com/evanw/esbuild/issues/1921
FROM node:22.9.0-alpine as prod
WORKDIR /app

RUN apk add --no-cache libstdc++ dumb-init git

#USER node

COPY --from=builder /app/bundle.cjs /app/index.js

ENV CONFIG_LOCATION=/app/config/config.yml
ENV SECRETS_LOCATION=/app/config/secrets.yml

# Run with dumb-init to not start node with PID=1, since Node.js was not designed to run as PID 1
CMD ["dumb-init", "node", "index.js"]
