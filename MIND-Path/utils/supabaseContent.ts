// utils/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_CONTENT_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_CONTENT_ANON_KEY;

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
  tags?: string | string[] | null;
  symptom_tags?: string | string[] | null;
  short_desc?: string | null;
};

export type SynonymRow = {
  key: string;
  variants: string[] | null;
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

export async function searchResourcesFuzzy(q: string) {
  const { data, error } = await supabase.rpc("search_resources_fuzzy", {
    q,
    limit_count: 50,
    min_sim: 0.15,
  });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    type: r.type ?? "Resource",
    org: r.org ?? null,
    url: r.url ?? "",
    similarity: r.similarity,
  }));
}

// fetch synonym map from symptom_synonyms table
export const fetchSymptomSynonyms = async (): Promise<Record<string, string[]>> => {
  const { data, error } = await supabase
    .from("symptom_synonyms")
    .select("key, variants");

  if (error) throw error;

  const map: Record<string, string[]> = {};
  (data ?? []).forEach((row: SynonymRow) => {
    if (!row?.key) return;
    const key = row.key.toLowerCase().trim();
    const variants = (row.variants ?? []).map(v => v.toLowerCase().trim()).filter(Boolean);
    map[key] = Array.from(new Set([key, ...variants]));
  });
  return map;
};

export async function fetchResourcesByIds(
  ids: readonly (string | number)[]
): Promise<Resource[]> {
  const uniqueIds = Array.from(
    new Set(
      ids
        .map(id => {
          if (typeof id === "string") return id.trim();
          if (typeof id === "number") return Number.isFinite(id) ? String(id) : "";
          return "";
        })
        .filter((id): id is string => id.length > 0)
    )
  );

  if (uniqueIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("resources")
    .select("id,title,type,org,url")
    .in("id", uniqueIds);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    title: row.title ?? "",
    type: row.type ?? "",
    org: row.org ?? null,
    url: row.url ?? "",
  }));
}

export async function fetchResourcesForFuzzy(limit = 500): Promise<Resource[]> {
  // Try to fetch extended columns; fallback if some columns are missing.
  const fullColumns = "id,title,type,org,url,tags,symptom_tags,short_desc";
  const minimalColumns = "id,title,type,org,url,short_desc";

  const runSelect = (cols: string) =>
    supabase.from("resources").select(cols).limit(limit);

  let { data, error } = await runSelect(fullColumns);
  if (error && /column .* does not exist/i.test(error.message)) {
    ({ data, error } = await runSelect(minimalColumns));
  }
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    title: row.title ?? "",
    type: row.type ?? "",
    org: row.org ?? null,
    url: row.url ?? "",
    tags: row.tags ?? null,
    symptom_tags: row.symptom_tags ?? null,
    short_desc: row.short_desc ?? null,
  }));
}


export async function pingSupabase(): Promise<"ok"> {
  const { data, error } = await supabase.from("resources").select("id").limit(1);
  if (error) throw error;
  return "ok";
}

export default {
  supabase,
  searchResourcesBySymptom,
  searchResourcesFuzzy,
  fetchSymptomSynonyms,
  fetchResourcesByIds,
  fetchResourcesForFuzzy,
  pingSupabase,
};
