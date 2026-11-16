# Media naming resource split

**Status:** implemented (2026-11-16)
**Plan:** [2026-11-16-clean-code-yagni.md](../plans/2026-11-16-clean-code-yagni.md)
**Previous spec:** [2026-11-16-large-module-splits-design.md](./2026-11-16-large-module-splits-design.md)

## Scope change

The config split kept both app mappings in `configMediaNaming.ts`. The follow-up request makes media
naming a dedicated resource and requires app-specific API contracts to stay separated.

## Decisions

- `mediaNamingBase.ts` resolves configured names against typed TRaSH string maps and logs unknown names.
- `mediaNamingRadarr.ts` and `mediaNamingSonarr.ts` each import only their own generated naming resource.
- `mediaNaming.ts` dispatches by `ArrType` without importing generated API contracts. Its inferred return
  type preserves the app mappers' generated resource types.
- `configMerge.ts` imports the dispatcher directly. The mixed-contract `configMediaNaming.ts` is removed.
- Focused tests cover Radarr mapping, Sonarr mapping, unknown names, missing TRaSH data, and dispatch.
