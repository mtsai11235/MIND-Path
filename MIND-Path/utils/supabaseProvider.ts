// utils/supabaseProvider.ts
import { createClient } from "@supabase/supabase-js";

/* =========================================================
 * Provider-side Supabase client (aside of Content)
 * =======================================================*/
const providerUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const providerAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!providerUrl || !providerAnon) {
  const msg =
    "Missing Provider Supabase ENV. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then run `npx expo start -c`.";
  console.error(msg, {
    providerUrl,
    providerAnonPresent: !!providerAnon,
  });
  throw new Error(msg);
}
if (!/^https:\/\//i.test(providerUrl)) {
  throw new Error(`Supabase URL must start with https:// (got: ${providerUrl})`);
}

export const supabaseProvider = createClient(providerUrl, providerAnon, {
  auth: { persistSession: false },
});

/* =========================================================
 * Types
 * =======================================================*/

export type ProviderRow = {
  provider_id: number;
  npi: string | null;
  basic_name: string | null;
  enumeration_type: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;

  // keep taxonomy_desc if
  taxonomy_desc: string | null;

  // NEW: single string (comma-joined specialties)
  specialty: string | null;

  updated_at: string | null;
  /** present only when coming from nearby_providers */
  distance_m?: number | null;
};

export type ProviderAddress = {
  provider_id: number;
  address_type: string | null;
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
};

export type SearchProvidersResult = {
  rows: ProviderRow[];
  total: number;
};

export type GeoOptions = {
  /** enable distance-sorted results */
  sortByDistance?: boolean;
  /** GPS reference point (preferred if available) */
  refLat?: number;
  refLng?: number;
  /** ZIP fallback when user denies location */
  zip?: string;
  /** search radius in meters (defaults to ~25 miles) */
  radiusMeters?: number;
};

export type SearchProvidersParams = {
  q?: string;          // matches basic_name
  city?: string;       // e.g., 'BOSTON'
  state?: string;      // e.g., 'MA'
  specialty?: string;  // NEW: fuzzy match on specialty text
  limit?: number;      // page size
  offset?: number;     // page offset
} & GeoOptions;

export type NearbyRow = {
  provider_id: number;
  basic_name: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  distance_m: number | null;
  specialty: string | null;    // NEW
};

type PointRow = { lat: number | null; lng: number | null };

/* =========================================================
 * Helpers
 * =======================================================*/

/**
 * ZIP -> centroid
 * 1) Try server RPC `zip_centroid(p_zip)` (single record).
 * 2) Fallback to `geocode_cache` with addr_key ", , , <ZIP>, USA" (uppercased).
 */
async function getZipCentroid(zip: string): Promise<{ lat: number; lng: number } | null> {
  const z = (zip || '').trim();
  if (!z) return null;

  try {
    const { data, error } = await supabaseProvider
      .rpc('zip_centroid', { p_zip: z })
      .single<PointRow>();
    if (error && (error as any).code !== 'PGRST116') throw error;
    if (data && data.lat != null && data.lng != null) return { lat: data.lat, lng: data.lng };
  } catch (e: any) {
    if (e?.code && e.code !== 'PGRST116') throw e;
  }

  const addr_key = ['', '', '', z, 'USA'].join(', ').toUpperCase();
  const { data, error } = await supabaseProvider
    .from('geocode_cache')
    .select('lat,lng')
    .eq('addr_key', addr_key)
    .maybeSingle<PointRow>();
  if (error) throw error;
  if (data?.lat != null && data?.lng != null) return { lat: data.lat, lng: data.lng };

  return null;
}

/** City+State -> centroid via RPC `city_state_centroid(p_city, p_state)` (single record). */
async function getCityStateCentroid(
  city?: string,
  state?: string
): Promise<{ lat: number; lng: number } | null> {
  const c = (city || '').trim();
  const s = (state || '').trim();
  if (!c || !s) return null;

  try {
    const { data, error } = await supabaseProvider
      .rpc('city_state_centroid', { p_city: c, p_state: s })
      .single<PointRow>();
    if (error && (error as any).code !== 'PGRST116') throw error;
    if (data && data.lat != null && data.lng != null) return { lat: data.lat, lng: data.lng };
  } catch (e: any) {
    if (e?.code && e.code !== 'PGRST116') throw e;
  }
  return null;
}

/* =========================================================
 * Data APIs
 * =======================================================*/

/** Non-distance, paginated provider search (DB paging + exact count). */
export async function searchProvidersPaged(
  params: Omit<SearchProvidersParams, keyof GeoOptions>
): Promise<SearchProvidersResult> {
  const state     = params.state?.trim().toUpperCase();
  const city      = params.city?.trim().toUpperCase();
  const q         = params.q?.trim();
  const specialty = params.specialty?.trim();

  const limit  = Math.max(1, Math.min(100, params.limit ?? 20));
  const offset = Math.max(0, params.offset ?? 0);

  // 1) First try normal substring (ilike) search on the view
  let query = supabaseProvider
    .from("provider_search_mh_view")
    .select("*", { count: "exact" });

  if (state)     query = query.eq("state", state);
  if (city)      query = query.eq("city", city);
  if (q)         query = query.ilike("basic_name", `%${q}%`);
  if (specialty) query = query.ilike("specialty", `%${specialty}%`);

  const { data, error, count } = await query
    .order("basic_name",  { ascending: true, nullsFirst: true })
    .order("city",        { ascending: true, nullsFirst: true })
    .order("state",       { ascending: true, nullsFirst: true })
    .order("provider_id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const exactTotal = count ?? 0;
  const exactRows  = (data ?? []) as ProviderRow[];

  // 2) If we have results OR user didn't type any name/specialty,
  //    just return the exact search results (keeps pagination & count).
  if (exactTotal > 0 || (!q && !specialty)) {
    return { rows: exactRows, total: exactTotal };
  }

  // 3) Fallback: use fuzzy RPC when exact search returns 0 results
  //    We pull (limit + offset) rows from DB, then slice on client
  const rpcLimit = Math.min(500, limit + offset); // safety cap

  const { data: fuzzyData, error: fuzzyError } = await supabaseProvider
    .rpc("search_providers_mh", {
      p_state:     state || null,
      p_city:      city  || null,
      p_name:      q     || null,
      p_specialty: specialty || null,
      p_limit:     rpcLimit,
    })
    .returns<(ProviderRow & { score: number | null })[]>();

  if (fuzzyError) throw fuzzyError;

  const allFuzzy = (fuzzyData ?? []) as (ProviderRow & { score: number | null })[];
  const totalFuzzy = allFuzzy.length;

  // do paging client-side
  const page = allFuzzy.slice(offset, offset + limit);

  return {
    rows: page,
    total: totalFuzzy, // we only know total within rpcLimit window
  };
}

/** RPC wrapper: distance-sorted candidates around (lat,lng). */
export async function fetchNearbyProviders(
  lat: number,
  lng: number,
  radiusMeters = 16093 // 10 miles
): Promise<NearbyRow[]> {
  const { data, error } = await supabaseProvider
    .rpc('nearby_providers', { p_lat: lat, p_lng: lng, p_radius_m: radiusMeters })
    .returns<NearbyRow[]>();
  if (error) throw error;
  return (data ?? []) as NearbyRow[];
}

export async function fetchProviderAddress(providerId: number): Promise<ProviderAddress | null> {
  if (!Number.isFinite(providerId)) return null;
  const { data, error } = await supabaseProvider
    .from("provider_address")
    .select("provider_id,address_type,address_1,address_2,city,state,postal_code")
    .eq("provider_id", providerId);
  if (error) throw error;
  const rows = (data ?? []) as ProviderAddress[];
  if (!rows.length) return null;
  const practice = rows.find(row => (row.address_type ?? "").toLowerCase() === "practice");
  return practice ?? rows[0];
}

/* =========================================================
 * Geo-aware search (GPS → ZIP → City/State)
 * =======================================================*/

export async function searchProvidersPagedGeoAware(
  params: SearchProvidersParams
): Promise<SearchProvidersResult> {
  const limit  = Math.max(1, Math.min(100, params.limit ?? 20));
  const offset = Math.max(0, params.offset ?? 0);

  const state     = params.state?.trim().toUpperCase();
  const city      = params.city?.trim().toUpperCase();
  const q         = params.q?.trim();
  const specialty = params.specialty?.trim();
  const radius    = params.radiusMeters ?? 40234; // ~25 miles

  // If distance sort is OFF, just use the normal paged search
  if (!params.sortByDistance) {
    return searchProvidersPaged({ q, city, state, specialty, limit, offset });
  }

  // ---------- 1) Resolve geo origin: GPS → ZIP → City/State ----------
  let ref: { lat: number; lng: number } | null = null;

  // GPS (preferred)
  if (typeof params.refLat === "number" && typeof params.refLng === "number") {
    ref = { lat: params.refLat, lng: params.refLng };
  }

  // ZIP fallback
  if (!ref && params.zip) {
    ref = await getZipCentroid(params.zip);
  }

  // City+State fallback
  if (!ref && city && state) {
    ref = await getCityStateCentroid(city, state);
  }

  // If we still have no geo reference, fall back to non-distance search
  if (!ref) {
    return searchProvidersPaged({ q, city, state, specialty, limit, offset });
  }

  // ---------- 2) Distance-sorted candidates around (lat, lng) ----------
  const allNearby = await fetchNearbyProviders(ref.lat, ref.lng, radius);

  // Basic filters (state, name). We purposely do NOT apply specialty yet.
  let baseFiltered = allNearby as (NearbyRow & Partial<ProviderRow>)[];

  if (state) {
    baseFiltered = baseFiltered.filter(
      (r) => (r.state ?? "").toUpperCase() === state
    );
  }

  if (q) {
    const upperQ = q.toUpperCase();
    baseFiltered = baseFiltered.filter((r) =>
      (r.basic_name ?? "").toUpperCase().includes(upperQ)
    );
  }

  // ---------- 3) Apply specialty filter with fallback ----------
  let filteredWithSpecialty = baseFiltered;

  if (specialty) {
    const upperSpec = specialty.toUpperCase();
    filteredWithSpecialty = baseFiltered.filter((r) =>
      (r.specialty ?? "").toUpperCase().includes(upperSpec)
    );
  }

  // If user gave a specialty but none of the nearby providers match it,
  // fall back to the regular (non-distance) search using the same filters.
  // This avoids "0 results" when we know the state may still have matches.
  if (specialty && filteredWithSpecialty.length === 0) {
    console.log(
      "[GeoAware] No nearby providers match specialty; falling back to non-distance search."
    );
    return searchProvidersPaged({ q, city, state, specialty, limit, offset });
  }

  const effective = specialty ? filteredWithSpecialty : baseFiltered;
  const total = effective.length;
  const page  = effective.slice(offset, offset + limit);

  // ---------- 4) Normalize shape to ProviderRow ----------
  const rows: ProviderRow[] = page.map((r) => ({
    provider_id: r.provider_id,
    npi: null,
    basic_name: r.basic_name ?? null,
    enumeration_type: null,
    city: r.city ?? null,
    state: r.state ?? null,
    phone: r.phone ?? null,
    taxonomy_desc: null,
    specialty: r.specialty ?? null,
    updated_at: null,
    distance_m:
      typeof r.distance_m === "number" ? r.distance_m : null,
  }));

  return { rows, total };
}

//Used for embedding search
export type MatchedSpecialty = {
  code: string;
  label: string;
  similarity: number;
};

export async function semanticSpecialty(query: string): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    const baseUrl = providerUrl!.replace(/\/$/, "");
    const fnUrl = `${baseUrl}/functions/v1/mh_semantic_specialty`;

    const resp = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Supabase Edge Functions require an apikey header
        apikey: providerAnon as string,
        Authorization: `Bearer ${providerAnon}`,
      },
      body: JSON.stringify({ query: trimmed }),
    });

    if (!resp.ok) {
      console.warn("semanticSpecialty: non-OK response", resp.status);
      return null;
    }

    const json = (await resp.json()) as { specialties?: MatchedSpecialty[] };
    const top = json.specialties?.[0];
    if (!top) return null;

    return top.label;
  } catch (e) {
    console.warn("semanticSpecialty fetch error", e);
    return null;
  }
}

/* =========================================================
 * Saved provider helpers
 * =======================================================*/

export async function fetchProvidersByIds(
  ids: readonly number[]
): Promise<ProviderRow[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Number.isFinite)));

  if (uniqueIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseProvider
    .from("provider_search_mh_view")
    .select("*")
    .in("provider_id", uniqueIds)
    .order("provider_id", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ProviderRow[];
}
