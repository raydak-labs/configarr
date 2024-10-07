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

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY index.ts /app/
COPY src/ /app/src/

ENV CONFIG_LOCATION=/app/config/config.yml
ENV SECRETS_LOCATION=/app/config/secrets.yml

RUN chmod uga+rw -R /app/package.json

#USER node

CMD [ "pnpm", "start" ]
