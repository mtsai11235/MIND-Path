// utils/db.ts
import { supabase } from './supabase';

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

  // keep taxonomy_desc if你还想展示旧的职业/资质描述
  taxonomy_desc: string | null;

  // NEW: single string (comma-joined specialties)
  specialty: string | null;

  updated_at: string | null;
  /** present only when coming from nearby_providers */
  distance_m?: number | null;
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
    const { data, error } = await supabase
      .rpc('zip_centroid', { p_zip: z })
      .single<PointRow>();
    if (error && (error as any).code !== 'PGRST116') throw error;
    if (data && data.lat != null && data.lng != null) return { lat: data.lat, lng: data.lng };
  } catch (e: any) {
    if (e?.code && e.code !== 'PGRST116') throw e;
  }

  const addr_key = ['', '', '', z, 'USA'].join(', ').toUpperCase();
  const { data, error } = await supabase
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
    const { data, error } = await supabase
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

  let query = supabase
    .from('provider_search_mh_view')
    .select('*', { count: 'exact' });

  if (state)     query = query.eq('state', state);
  if (city)      query = query.eq('city', city);
  if (q)         query = query.ilike('basic_name', `%${q}%`);
  if (specialty) query = query.ilike('specialty', `%${specialty}%`);

  const limit  = Math.max(1, Math.min(100, params.limit ?? 20));
  const offset = Math.max(0, params.offset ?? 0);

  const { data, error, count } = await query
    .order('basic_name', { ascending: true, nullsFirst: true })
    .order('city',       { ascending: true, nullsFirst: true })
    .order('state',      { ascending: true, nullsFirst: true })
    .order('provider_id',{ ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { rows: (data ?? []) as ProviderRow[], total: count ?? 0 };
}

/** RPC wrapper: distance-sorted candidates around (lat,lng). */
export async function fetchNearbyProviders(
  lat: number,
  lng: number,
  radiusMeters = 16093 // 10 miles
): Promise<NearbyRow[]> {
  const { data, error } = await supabase
    .rpc('nearby_providers', { p_lat: lat, p_lng: lng, p_radius_m: radiusMeters })
    .returns<NearbyRow[]>();
  if (error) throw error;
  return (data ?? []) as NearbyRow[];
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

  // non-distance path
  if (!params.sortByDistance) {
    return searchProvidersPaged({ q, city, state, specialty, limit, offset });
  }

  // resolve origin: GPS → ZIP → City/State
  let ref: { lat: number; lng: number } | null = null;
  if (typeof params.refLat === 'number' && typeof params.refLng === 'number') {
    ref = { lat: params.refLat, lng: params.refLng };
  }
  if (!ref && params.zip) {
    ref = await getZipCentroid(params.zip);
  }
  if (!ref && city && state) {
    ref = await getCityStateCentroid(city, state);
  }
  if (!ref) {
    return searchProvidersPaged({ q, city, state, specialty, limit, offset });
  }

  // distance-sorted candidates (do not push city/state to RPC)
  const allNearby = await fetchNearbyProviders(ref.lat, ref.lng, radius);

  // client-side filters
  let filtered = allNearby as (NearbyRow & Partial<ProviderRow>)[];
  if (state)     filtered = filtered.filter(r => (r.state ?? '').toUpperCase() === state);
  if (q)         filtered = filtered.filter(r => (r.basic_name ?? '').toUpperCase().includes(q.toUpperCase()));
  if (specialty) filtered = filtered.filter(r => (r.specialty ?? '').toUpperCase().includes(specialty.toUpperCase()));

  const total = filtered.length;
  const page  = filtered.slice(offset, offset + limit);

  // normalize
  const rows: ProviderRow[] = page.map(r => ({
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
    distance_m: typeof r.distance_m === 'number' ? r.distance_m : null,
  }));

  return { rows, total };
}