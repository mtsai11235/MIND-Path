import { supabase } from './supabase';

/**
 * 1) Fetch professional resources (providers/clinics).
 */
export async function listProviders({
  city,
  state,
  limit = 10,
}: { city?: string; state?: string; limit?: number }) {
  let query = supabase
    .from('provider')
    .select('id, name, city, state, telehealth, accepts_insurance, description')
    .limit(limit);

  if (city) query = query.eq('city', city);
  if (state) query = query.eq('state', state);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * 2) Fetch educational resources (articles/videos).
 */
export async function listEduResources({
  q,
  limit = 10,
}: { q?: string; limit?: number }) {
  let query = supabase
    .from('edu_resource')
    .select('id, title, kind, source_name, source_url, tags')
    .limit(limit);

  if (q) {
    // Full-text search against a tsvector column
    query = query.textSearch('search_tsv', q, { type: 'plain' });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export type ProviderRow = {
  provider_id: number;
  npi: string | null;
  basic_name: string | null;
  enumeration_type: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  taxonomy_code: string | null;
  taxonomy_desc: string | null;
  updated_at: string | null;
};

export type SearchProvidersParams = {
  q?: string;         // Name keyword (matches basic_name)
  city?: string;      // City (e.g., 'BOSTON')
  state?: string;     // State (e.g., 'MA')
  taxonomy?: string;  // Taxonomy description keyword (matches taxonomy_desc)
  limit?: number;     // Page size
  offset?: number;    // Offset for pagination
};

export type SearchProvidersResult = {
  rows: ProviderRow[];
  total: number; // Total number of matches (exact)
};

/**
 * Paginated provider search returning both rows and total.
 */
export async function searchProvidersPaged(
  params: SearchProvidersParams
): Promise<SearchProvidersResult> {
  let query = supabase
    .from('provider_search_mh_view')
    // count: 'exact' instructs Supabase to return an exact total row count
    .select('*', { count: 'exact' });

  if (params.state)    query = query.eq('state', params.state.toUpperCase());
  if (params.city)     query = query.eq('city', params.city.toUpperCase());
  if (params.q)        query = query.ilike('basic_name', `%${params.q}%`);
  if (params.taxonomy) query = query.ilike('taxonomy_desc', `%${params.taxonomy}%`);

  const limit  = params.limit  ?? 20;
  const offset = params.offset ?? 0;

  const { data, error, count } = await query
    .order('basic_name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { rows: (data ?? []) as ProviderRow[], total: count ?? 0 };
}