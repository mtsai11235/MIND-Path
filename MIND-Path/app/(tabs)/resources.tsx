// app/(tabs)/resources.tsx
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import {
  searchProvidersPaged,
  ProviderRow,
} from '@/utils/db';

const PAGE_SIZE = 20;

export default function ResourcesTab() {
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [taxonomy, setTaxonomy] = useState('');
  const [city, setCity] = useState('BOSTON');
  const [state, setState] = useState('MA');

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0); // current offset for pagination

  // Function to load provider data (either reset or load more)
  async function load(reset = true) {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const { rows: newRows, total: newTotal } = await searchProvidersPaged({
        q,
        taxonomy,
        city,
        state,
        limit: PAGE_SIZE,
        offset: reset ? 0 : offset,
      });

      if (reset) {
        setRows(newRows);
      } else {
        setRows(prev => [...prev, ...newRows]);
      }
      setTotal(newTotal);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Load default city data when the screen first opens
  useEffect(() => {
    load(true);
  }, []);

  const canLoadMore = rows.length < total;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={styles.title}>Search Providers</Text>
          <Text style={styles.subtitle}>Find clinics and professionals near you</Text>

          {/* Search form card */}
          <View style={styles.searchCard}>
            <TextInput
              placeholder="State (e.g. MA)"
              value={state}
              onChangeText={(t) => setState(t.toUpperCase())}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
            />
            <TextInput
              placeholder="City (e.g. BOSTON)"
              value={city}
              onChangeText={(t) => setCity(t.toUpperCase())}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
            />
            <TextInput
              placeholder="Name contains (e.g. clinic)"
              value={q}
              onChangeText={setQ}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              placeholder="Taxonomy contains (e.g. therapy)"
              value={taxonomy}
              onChangeText={setTaxonomy}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              onPress={() => load(true)}
              activeOpacity={0.8}
              style={[styles.button, loading && styles.buttonDisabled]}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Searching...' : 'Search'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search result count */}
          <Text style={styles.resultCount}>
            {loading && rows.length === 0
              ? 'Searching...'
              : `Found ${total} ${total === 1 ? 'result' : 'results'}${city ? ` in ${city}` : ''}${state ? `, ${state}` : ''}`}
          </Text>

          {/* Result list */}
          {rows.map((r) => (
            <View key={r.provider_id} style={styles.card}>
              <Text style={styles.name}>{r.basic_name || '(no name)'}</Text>
              <Text style={styles.meta}>
                {r.city}, {r.state}
              </Text>

              {r.phone ? (
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL(`tel:${r.phone}`)}
                >
                  {r.phone}
                </Text>
              ) : null}

              <Text style={styles.tax}>{r.taxonomy_desc || '(no taxonomy)'}</Text>
            </View>
          ))}

          {/* Load more button */}
          {canLoadMore && (
            <TouchableOpacity
              onPress={() => {
                const next = offset + PAGE_SIZE;
                setOffset(next);
                load(false);
              }}
              activeOpacity={0.85}
              style={[styles.loadMoreBtn, loadingMore && styles.buttonDisabled]}
              disabled={loadingMore}
            >
              <Text style={styles.loadMoreText}>
                {loadingMore ? 'Loading...' : 'Load more'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Style definitions
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7FB' },
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
    color: '#111827',
  },
  subtitle: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 12,
  },

  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 15,
    color: '#111827',
  },
  button: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  buttonDisabled: { backgroundColor: '#93C5FD' },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  resultCount: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EEF2F7',
  },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  meta: { marginTop: 4, color: '#6B7280' },
  link: { color: '#2563EB', marginTop: 6, fontWeight: '600' },
  tax: { color: '#374151', marginTop: 4 },

  loadMoreBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  loadMoreText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});