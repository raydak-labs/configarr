# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md
FROM node:22.5.1-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml /app/

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base
RUN corepack use pnpm@9
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY index.ts /app/
COPY src/ /app/src/

ENV CONFIG_LOCATION=/app/config/config.yml
ENV SECRETS_LOCATION=/app/config/secrets.yml

#USER node

CMD [ "pnpm", "start" ]
