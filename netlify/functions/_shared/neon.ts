import { neon } from "@neondatabase/serverless";

type SqlRows = Record<string, any>[];
type SqlClient = {
  (strings: TemplateStringsArray, ...params: any[]): Promise<SqlRows>;
  query(queryWithPlaceholders: string, params?: any[]): Promise<SqlRows>;
};

let cachedSql: SqlClient | null = null;

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }

  if (!cachedSql) {
    cachedSql = neon(databaseUrl) as SqlClient;
  }

  return cachedSql;
}

export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}
