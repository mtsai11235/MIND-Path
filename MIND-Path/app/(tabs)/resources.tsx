// app/(tabs)/ResourcesContent.tsx
import React, { useState } from "react";
import {
  Text,
  View,
  ScrollView,
  Dimensions,
  StyleSheet,
  TextInput,
  Pressable,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { searchResourcesBySymptom, Resource } from "@/utils/supabase";

/** ---------- Theme ---------- */
const GREEN_LIGHT = "#DDEFE6";
const GREEN_BORDER = "rgba(6,95,70,0.14)";
const GREEN_TEXT = "#065F46";
const GREEN_TEXT_SOFT = "rgba(6,95,70,0.75)";
const CARD_BG = "#ffffff";
const BLUE_LINK = "#2563eb";
const { height: H } = Dimensions.get("window");

/** ---------- Helpers ---------- */
const ensureHttp = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `https://${url}`;

export default function ResourcesContent() {
  // symptom input state
  const [symptom, setSymptom] = useState("");

  // search state
  const [didSearch, setDidSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Resource[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /** ---------- runSearch Supabase RPC ---------- */
  const runSearch = async () => {
    const q = symptom.trim().toLowerCase();
    if (!q) return;

    setDidSearch(true);
    setLoading(true);
    setErrorMsg(null);

    try {
      const rows = await searchResourcesBySymptom(q);
      setResults(rows);
    } catch (e: any) {
      setResults([]);
      setErrorMsg(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search Providers</Text>
        <Text style={styles.headerSub}>Find clinics and professionals near you</Text>
      </View>

      {/* Search Card */}
      <View style={styles.searchCard}>
        <TextInput
          value={symptom}
          onChangeText={setSymptom}
          placeholder="Symptom (in English), e.g., anxiety / ocd / adhd"
          placeholderTextColor={GREEN_TEXT_SOFT}
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={runSearch}
        />
        <Pressable onPress={runSearch} style={styles.searchBtn}>
          <Text style={styles.searchBtnText}>Search</Text>
        </Pressable>
      </View>

      {/* Results */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.resultList}
        showsVerticalScrollIndicator={false}
      >
        {!didSearch ? null : (
          <>
            {loading ? (
              <View style={[styles.card, styles.centerCard]}>
                <ActivityIndicator />
                <Text style={{ marginTop: 8, color: GREEN_TEXT_SOFT }}>Searching…</Text>
              </View>
            ) : errorMsg ? (
              <View style={[styles.card, styles.centerCard]}>
                <Text style={styles.errorText}>
                  Failed to load resources: {errorMsg}
                </Text>
              </View>
            ) : results.length === 0 ? (
              <View style={[styles.card, styles.centerCard]}>
                <Text style={styles.emptyText}>
                  No resources found. Try a different keyword.
                </Text>
              </View>
            ) : (
              results.map((r) => (
                <View key={r.id} style={styles.card}>
                  {/* Title */}
                  <Text numberOfLines={2} style={styles.title}>
                    {r.title}
                  </Text>

                  {/* Meta row: org + type */}
                  <View style={styles.metaRow}>
                    {r.org ? (
                      <Text style={styles.org} numberOfLines={1}>
                        {r.org}
                      </Text>
                    ) : null}

                    <View style={styles.typePill}>
                      <Text style={styles.typePillText}>{r.type}</Text>
                    </View>
                  </View>

                  {/* URL */}
                  <Pressable onPress={() => Linking.openURL(ensureHttp(r.url))} hitSlop={8}>
                    <Text numberOfLines={1} style={styles.url}>
                      {r.url}
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** ---------- styles ---------- */
const styles = StyleSheet.create({
  header: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSub: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
  },

  searchCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  input: {
    backgroundColor: GREEN_LIGHT,
    borderColor: GREEN_BORDER,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: GREEN_TEXT,
    fontSize: 16,
    marginBottom: 10,
  },
  searchBtn: {
    backgroundColor: GREEN_TEXT,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  resultList: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },

  card: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    paddingVertical: 18,
    paddingHorizontal: 18,
    minHeight: Math.round(H * 0.16),
    justifyContent: "center",
    marginBottom: 16,
  },
  centerCard: {
    minHeight: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  org: {
    fontSize: 14,
    color: "#6b7280",
    maxWidth: "70%",
  },
  typePill: {
    backgroundColor: "#e2f0e9",
    borderColor: GREEN_BORDER,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN_TEXT,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  url: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "600",
    color: BLUE_LINK,
  },

  emptyText: {
    color: GREEN_TEXT_SOFT,
    fontSize: 15,
    textAlign: "center",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 15,
    textAlign: "center",
  },
});
