declare module "@supabase/supabase-js" {
  export type User = {
    id: string;
    email?: string | null;
    email_confirmed_at?: string | null;
  };

  export type SupabaseClient<
    Database = any,
    SchemaName extends string = string,
    Schema = any
  > = {
    from: (table: string) => any;
    auth: any;
  };
}
