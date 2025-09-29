

## bun

- compiles and treeshakes code already
- `bun build src/index.ts --compile --outfile cli-bun`
- size: 61mb

## deno

- `pnpm build`
- `deno compile --no-check --sloppy-imports --output cli-deno --no-npm --allow-all bundle.cjs`
- size: 77mb

## docker

- we could probably just use scratch as base?
