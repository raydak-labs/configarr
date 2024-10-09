# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md
FROM node:22.9.0-slim AS base
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
COPY index.ts esbuild.ts ./

RUN pnpm run build

FROM base AS dev
ENV CONFIG_LOCATION=/app/config/config.yml
ENV SECRETS_LOCATION=/app/config/secrets.yml
# manually mount src etc

CMD [ "pnpm", "start" ]

# https://github.com/evanw/esbuild/issues/1921
# TODO not using alpine for now because different error messages for example for requests.
FROM node:22.9.0-slim AS prod
WORKDIR /app

#RUN apk add --no-cache libstdc++ dumb-init git

RUN apt-get update && apt-get install -y \
    git \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# TODO maybe in future. Results in breaking change
#USER node

COPY --from=builder /app/bundle.cjs /app/index.js

ENV CONFIG_LOCATION=/app/config/config.yml
ENV SECRETS_LOCATION=/app/config/secrets.yml

# Run with dumb-init to not start node with PID=1, since Node.js was not designed to run as PID 1
CMD ["dumb-init", "node", "index.js"]
