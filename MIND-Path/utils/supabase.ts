// utils/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// —— check env —— //
if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    "Missing Supabase ENV. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart 'expo start -c'.";
  console.error(msg, { supabaseUrl, supabaseAnonKeyPresent: !!supabaseAnonKey });
  throw new Error(msg);
}
if (!/^https:\/\//i.test(supabaseUrl)) {
  throw new Error(`Supabase URL must start with https:// (got: ${supabaseUrl})`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export type Resource = {
  id: string;
  title: string;
  type: string;
  org?: string | null;
  url: string;
};

// RPC
export async function searchResourcesBySymptom(q: string): Promise<Resource[]> {
  const { data, error } = await supabase.rpc("search_resources_by_symptom", { q });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    org: r.org,
    url: r.url,
  }));
}


export async function pingSupabase(): Promise<"ok"> {
  const { data, error } = await supabase.from("resources").select("id").limit(1);
  if (error) throw error;
  return "ok";
}
