import React, { useMemo, useState, useEffect } from "react";
import {
  Text,
  View,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TextInput,
  FlatList,
  Dimensions,
  Animated, // animations for fade in/out
} from "react-native";
import { useRouter } from "expo-router";

/** ---------- Types ---------- */
type Mood = { key: string; label: string; emoji: string; bg: string };

/** ---------- Data ---------- */
const MOODS: Mood[] = [
  { key: "happy", label: "Happy", emoji: "😊", bg: "#fde68a" },
  { key: "calm", label: "Calm", emoji: "😌", bg: "#bfdbfe" },
  { key: "manic", label: "Manic", emoji: "🌪️", bg: "#c7d2fe" },
  { key: "angry", label: "Angry", emoji: "😡", bg: "#fecaca" },
  { key: "sad", label: "Sad", emoji: "😢", bg: "#bbf7d0" },
  { key: "unsure", label: "Unsure", emoji: "❓", bg: "#e5e7eb" },
];

/** ---------- Mood → friendly message ---------- */
const MOOD_MESSAGES: Record<string, string> = {
  happy:
    "Love to see you feeling happy today! Want to capture what's working well or keep the good momentum going?",
  calm:
    "Feeling calm is a great place to be. Would you like a short reflection or some gentle practices to maintain it?",
  manic:
    "Thanks for sharing. If your energy feels intense or hard to manage, we can ground together with quick steps or reach out for support.",
  angry:
    "It's okay to feel angry. I can help you cool down with brief exercises or find resources to unpack what triggered it.",
  sad:
    "Sorry you're feeling low. We can try a quick check-in, a small mood lift, or connect to supportive resources.",
  unsure:
    "Not sure how you feel? That's totally fine. We can take it slow, However, please remember that MindPath is a guide, not a medical service. If you feel unsafe or have thoughts of harming yourself, please seek immediate help.",
};

/** ---------- Layout constants ---------- */
const ITEM_W = 72;
const ITEM_MR = 12;
const { width: W, height: H } = Dimensions.get("window");
const CIRCLE_SIZE = Math.round(W * 1.2);

// Global spacing
const GUTTER = 16;
const INNER_GUTTER = 12;

// Bottom constraint
const BOTTOM_TAB_H = 64;
const SAFE_GAP = 8;

/** ---------- Theme ---------- */
const GREEN_MAIN   = "#3F9360";
const GREEN_LIGHT  = "#DDEFE6";
const GREEN_BORDER = "rgba(6,95,70,0.14)";
const GREEN_TEXT   = "#065F46";
const PLACEHOLDER  = "#3a6a54";
const CYAN         = "#0d9488";

/** ---------- Screen ---------- */
export default function Index() {
  const router = useRouter();

  // Time-based greeting
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning!";
    if (h < 18) return "Good Afternoon!";
    return "Good Evening!";
  }, []);

  // Snap offsets for moods
  const snapOffsets = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < MOODS.length; i++) arr.push(GUTTER + i * (ITEM_W + ITEM_MR));
    return arr;
  }, []);

  const [search, setSearch] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Crossfade animations: intro text fades OUT, actions fade IN (and vice versa)
  const [actionsOpacity] = useState(new Animated.Value(0));
  const [introOpacity] = useState(new Animated.Value(1));

  useEffect(() => {
    if (selectedMood) {
      // Fade out the intro text, fade in the action buttons
      Animated.parallel([
        Animated.timing(introOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(actionsOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade back the intro text, hide the action buttons
      Animated.parallel([
        Animated.timing(introOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(actionsOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedMood, introOpacity, actionsOpacity]);

  // Measure top block & screen height
  const [topH, setTopH] = useState(0);
  const [screenH, setScreenH] = useState(H);
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setScreenH(window.height);
    });
    return () => sub?.remove();
  }, []);

  // Actions
  const onStartConversation = () => router.push("/chat");
  const onRelatedResources  = () => router.push("/resources");
  const onMoodPress = (m: Mood) =>
    setSelectedMood((prev) => (prev === m.key ? null : m.key));

  // Search -> navigate
  const onHomeSearchSubmit = (text: string) => {
    const q = text.trim().toLowerCase();
    if (q === "chat") return router.push("/chat");
    if (q === "resources" || q === "resource") return router.push("/resources");
    if (q === "profile" || q === "me" || q === "account") return router.push("/profile");
  };

  // Keep big card within available viewport
  const bigCardMaxH = Math.max(220, screenH - topH - BOTTOM_TAB_H - SAFE_GAP);

  // Helper: pick friendly text for current mood
  const moodText =
    selectedMood ? MOOD_MESSAGES[selectedMood] ?? MOOD_MESSAGES.unknown : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.page}>
        {/* Top block: header + greeting + moods (measured) */}
        <View onLayout={(e) => setTopH(e.nativeEvent.layout.height)}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatar}><Text style={{ fontSize: 18 }}>🧑🏻‍🦱</Text></View>
            <View style={{ flex: 1 }} />
            <View style={styles.bellWrap}>
              <Text style={{ fontSize: 20 }}>🔔</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
            </View>
          </View>

          {/* Greeting */}
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{greeting}</Text>
            <Text style={styles.question}>How are you feeling today?</Text>
          </View>

          {/* Mood slider */}
          <FlatList
            data={MOODS}
            keyExtractor={(m) => m.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 2 }}
            style={{ marginTop: 10, marginBottom: 12 }}
            decelerationRate="fast"
            snapToOffsets={snapOffsets}
            snapToAlignment="start"
            renderItem={({ item }) => {
              const isSelected = selectedMood === item.key;
              return (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onMoodPress(item)}
                  style={[
                    styles.moodItem,
                    {
                      backgroundColor: isSelected ? "#ffffff" : item.bg,
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: isSelected ? "#cbd5e1" : "transparent",
                    },
                  ]}
                >
                  <Text style={styles.moodEmoji}>{item.emoji}</Text>
                  <Text style={styles.moodLabel}>{item.label}</Text>
                </Pressable>
              );
            }}
          />
        </View>

        {/* Big green card */}
        <View style={[styles.bigCard, { maxHeight: bigCardMaxH }]}>
          {/* Lotus badge */}
          <View style={styles.lotus}><Text style={{ fontSize: 28 }}>🪷</Text></View>

          {/* Inner content bubble */}
          <View style={styles.innerCard}>
            <Text style={styles.innerTitle}>
              {selectedMood ? "Mood:" : "MindPath is …"}
            </Text>

            {/* Swap zone: intro text fades OUT; actions + mood bubble fade IN */}
            <View style={styles.swapZone}>
              {/* Intro paragraph (fades OUT when a mood is selected) */}
              <Animated.View style={[styles.descWrap, { opacity: introOpacity }]}>
                <View>
                  {/* part1 */}
                  <Text style={[styles.innerDesc, styles.innerDescLead]}>
                    A digital platform designed to simplify the process of seeking mental health support.
                  </Text>

                  {/* part2 */}
                  <Text style={styles.innerDesc}>
                    It helps users understand their symptoms through conversational assessment, provides
                    educational resources about mental health topics, and connects them with appropriate
                    local professionals and support services.
                  </Text>
                </View>
              </Animated.View>

              {/* Actions + Mood Bubble (fade IN together) */}
              <Animated.View style={[styles.actionsWrap, { opacity: actionsOpacity }]}>
                {/* Mood bubble appears above the buttons */}
                {moodText && (
                  <View style={styles.moodBubble}>
                    <Text style={styles.moodBubbleEmoji}>
                      {MOODS.find(m => m.key === selectedMood)?.emoji ?? "💬"}
                    </Text>
                    <Text style={styles.moodBubbleText}>{moodText}</Text>
                    <View style={styles.moodBubbleTail} />
                  </View>
                )}

                {/* Primary actions */}
                <Pressable
                  accessibilityRole="button"
                  onPress={onStartConversation}
                  style={[styles.primaryBtn, selectedMood && styles.primaryBtnBump]}
                >
                  <Text style={styles.primaryBtnText}>Start a conversation…</Text>
                </Pressable>

                <Text style={styles.orText}>or…</Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={onRelatedResources}
                  style={[styles.primaryBtn, selectedMood && styles.primaryBtnBump]}
                >
                  <Text style={styles.primaryBtnText}>Related resources</Text>
                </Pressable>
              </Animated.View>
            </View>

            {/* Decorative lotus inside the bubble (bottom-right) */}
            <View pointerEvents="none" style={styles.innerLotusDecor}>
              <View style={styles.innerLotusHalo} />
              <Text style={styles.innerLotusEmoji}>🪷</Text>
            </View>
          </View>

          {/* Search bar — near the very bottom */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔎</Text>
            <TextInput
              placeholder="Searchbar, type in what you need"
              placeholderTextColor={PLACEHOLDER}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={(event) => onHomeSearchSubmit(event.nativeEvent.text)}
            />
          </View>

          {/* Decorative circle */}
          <View pointerEvents="none" style={styles.circleDecor} />
        </View>
      </View>
    </SafeAreaView>
  );
}

/** ---------- Styles ---------- */
const styles = StyleSheet.create({
  // App background
  container: { flex: 1, backgroundColor: "#f3f4f6" },

  // Root page wrapper
  page: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: GUTTER,
    paddingTop: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  bellWrap: { position: "relative" },
  badge: {
    position: "absolute",
    right: -4,
    top: -2,
    backgroundColor: "#22c55e",
    borderRadius: 8,
    paddingHorizontal: 4,
    minWidth: 16,
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  // Greeting
  titleWrap: { paddingHorizontal: GUTTER, paddingTop: 6 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 4 },
  question: { fontSize: 14, color: "#6b7280" },

  // Mood item
  moodItem: {
    width: ITEM_W,
    height: 78,
    borderRadius: 16,
    marginRight: ITEM_MR,
    alignItems: "center",
    justifyContent: "center",
  },
  moodEmoji: { fontSize: 24, marginBottom: 6 },
  moodLabel: { fontSize: 12, color: "#374151" },

  // Big green card
  bigCard: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 220,
    marginHorizontal: GUTTER,
    marginTop: 8,
    marginBottom: SAFE_GAP,
    backgroundColor: GREEN_MAIN,
    borderRadius: 28,
    padding: INNER_GUTTER,
    justifyContent: "flex-start",
    overflow: "hidden",
    alignSelf: "stretch",
  },

  // Lotus badge (top center)
  lotus: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
    zIndex: 3,
  },

  // Inner content bubble
  innerCard: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 18,
    paddingTop: 16,
    paddingHorizontal: INNER_GUTTER,
    paddingBottom: 110,             // extra room for the lotus at bottom-right
    marginHorizontal: INNER_GUTTER - 4,
    marginTop: 16,
    flexGrow: 1,
    flexBasis: 0,
    zIndex: 2,
    elevation: 2,
  },
  innerTitle: {
    fontWeight: "700",
    color: GREEN_TEXT,
    marginBottom: 8,
    fontSize: 16,
  },

  /** Swap zone holds BOTH intro text and the action buttons,
   *  overlaid at the same spot and crossfaded. Height ensures
   *  stable layout and keeps search bar from jumping.
   */
  swapZone: {
    position: "relative",
    minHeight: 210,          // slightly taller to fit mood bubble + buttons
    marginBottom: 8,
  },

  // Intro text wrapper (absolute to overlap)
  descWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },

  innerDesc: {
    fontWeight: "200",
    color: GREEN_TEXT,
    opacity: 0.9,
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 14,
  },
  // Lead sentence highlight
  innerDescLead: {
    color: CYAN,
    fontWeight: "700",
    marginBottom: 10,
  },

  // Action buttons wrapper (overlays intro)
  actionsWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },

  // --- Mood Bubble styles ---
  moodBubble: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    marginRight: 36, // leave some breathing room on the right
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: "relative",
  },
  moodBubbleEmoji: {
    fontSize: 18,
    marginRight: 8,
    marginTop: 2,
  },
  moodBubbleText: {
    flex: 1,
    color: GREEN_TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  moodBubbleTail: {
    position: "absolute",
    left: 18,
    bottom: -6,
    width: 12,
    height: 12,
    backgroundColor: "#ffffff",
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: GREEN_BORDER,
    transform: [{ rotate: "45deg" }],
  },

  // Buttons
  primaryBtn: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    marginBottom: 10,
  },
  primaryBtnBump: {
    marginTop: 12, // push buttons slightly lower after mood is selected
  },
  primaryBtnText: { color: GREEN_TEXT, fontWeight: "700" },
  orText: { textAlign: "center", color: GREEN_TEXT, marginVertical: 6 },

  // Decorative lotus inside bubble (bottom-right)
  innerLotusDecor: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  innerLotusHalo: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 46,
    backgroundColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    borderColor: GREEN_BORDER,
  },
  innerLotusEmoji: {
    fontSize: 36,
    opacity: 0.95,
  },

  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN_LIGHT,
    borderRadius: 16,
    marginTop: 12,
    marginHorizontal: INNER_GUTTER - 4,
    paddingHorizontal: 12,
    height: 46,
    zIndex: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
  },
  searchIcon: { fontSize: 16, marginRight: 8, color: "#355c47" },
  searchInput: { flex: 1, fontSize: 14, color: "#1f2937" },

  // Decorative circle (outside bubble)
  circleDecor: {
    position: "absolute",
    right: -CIRCLE_SIZE * 0.55,
    bottom: -CIRCLE_SIZE * 0.55,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.22)",
    zIndex: 0,
  },
});
