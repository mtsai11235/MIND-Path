// app/(tabs)/resources.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Linking,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter,useLocalSearchParams } from "expo-router";
import {
  searchProvidersPagedGeoAware,
  type ProviderRow,
} from '@/utils/supabaseProvider';
import { useAuth } from "@/context/AuthContext";

const PAGE_SIZE = 20;

/** ---------- Green theme ---------- */
const G_BG       = '#F5FAF7';
const G_CARD     = '#FFFFFF';
const G_BORDER   = 'rgba(16,82,60,0.12)';
const G_TEXT     = '#0F3D2E';
const G_MUTED    = '#6B7F75';
const G_PRIMARY  = '#2F6F4E';
const G_PRIMARY_WEAK = '#8DB7A4';
const G_LINK     = '#1E855F';
const G_BADGE_BG = '#E3F2EB';
const G_BADGE_TX = '#1F5C45';

export default function ResourcesTab() {
  const router = useRouter();
  const { isLoggedIn, profile, updateProfile } = useAuth();
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState('');
  const [specialty, setSpecialty] = useState(''); // ⬅️ replaced taxonomy
  const [city, setCity] = useState('BOSTON');
  const [state, setState] = useState('MA');

  // distance mode & location
  const [zip, setZip] = useState('');
  const [sortByDistance, setSortByDistance] = useState(false);
  const [refPoint, setRefPoint] = useState<{ lat: number; lng: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [savingProviderId, setSavingProviderId] = useState<number | null>(null);
  const [removingProviderId, setRemovingProviderId] = useState<number | null>(null);

  const canLoadMore = rows.length < total;

  // code snippet to receive params from chat page
  // receive specialty from chat page
  const { specialty : prefillSpecialty } = useLocalSearchParams();

  // pre-fill specialty on providers page onced pushed from chat page
  useEffect(() => {
    if (prefillSpecialty) {
      const specialty = Array.isArray(prefillSpecialty) ? prefillSpecialty[0] : prefillSpecialty;
      setSpecialty(specialty);
    }
  }, [prefillSpecialty])

  const savedClinicIds = useMemo(
    () =>
      new Set(
        (profile?.clinicIds ?? [])
          .map(id => String(id).trim())
          .filter(id => id.length > 0)
      ),
    [profile?.clinicIds]
  );

  // --- dedupe: same provider + same phone => one entry
  function dedupe(input: ProviderRow[]) {
    const m = new Map<string, ProviderRow>();
    for (const r of input) {
      const key = `${r.provider_id ?? 'nil'}|${r.phone ?? ''}`;
      if (!m.has(key)) m.set(key, r);
    }
    return [...m.values()];
  }

  // GPS permission (only when distance mode is ON)
  const askGPSIfNeeded = async (): Promise<{ lat: number; lng: number } | null> => {
    if (!sortByDistance) return null;
    if (refPoint) return refPoint;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setRefPoint(point);
    return point;
  };

  const handleToggleProvider = async (provider: ProviderRow) => {
    const providerId =
      typeof provider.provider_id === "number" ? provider.provider_id : null;
    if (!providerId) {
      return;
    }

    const providerIdStr = providerId.toString();

    if (!isLoggedIn) {
      router.push("/(tabs)/login");
      return;
    }

    const isSaved = savedClinicIds.has(providerIdStr);
    if (isSaved) {
      if (removingProviderId === providerId) {
        return;
      }

      setRemovingProviderId(providerId);
      try {
        const current = (profile?.clinicIds ?? []).map(id => id.toString());
        const next = current.filter(id => id.trim() !== providerIdStr);
        await updateProfile({ clinicIds: next });
      } catch (error) {
        console.warn("Failed to remove provider", error);
      } finally {
        setRemovingProviderId(prev => (prev === providerId ? null : prev));
      }
      return;
    }

    if (savingProviderId === providerId) {
      return;
    }

    setSavingProviderId(providerId);
    try {
      const current = (profile?.clinicIds ?? []).map(id => id.toString());
      const next = Array.from(new Set([...current, providerIdStr]));
      await updateProfile({ clinicIds: next });
    } catch (error) {
      console.warn("Failed to save provider", error);
    } finally {
      setSavingProviderId(prev => (prev === providerId ? null : prev));
    }
  };

  async function load(reset = true) {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const gps = await askGPSIfNeeded(); // may be null if denied

      if (sortByDistance && !gps && !zip.trim()) {
        Alert.alert(
          'Location needed',
          'Enable location or enter a ZIP code to sort by distance.'
        );
        // We still fall back to non-distance search to avoid an empty screen.
      }

      const { rows: newRows, total: newTotal } = await searchProvidersPagedGeoAware({
        q, specialty, city, state,               // ⬅️ specialty param
        limit: PAGE_SIZE,
        offset: reset ? 0 : offset,
        // distance options:
        sortByDistance,
        refLat: gps?.lat ?? undefined,
        refLng: gps?.lng ?? undefined,
        zip: gps ? undefined : (zip.trim() || undefined),
      });

      const finalRows = dedupe(newRows);
      if (reset) setRows(finalRows);
      else setRows((prev) => dedupe([...prev, ...finalRows]));
      setTotal(newTotal);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // initial load
  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamic origin text for result header
  const originText = useMemo(() => {
    if (sortByDistance) {
      if (zip.trim()) return `near ${zip.trim()}`;
      if (refPoint)    return 'near your location';
      return 'by distance';
    }
    const parts = [city?.trim(), state?.trim()].filter(Boolean).join(', ');
    return parts || 'all locations';
  }, [sortByDistance, zip, refPoint, city, state]);

  const distanceBadge = (r: ProviderRow) => {
    const d = (r as any).distance_m as number | undefined;
    if (typeof d !== 'number') return null;
    const miles = d / 1609.34;
    const txt = miles < 1
      ? `${Math.round(d)} m`
      : `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
    return <Text style={styles.badge}>{txt}</Text>;
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* Back to switch page */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Text
          onPress={() => router.push("/(tabs)/resources")}
          style={{ color: G_LINK, fontWeight: "700" }}
        >
          ← Back to Resources
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Search Providers</Text>
          <Text style={styles.subtitle}>Find clinics and professionals near you</Text>

          {/* Search form */}
          <View style={styles.searchCard}>
            <TextInput
              placeholder="State (e.g. MA)"
              value={state}
              onChangeText={(t) => setState(t.toUpperCase())}
              style={[
                styles.input,
                sortByDistance && styles.inputDisabled,
              ]}
              editable={!sortByDistance}
              placeholderTextColor={G_MUTED}
              autoCapitalize="characters"
            />
            <TextInput
              placeholder="City (e.g. BOSTON)"
              value={city}
              onChangeText={(t) => setCity(t.toUpperCase())}
              style={[
                styles.input,
                sortByDistance && styles.inputDisabled,
              ]}
              editable={!sortByDistance}
              placeholderTextColor={G_MUTED}
              autoCapitalize="characters"
            />
            <TextInput
              placeholder="Name contains (e.g. counseling)"
              value={q}
              onChangeText={setQ}
              style={styles.input}
              placeholderTextColor={G_MUTED}
            />
            <TextInput
              placeholder="Specialty contains (e.g. psychiatry, addiction)"
              value={specialty}
              onChangeText={setSpecialty}
              style={styles.input}
              placeholderTextColor={G_MUTED}
            />

            {/* Sort by distance toggle */}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Sort by distance</Text>
              <Switch
                value={sortByDistance}
                onValueChange={setSortByDistance}
                trackColor={{ false: '#C8DAD2', true: '#B7D5C9' }}
                thumbColor={sortByDistance ? '#0F6A49' : '#F2F6F4'}
              />
            </View>

            {/* ZIP fallback */}
            {sortByDistance && (
              <TextInput
                placeholder="ZIP (fallback if location denied)"
                value={zip}
                onChangeText={setZip}
                style={styles.input}
                placeholderTextColor={G_MUTED}
                keyboardType="number-pad"
                maxLength={10}
              />
            )}

            <TouchableOpacity
              onPress={() => load(true)}
              activeOpacity={0.9}
              style={[styles.button, (loading || loadingMore) && styles.buttonDisabled]}
              disabled={loading || loadingMore}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Result count */}
          <Text style={styles.resultCount}>
            {loading && rows.length === 0
              ? 'Searching...'
              : `Found ${total} ${total === 1 ? 'result' : 'results'} (${originText})`}
          </Text>

          {/* Results */}
          {rows.map(r => {
            const providerKey = `${r.provider_id}-${r.phone ?? ''}`;
            const providerIdStr =
              typeof r.provider_id === "number" && Number.isFinite(r.provider_id)
                ? r.provider_id.toString()
                : null;
            const isSaved = providerIdStr ? savedClinicIds.has(providerIdStr) : false;
            const isSaving = savingProviderId === r.provider_id;
            const isRemoving = removingProviderId === r.provider_id;
            const disableSave = !providerIdStr || isSaving || isRemoving;
            return (
              <View key={providerKey} style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.name}>{r.basic_name || '(no name)'}</Text>
                  {distanceBadge(r)}
                </View>

                <Text style={styles.meta}>
                  {r.city}, {r.state}
                </Text>

                {!!r.phone && (
                  <Text
                    style={styles.link}
                    onPress={() => Linking.openURL(`tel:${r.phone}`)}
                  >
                    {r.phone}
                  </Text>
                )}

                {/* show specialty instead of taxonomy */}
                <Text style={styles.tax}>{(r as any).specialty || '(no specialty listed)'}</Text>

                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => handleToggleProvider(r)}
                  disabled={disableSave}
                  activeOpacity={0.85}
                  style={[
                    styles.saveBtn,
                    (isSaved || isSaving || isRemoving) && styles.saveBtnDisabled,
                  ]}
                >
                  <Text style={styles.saveBtnText}>
                    {isSaving
                      ? 'Saving...'
                      : isRemoving
                        ? 'Removing...'
                        : isSaved
                          ? 'Saved to profile'
                          : 'Save to profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {canLoadMore && (
            <TouchableOpacity
              onPress={() => {
                const next = offset + PAGE_SIZE;
                setOffset(next);
                load(false);
              }}
              activeOpacity={0.9}
              style={[styles.loadMoreBtn, loadingMore && styles.buttonDisabled]}
              disabled={loadingMore}
            >
              <Text style={styles.loadMoreText}>
                {loadingMore ? 'Loading...' : 'Load more'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: G_BG },
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12 },

  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
    color: G_TEXT,
  },
  subtitle: {
    textAlign: 'center',
    color: G_MUTED,
    marginTop: 4,
    marginBottom: 12,
  },

  searchCard: {
    backgroundColor: G_CARD,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: G_BORDER,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDE6E1',
    backgroundColor: '#F7FBF9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 15,
    color: G_TEXT,
  },
  inputDisabled: {
    backgroundColor: '#EEF4F1',
    color: '#9FB0A8',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowLabel: { color: G_TEXT, fontWeight: '700' },

  button: {
    height: 44,
    borderRadius: 12,
    backgroundColor: G_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  buttonDisabled: { backgroundColor: G_PRIMARY_WEAK },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  resultCount: {
    textAlign: 'center',
    color: G_MUTED,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },

  card: {
    backgroundColor: G_CARD,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: G_BORDER,
  },
  name: { fontSize: 16, fontWeight: '800', color: G_TEXT },
  meta: { marginTop: 4, color: G_MUTED },
  link: { color: G_LINK, marginTop: 6, fontWeight: '700' },
  tax: { color: '#395A4B', marginTop: 6 },
  saveBtn: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: G_BORDER,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F7FBF9',
  },
  saveBtnDisabled: {
    backgroundColor: '#E5ECE7',
    borderColor: 'rgba(15,61,46,0.2)',
  },
  saveBtnText: { color: G_TEXT, fontWeight: '700' },

  loadMoreBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: G_TEXT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  loadMoreText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  badge: {
    backgroundColor: G_BADGE_BG,
    color: G_BADGE_TX,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '700',
    fontSize: 12,
  },
});
