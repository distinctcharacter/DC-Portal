export function legacyDatabaseClientUnavailable() {
  throw new Error("Legacy database client has been replaced by server-side Neon functions.");
}
