import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const _client = createClient<Database>(supabaseUrl, supabaseAnonKey);
export const supabase = _client as typeof _client & {
  schema: (name: "erp_corp" | "public") => ReturnType<typeof _client.from>;
};
export const SCHEMA_ERP = "erp_corp" as const;
