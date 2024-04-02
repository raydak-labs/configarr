# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable && corepack prepare pnpm@8.15.5 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml /app/

FROM base AS builder
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# https://github.com/evanw/esbuild/issues/1921
FROM node:20-alpine
WORKDIR /app

#USER node

RUN apk add --no-cache libstdc++ dumb-init git

USER node

COPY --from=builder /app/out2.js /app/index.js

ENV CONFIG_LOCATION=/app/config/config.yml
ENV SECRETS_LOCATION=/app/config/secrets.yml

# Run with dumb-init to not start node with PID=1, since Node.js was not designed to run as PID 1
CMD ["dumb-init", "node", "index.js"]
