/** Mapping payload → generated *arr resource at the HTTP boundary. */
export function asGenerated<T>(payload: unknown): T {
  return payload as T;
}
