# Development related README

## Compiling to binary

### bun (trying)

- compiles and treeshakes code already
- `bun build src/index.ts --compile --outfile cli-bun`
- size: 61mb

```bash
# what could be done but now sure if any real benefit
bun build src/index.ts \
    --compile \
    --outfile configarr-${{ matrix.platform }} \
    --define CONFIGARR_VERSION=\"${{ steps.vars.outputs.version }}\" \
    --define BUILD_TIME=\"${{ steps.vars.outputs.build_time }}\" \
    --define GITHUB_RUN_ID=\"${{ steps.vars.outputs.run_id }}\" \
    --define GITHUB_REPO=\"${{ steps.vars.outputs.repo }}\" \
    --define GITHUB_SHA=\"${{ steps.vars.outputs.sha }}\" \
    --define BUILD_PLATFORM=\"${{ matrix.platform }}\" \
    --bytecode \
    --production \
    --minify \
    --minify-syntax \
    --minify-whitespace \
    --minify-identifiers \
    ${{ github.event.inputs.baseline == 'true' && '--target=bun' || '' }}
```

### deno

- `pnpm build`
- `deno compile --no-check --sloppy-imports --output cli-deno --no-npm --allow-all bundle.cjs`
- size: 77mb

## docker

- we could probably just use scratch as base? with the binary?
