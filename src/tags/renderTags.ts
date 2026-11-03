/**
 * Dry-run tag stand-ins must not be printed as synthetic ids: listing the tag by label
 * keeps the report honest. Resolved ids first, then pending labels.
 */
export function renderTags(ids: number[], placeholderLabels?: Map<number, string>): Array<number | string> {
  if (placeholderLabels === undefined) {
    return ids;
  }
  const resolved = ids.filter((id) => !placeholderLabels.has(id));
  const pending = ids.filter((id) => placeholderLabels.has(id)).map((id) => placeholderLabels.get(id) as string);
  return [...resolved, ...pending];
}
