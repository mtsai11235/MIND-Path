// app/(tabs)/resourcesContent.tsx
import React, { useEffect, useMemo, useState } from "react";
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
import { useRouter } from "expo-router";
import Fuse from "fuse.js";
import { Resource, fetchResourcesForFuzzy, fetchSymptomSynonyms } from "@/utils/supabaseContent";
import { useAuth } from "@/context/AuthContext";

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

const toStringArray = (input: any): string[] => {
  if (Array.isArray(input)) return input.map(v => String(v)).filter(Boolean);
  if (typeof input === "string") return input.split(/[,;]+/).map(v => v.trim()).filter(Boolean);
  return [];
};

const normalizeToken = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
const tokenizeQuery = (raw: string, stop: Set<string>) =>
  raw
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map(normalizeToken)
    .filter(t => t.length > 2 && !stop.has(t));

// built-in symptom bridges to normalize intent
const BUILTIN_SYNONYMS: Record<string, string[]> = {
  insomnia: ["sleep", "sleep issues", "sleep problems", "trouble sleeping", "cant sleep", "can't sleep", "difficulty sleeping"],
  sleep: ["insomnia", "sleep issues", "sleep problems", "trouble sleeping", "cant sleep", "can't sleep", "difficulty sleeping"],
  anxiety: ["anxious", "panic"],
  anxious: ["anxiety", "panic"],
  depression: ["depressed", "feeling down", "sadness"],
  depressed: ["depression", "feeling down", "sadness"],
};

const buildCanonicalLookup = (map: Record<string, string[]>) => {
  const lookup = new Map<string, string>();
  Object.entries(map).forEach(([key, variants]) => {
    const canon = normalizeToken(key);
    const list = [key, ...(variants ?? [])];
    list.forEach(v => {
      const norm = normalizeToken(v);
      if (norm) lookup.set(norm, canon);
    });
  });
  return lookup;
};

const canonicalizeList = (arr: string[], lookup: Map<string, string>) =>
  Array.from(
    new Set(
      arr
        .map(normalizeToken)
        .map(t => lookup.get(t) ?? t)
        .filter(Boolean)
    )
  );

export default function ResourcesContent() {
  const router = useRouter();
  const { isLoggedIn, profile, updateProfile } = useAuth();
  const PAGE_SIZE = 5;
  const FUSE_RESULT_LIMIT = 50;
  const STOPWORDS = useMemo(
    () => new Set(["i", "and", "the", "a", "an", "to", "of", "in", "on", "for", "with", "feel", "am", "is", "are"]),
    []
  );
  const [synonymMap, setSynonymMap] = useState<Record<string, string[]>>({});
  const [allResources, setAllResources] = useState<Resource[]>([]);

  const toTagText = (input: any): string => {
    if (Array.isArray(input)) return input.join(" ").toLowerCase();
    if (typeof input === "string") return input.toLowerCase();
    return "";
  };

  const getVariants = (token: string): string[] =>
    synonymMap[token] ? synonymMap[token] : [token];

  // symptom input state
  const [symptom, setSymptom] = useState("");

  // search state
  const [didSearch, setDidSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Resource[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [page, setPage] = useState(0);
  const [savingResourceId, setSavingResourceId] = useState<string | null>(null);
  const [removingResourceId, setRemovingResourceId] = useState<string | null>(null);

  // load synonyms from Supabase
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const map = await fetchSymptomSynonyms();
        if (!canceled) setSynonymMap(map);
      } catch (e) {
        console.warn("Failed to load synonyms", e);
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  const savedResourceIds = useMemo(
    () =>
      new Set(
        (profile?.recommendedResourceIds ?? [])
          .map(id => id.trim())
          .filter(id => id.length > 0)
      ),
    [profile?.recommendedResourceIds]
  );

  /** ---------- runSearch Supabase RPC ---------- */
  const runSearch = async () => {
    const raw = symptom.trim();
    const q = raw.toLowerCase();
    if (!q) return;

    setDidSearch(true);
    setLoading(true);
    setErrorMsg(null);

    try {
      let resources = allResources;
      if (resources.length === 0) {
        const fetched = await fetchResourcesForFuzzy();
        resources = fetched.map(r => ({
          ...r,
          tags: toStringArray((r as any).tags),
          symptom_tags: toStringArray((r as any).symptom_tags),
          short_desc: (r as any).short_desc ?? "",
        }));
        setAllResources(resources);
      }

      // build canonical lookup merging server synonyms + builtin bridges
      const mergedSynonyms: Record<string, string[]> = {
        ...BUILTIN_SYNONYMS,
        ...synonymMap,
      };
      const canonicalLookup = buildCanonicalLookup(mergedSynonyms);

      // normalize tags/symptom_tags with canonical map for better grouping
      const resourcesForFuse = resources.map(r => ({
        ...r,
        tags: canonicalizeList(toStringArray((r as any).tags), canonicalLookup),
        symptom_tags: canonicalizeList(toStringArray((r as any).symptom_tags), canonicalLookup),
        short_desc: (r as any).short_desc ?? "",
      }));

      const fuse = new Fuse(resourcesForFuse, {
        includeScore: true,
        threshold: 0.45,
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: [
          { name: "symptom_tags", weight: 0.4 },
          { name: "title", weight: 0.35 },
          { name: "tags", weight: 0.15 },
          { name: "short_desc", weight: 0.05 },
          { name: "org", weight: 0.05 },
        ],
      });

      // --- normalize & canonicalize query ---
      const tokens = tokenizeQuery(q, STOPWORDS);
      const canonicalTokens = tokens
        .map(t => canonicalLookup.get(t) ?? t)
        .filter(Boolean);

      // pick best matching key from synonym map (key + variants overlap with query tokens)
      const synonymEntries = Object.entries(mergedSynonyms).map(([key, variants]) => ({
        key: normalizeToken(key),
        variants: (variants ?? []).map(normalizeToken).filter(Boolean),
      }));

      const scoreEntry = (entry: { key: string; variants: string[] }) => {
        const pool = new Set([entry.key, ...entry.variants]);
        let hits = 0;
        for (const t of tokens) {
          if (pool.has(t)) hits += 1;
        }
        // bonus if any variant substring appears in raw query
        for (const v of pool) {
          if (v.length > 2 && q.includes(v)) hits += 0.5;
        }
        return hits;
      };

      let bestKey: string | null = null;
      let bestScore = 0;
      for (const entry of synonymEntries) {
        const sc = scoreEntry(entry);
        if (sc > bestScore) {
          bestScore = sc;
          bestKey = entry.key;
        }
      }

      const primary = bestKey || canonicalTokens[0] || tokens[0] || normalizeToken(q);

      const primarySynonyms = new Set<string>();
      (mergedSynonyms[primary] ?? []).forEach(v => {
        const norm = normalizeToken(v);
        if (norm) primarySynonyms.add(norm);
      });

      // only search primary + its synonyms + full phrase to reduce noise
      const searchTerms: string[] = [];
      if (primary) searchTerms.push(primary);
      primarySynonyms.forEach(v => searchTerms.push(v));
      if (!searchTerms.includes(q) && q.length > 0) searchTerms.push(q); // full phrase, limited later

      const scored = new Map<string, { item: Resource; score: number; anchorHit: boolean; anchorCount: number }>();
      const anchorTerms = new Set<string>();
      const addAnchorTerms = (t: string) => {
        const norm = normalizeToken(t);
        if (norm) anchorTerms.add(norm);
        t
          .split(/[^a-z0-9]+/)
          .map(normalizeToken)
          .filter(Boolean)
          .forEach(sub => anchorTerms.add(sub));
      };
      if (primary) addAnchorTerms(primary);
      primarySynonyms.forEach(s => addAnchorTerms(s));

      const runTermSearch = (term: string, limit = FUSE_RESULT_LIMIT, requireAnchor = true) => {
        if (!term) return;
        const hits = fuse.search(term, { limit });
        for (const hit of hits) {
          const id = hit.item.id;
          const baseScore = hit.score ?? 0;
          const existing = scored.get(id);

          const textTokens = new Set(
            [
              (hit.item as any).title ?? "",
              (hit.item as any).short_desc ?? "",
              (hit.item as any).tags ?? "",
              (hit.item as any).symptom_tags ?? "",
            ]
              .join(" ")
              .split(/[^a-z0-9]+/)
              .map(normalizeToken)
              .filter(Boolean)
          );
          const anchorMatches = Array.from(anchorTerms).filter(t => t && textTokens.has(t));
          const hasAnchor = anchorTerms.size === 0 || anchorMatches.length > 0;
          if (requireAnchor && !hasAnchor) continue;

          const adjustedScore = hasAnchor ? Math.max(0, baseScore - 0.05) : baseScore + 0.05;

          const nextEntry = {
            item: hit.item,
            score: adjustedScore,
            anchorHit: hasAnchor,
            anchorCount: anchorMatches.length,
          };
          const prevEntry = scored.get(id);
          const isBetter =
            !prevEntry ||
            (nextEntry.anchorHit && !prevEntry.anchorHit) ||
            (nextEntry.anchorHit === prevEntry.anchorHit &&
              (nextEntry.anchorCount > prevEntry.anchorCount ||
                (nextEntry.anchorCount === prevEntry.anchorCount && nextEntry.score < prevEntry.score)));
          if (isBetter) {
            scored.set(id, nextEntry);
          }
        }
      };

      // run searches: primary + synonyms (full limit), phrase term with smaller limit, all requiring anchor
      searchTerms.forEach(term => {
        const isPhrase = term === q;
        runTermSearch(term, isPhrase ? 10 : FUSE_RESULT_LIMIT, true);
      });

      // filling
      if (scored.size < FUSE_RESULT_LIMIT) {
        searchTerms.forEach(term => {
          const isPhrase = term === q;
          runTermSearch(term, isPhrase ? 10 : FUSE_RESULT_LIMIT, false);
        });
      }

      const finalResults = Array.from(scored.values())
        .sort((a, b) => {
          if (a.anchorHit !== b.anchorHit) return a.anchorHit ? -1 : 1; // anchors first
          if (a.anchorCount !== b.anchorCount) return b.anchorCount - a.anchorCount; // more anchor tokens first
          return a.score - b.score;
        })
        .map(entry => entry.item)
        .slice(0, FUSE_RESULT_LIMIT);

      setResults(finalResults);
      setPage(0);
      setLastQuery(raw);
    } catch (e: any) {
      setResults([]);
      setErrorMsg(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const totalPages = useMemo(
    () => (results.length === 0 ? 0 : Math.ceil(results.length / PAGE_SIZE)),
    [results.length]
  );
  const orderedResults = useMemo(() => results, [results]);

  const pagedResults = useMemo(
    () => orderedResults.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [orderedResults, page]
  );

  const queryTokenCounts = useMemo(() => {
    const rawTokens = lastQuery
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map(t => t.trim())
      .filter(t => t.length > 2 && !STOPWORDS.has(t));

    // de-duplicate while preserving order
    const seenTokens = new Set<string>();
    const tokens: string[] = [];
    for (const t of rawTokens) {
      if (!seenTokens.has(t)) {
        seenTokens.add(t);
        tokens.push(t);
      }
    }

    if (tokens.length === 0) return [];

    return tokens
      .map(token => {
        const count = results.reduce((acc, r) => {
          const tagText = `${toTagText((r as any).tags)} ${toTagText((r as any).symptom_tags)}`.trim();
          const variants = getVariants(token);
          return variants.some(v => tagText.includes(v)) ? acc + 1 : acc;
        }, 0);
        return { token, count };
      })
      .filter(entry => entry.count > 0);
  }, [lastQuery, results, STOPWORDS, synonymMap]);

  const handleToggleResource = async (resource: Resource) => {
    const resourceId = resource.id?.trim();
    if (!resourceId) return;

    if (!isLoggedIn) {
      router.push("/(tabs)/login");
      return;
    }

    const currentlySaved = savedResourceIds.has(resourceId);
    if (currentlySaved) {
      if (removingResourceId === resourceId) {
        return;
      }
      setRemovingResourceId(resourceId);
      try {
        const current = profile?.recommendedResourceIds ?? [];
        const next = current.filter(id => id.trim() !== resourceId);
        await updateProfile({ recommendedResourceIds: next });
      } catch (error) {
        console.warn("Failed to remove resource", error);
      } finally {
        setRemovingResourceId(prev => (prev === resourceId ? null : prev));
      }
      return;
    }

    if (savingResourceId === resourceId) {
      return;
    }

    setSavingResourceId(resourceId);
    try {
      const current = profile?.recommendedResourceIds ?? [];
      const next = Array.from(new Set([...current, resourceId]));
      await updateProfile({ recommendedResourceIds: next });
    } catch (error) {
      console.warn("Failed to save resource", error);
    } finally {
      setSavingResourceId(prev => (prev === resourceId ? null : prev));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      {/* Back to switch page */}
      <View style={styles.backBar}>
        <Text
          onPress={() => router.push("/(tabs)/resources")}
          style={styles.backText}
        >
          ← Back to Resources
        </Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search by Symptom</Text>
        <Text style={styles.headerSub}>Enter your symptoms to get relevant educational materials.</Text>
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
                <Text style={{ marginTop: 8, color: GREEN_TEXT_SOFT }}>
                  Searching…
                </Text>
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
              <>
                <Text style={styles.resultHint}>
                  Showing {results.length} results for "{lastQuery}"
                  {queryTokenCounts.length > 0
                    ? `; matches — ${queryTokenCounts
                      .map(entry => `${entry.token}: ${entry.count}`)
                      .join(", ")}`
                    : " (sorted by relevance)"}
                  .
                </Text>
                {pagedResults.map(r => {
                  const isSaved = savedResourceIds.has(r.id);
                  const isSaving = savingResourceId === r.id;
                  const isRemoving = removingResourceId === r.id;
                  return (
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
                    <Pressable
                      onPress={() => Linking.openURL(ensureHttp(r.url))}
                      hitSlop={8}
                    >
                      <Text numberOfLines={1} style={styles.url}>
                        {r.url}
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleToggleResource(r)}
                      disabled={isSaving || isRemoving}
                      style={[
                        styles.saveBtn,
                        (isSaved || isSaving || isRemoving) && styles.saveBtnDisabled,
                      ]}
                    >
                      <Text style={styles.saveBtnText}>
                        {isSaving
                          ? "Saving..."
                          : isRemoving
                            ? "Removing..."
                            : isSaved
                              ? "Saved to profile"
                              : "Save to profile"}
                      </Text>
                      </Pressable>
                    </View>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <View style={styles.paginationRow}>
                    <Pressable
                      style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
                      disabled={page === 0}
                      onPress={() => setPage(p => Math.max(0, p - 1))}
                    >
                      <Text style={styles.pageBtnText}>Previous</Text>
                    </Pressable>
                    <Text style={styles.pageInfo}>
                      Page {page + 1} of {totalPages}
                    </Text>
                    <Pressable
                      style={[styles.pageBtn, page >= totalPages - 1 && styles.pageBtnDisabled]}
                      disabled={page >= totalPages - 1}
                      onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    >
                      <Text style={styles.pageBtnText}>Next</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** ---------- styles ---------- */
const styles = StyleSheet.create({
  backBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backText: {
    color: "#1E855F",
    fontWeight: "700",
  },

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
  saveBtn: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    alignItems: "center",
  },
  saveBtnDisabled: {
    backgroundColor: "#e0ebdf",
    borderColor: "rgba(6,95,70,0.3)",
  },
  saveBtnText: {
    color: GREEN_TEXT,
    fontWeight: "700",
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

  paginationRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pageBtn: {
    flex: 1,
    backgroundColor: GREEN_TEXT,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  pageBtnDisabled: {
    backgroundColor: GREEN_BORDER,
  },
  pageBtnText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  pageInfo: {
    color: GREEN_TEXT,
    fontWeight: "700",
  },
  resultHint: {
    color: GREEN_TEXT_SOFT,
    marginBottom: 8,
  },
});
