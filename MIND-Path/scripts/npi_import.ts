// scripts/npi_import.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ========= Supabase Admin Client (using service_role) =========
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const NPI_BASE = 'https://npiregistry.cms.hhs.gov/api/';

// ========= Row Types =========
type TaxonomyRow = {
  provider_id: number;
  code: string | null;
  description: string | null;
  primary_taxonomy: boolean;
  state: string; // not null, default ''
  license: string | null;
};

type IdentifierRow = {
  provider_id: number;
  identifier: string | null;
  code: string | null;
  description: string | null;
  state: string; // not null, default ''
  issuer: string | null;
};

type AddressRow = {
  provider_id: number;
  address_type: 'practice' | 'mailing';
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country_code: string | null;
  phone: string | null;
  fax: string | null;
};

// ========= Utilities =========
function mapAddressType(purpose?: string): 'practice' | 'mailing' | undefined {
  if (!purpose) return undefined;
  const p = purpose.toUpperCase();
  if (p === 'LOCATION' || p === 'PRACTICE') return 'practice';
  if (p === 'MAILING') return 'mailing';
  return undefined;
}
function normUpper(s?: string | null): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  return t ? t.toUpperCase() : null;
}
function normText(s?: string | null): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  return t || null;
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function fullName(basic: any): string | null {
  const org = (basic?.organization_name ?? '').trim();
  if (org) return org;
  const name = [basic?.first_name, basic?.middle_name, basic?.last_name].filter(Boolean).join(' ').trim();
  return name || null;
}

// ========= Fetch NPI data (by city+state or by ZIP) =========
async function fetchNpi(city?: string, state?: string, postalCode?: string, limit = 200) {
  const results: any[] = [];
  const seen = new Set<string>();

  let skip = 0, pages = 0;
  const MAX_PAGES = Number(process.env.NPI_MAX_PAGES ?? 200);
  const MAX_EMPTY = 5;
  let emptyStreak = 0;

  async function fetchWithTimeout(url: URL, timeoutMs = 20000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res: any = await fetch(url as any, {
        signal: ctrl.signal as any,
        headers: { 'User-Agent': 'mindpath-import/1.0' } as any,
      } as any);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} - ${text.slice(0, 200)}`);
      return JSON.parse(text) as any;
    } finally { clearTimeout(timer); }
  }

  while (true) {
    const url = new URL(NPI_BASE);
    url.searchParams.set('version', '2.1');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('skip', String(skip));
    url.searchParams.set('address_purpose', 'LOCATION'); // only pull practice/visit addresses
    url.searchParams.set('country_code', 'US');
    if (postalCode) url.searchParams.set('postal_code', postalCode);
    else {
      if (city) url.searchParams.set('city', city);
      if (state) url.searchParams.set('state', state);
    }

    console.log('→ requesting:', url.toString());
    const json: any = await fetchWithTimeout(url);
    const page: any[] = json?.results ?? [];
    console.log('← got page:', { skip, count: page.length });

    const before = results.length;
    for (const r of page) {
      const npi = String(r.number ?? '');
      if (!npi || seen.has(npi)) continue;
      seen.add(npi);
      results.push(r);
    }
    const added = results.length - before;
    emptyStreak = added === 0 ? emptyStreak + 1 : 0;

    if (page.length < limit) { console.log('↘ last page (count < limit)'); break; }
    pages++;
    if (emptyStreak >= MAX_EMPTY) { console.warn(`↘ no new uniques for ${MAX_EMPTY} pages, early stop`); break; }
    if (pages >= MAX_PAGES) { console.warn(`⚠️ Reached MAX_PAGES=${MAX_PAGES}, stopping early.`); break; }
    skip += limit;
    await sleep(200); // throttle between requests
  }

  return results;
}

// ========= Bulk import =========
async function importBatch(results: any[]) {
  // 1) Bulk upsert into providers; return id <-> npi mapping
  const providers = results.map(r => ({
    npi: String(r.number ?? '').trim(),
    enumeration_type: r.enumeration_type ?? null,
    basic_name: fullName(r.basic) ?? null,
    credential: r.basic?.credential ?? null,
    gender: r.basic?.gender ?? null,
    status: r.basic?.status ?? null,
    sole_proprietor: r.basic?.sole_proprietor ?? null,
    updated_at: new Date().toISOString(),
  })).filter(p => p.npi);

  const providerIdMap = new Map<string, number>();
  for (const group of chunk(providers, 200)) {
    const { data, error } = await admin
      .from('provider_npi')
      .upsert(group, { onConflict: 'npi' })   // idempotent
      .select('id,npi');                      // build mapping
    if (error) throw error;
    for (const row of data ?? []) providerIdMap.set(row.npi, row.id);
  }

  // 2) Flatten address / taxonomy / identifier arrays
  const addrRows: AddressRow[] = [];
  const taxRows: TaxonomyRow[] = [];
  const idRows : IdentifierRow[] = [];

  for (const r of results) {
    const npi = String(r.number ?? '').trim();
    const provider_id = providerIdMap.get(npi);
    if (!provider_id) continue;

    // addresses
    const addrs = Array.isArray(r.addresses) ? r.addresses : [];
    for (const a of addrs) {
      const address_type = mapAddressType(a.address_purpose);
      const row: AddressRow = {
        provider_id,
        address_type: address_type as 'practice' | 'mailing',
        address_1: normText(a.address_1),
        address_2: normText(a.address_2),
        city: normUpper(a.city),
        state: normUpper(a.state),
        postal_code: normText(a.postal_code),
        country_code: normText(a.country_code),
        phone: normText(a.telephone_number),
        fax: normText(a.fax_number),
      };
      if (row.address_type && row.address_1 && row.city && row.state) {
        addrRows.push(row);
      }
    }

    // taxonomies
    const taxes = Array.isArray(r.taxonomies) ? r.taxonomies : [];
    for (const t of taxes) {
      if (!t.code) continue;
      taxRows.push({
        provider_id,
        code: t.code ?? null,
        description: t.desc ?? null,
        primary_taxonomy: Boolean(t.primary),
        state: t.state ?? '',
        license: t.license ?? null,
      });
    }

    // identifiers
    const ids = Array.isArray(r.identifiers) ? r.identifiers : [];
    for (const i of ids) {
      if (!i.identifier) continue;
      idRows.push({
        provider_id,
        identifier: i.identifier ?? null,
        code: i.code ?? null,
        description: i.desc ?? null,
        state: i.state ?? '',
        issuer: i.issuer ?? null,
      });
    }
  }

  // 3) De-duplicate before upsert (keys aligned with onConflict)
  const uniqueAddrs = Array.from(new Map(
    addrRows.map(r => [
      `${r.provider_id}-${r.address_type}-${r.address_1}-${r.city}-${r.state}-${r.postal_code}`, r
    ])
  ).values());

  const uniqueTaxes = Array.from(new Map(
    taxRows.map(r => [`${r.provider_id}-${r.code}-${r.state}`, r])
  ).values());

  const uniqueIds = Array.from(new Map(
    idRows.map(r => [`${r.provider_id}-${r.identifier}-${r.state}`, r])
  ).values());

  // 4) Bulk upsert child tables (minimal return)
  for (const g of chunk(uniqueAddrs, 1000)) {
    const { error } = await admin
      .from('provider_address')
      .upsert(g, {
        onConflict: 'provider_id,address_type,address_1,city,state,postal_code',
        ignoreDuplicates: true,
      });
    if (error) throw error;
  }

  for (const g of chunk(uniqueTaxes, 2000)) {
    const { error } = await admin
      .from('provider_taxonomy')
      .upsert(g, { onConflict: 'provider_id,code,state' });
    if (error) throw error;
  }

  for (const g of chunk(uniqueIds, 2000)) {
    const { error } = await admin
      .from('provider_identifier')
      .upsert(g, { onConflict: 'provider_id,identifier,state' });
    if (error) throw error;
  }
}

// ========= Main entry (batched for speed) =========
async function main() {
  // Usage:
  //   npx ts-node --esm scripts/npi_import.ts "Boston" "MA"
  //   npx ts-node --esm scripts/npi_import.ts "" "" "02124"   ← import by ZIP code
  const city = process.argv[2] || 'Boston';
  const state = process.argv[3] || 'MA';
  const postalCode = process.argv[4]; // if provided, ZIP takes precedence
  console.log(`Importing NPI for ${postalCode ? `ZIP ${postalCode}` : `${city}, ${state}`} ...`);

  const results = await fetchNpi(city, state, postalCode);
  console.log(`Fetched ${results.length} unique NPI results.`);

  let done = 0;
  for (const group of chunk(results, 200)) {
    await importBatch(group);
    done += group.length;
    console.log(`✓ imported ${done}/${results.length}`);
    await sleep(150); // throttle between batches; tune as needed
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});