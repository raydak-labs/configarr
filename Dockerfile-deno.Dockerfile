# https://github.com/denoland/deno_docker/blob/main/example/Dockerfile

FROM denoland/deno:alpine-2.0.0 AS base
WORKDIR /app

RUN apk add --no-cache libstdc++ dumb-init git

COPY package.json pnpm-lock.yaml ./

RUN deno install

FROM base AS builder
COPY src src/
COPY index.ts esbuild.ts ./

RUN deno --allow-env --allow-read --allow-run esbuild.ts

FROM base AS dev
ENV CONFIG_LOCATION=/app/config/config.yml
ENV SECRETS_LOCATION=/app/config/secrets.yml
ENV DENO_DIR=/app/.deno_cache
# manually mount src etc

CMD ["deno", "--allow-env", "--allow-read", "--allow-run", "--allow-net", "--allow-sys", "--unstable-sloppy-imports", "index.ts"]

# https://github.com/evanw/esbuild/issues/1921
FROM denoland/deno:alpine-2.0.0 AS prod
WORKDIR /app

RUN apk add --no-cache libstdc++ dumb-init git

# TODO maybe in future. Results in breaking change
#USER node

COPY --from=builder /app/bundle.cjs /app/index.cjs

ENV CONFIG_LOCATION=/app/config/config.yml
ENV SECRETS_LOCATION=/app/config/secrets.yml
ENV DENO_DIR=/app/.deno_cache

# Compile cache / modify for multi-user
RUN deno cache --unstable-sloppy-imports index.cjs || true
RUN chmod uga+rw -R ${DENO_DIR}

# Not sure about those options
#--cached-only
#--no-code-cache

# TODO not sure about this
# Run with dumb-init to not start node with PID=1, since Node.js was not designed to run as PID 1
CMD ["dumb-init", "deno", "--allow-env", "--allow-read", "--allow-run", "--allow-net", "--allow-sys", "--unstable-sloppy-imports", "index.cjs"]


# BUN Sample
# FROM oven/bun:1.1.30-alpine AS prod
# WORKDIR /app

# RUN apk add --no-cache libstdc++ dumb-init git

# # TODO maybe in future. Results in breaking change
# #USER node

# COPY --from=builder /app/bundle.cjs /app/index.cjs

# ENV CONFIG_LOCATION=/app/config/config.yml
# ENV SECRETS_LOCATION=/app/config/secrets.yml

# # Run with dumb-init to not start node with PID=1, since Node.js was not designed to run as PID 1
# CMD ["dumb-init", "bun", "index.cjs"]
