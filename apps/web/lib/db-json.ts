/** node-pg returns decoded JSONB; the psql adapter returns JSON text. */
export function readJsonColumn<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}
