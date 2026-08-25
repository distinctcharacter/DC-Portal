type LegacyQueryResult<T = unknown> = Promise<{
  data: T[];
  error: null;
}>;

function emptyLegacyResult<T = unknown>(): LegacyQueryResult<T> {
  return Promise.resolve({ data: [], error: null });
}

function legacyQueryBuilder<T = unknown>() {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => Promise.resolve({ data: null as T | null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null as T | null, error: null }),
    then: emptyLegacyResult<T>().then.bind(emptyLegacyResult<T>())
  };

  return builder;
}

export const supabase = {
  from: () => legacyQueryBuilder(),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null })
  }
};

export function legacyDatabaseClientUnavailable() {
  throw new Error("Legacy database client has been replaced by server-side Neon functions.");
}
