import { useLiveQuery } from "dexie-react-hooks";

/**
 * Thin wrapper around `useLiveQuery` that always returns a non-undefined value
 * by substituting the provided default while the query is loading.
 */
export function useLive<T>(query: () => Promise<T> | T, deps: unknown[], def: T): T {
  const v = useLiveQuery(query, deps as []);
  return (v as T | undefined) ?? def;
}
