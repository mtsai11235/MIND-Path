import React, { useMemo, useState } from "react";
import {
  Text,
  View,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TextInput,
  FlatList,
  Dimensions,
} from "react-native";

type Mood = { key: string; label: string; emoji: string; bg: string };

const MOODS: Mood[] = [
  { key: "happy", label: "Happy", emoji: "😊", bg: "#fde68a" },
  { key: "calm", label: "Calm", emoji: "😌", bg: "#bfdbfe" },
  { key: "manic", label: "Manic", emoji: "🌪️", bg: "#c7d2fe" },
  { key: "angry", label: "Angry", emoji: "😡", bg: "#fecaca" },
  { key: "sad", label: "Sad", emoji: "😢", bg: "#bbf7d0" },
];

const ITEM_W = 72;
const ITEM_MR = 12;
const { height: H } = Dimensions.get("window");
const CARD_MIN = Math.round(H * 0.52);

const GREEN_MAIN = "#307249ff";
const BUBBLE_LIGHT = "#DDEFE6";

export default function Index() {
  const [search, setSearch] = useState("");

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning!";
    if (h < 18) return "Good Afternoon!";
    return "Good Evening!";
  }, []);

  const snapOffsets = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < MOODS.length; i++) arr.push(i * (ITEM_W + ITEM_MR));
    return arr;
  }, []);

  const onStartConversation = () => console.log("Start conversation pressed");
  const onGetStarted = () => console.log("Get started pressed");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={{ fontSize: 18 }}>🧑🏻‍🦱</Text></View>
        <View style={{ flex: 1 }} />
        <View style={styles.bellWrap}>
          <Text style={{ fontSize: 20 }}>🔔</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
        </View>
      </View>

      {/* Title */}
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
        contentContainerStyle={{ paddingHorizontal: 16 }}
        style={{ marginTop: 14, marginBottom: 16 }}
        decelerationRate="fast"
        snapToOffsets={snapOffsets}
        snapToAlignment="start"
        renderItem={({ item }) => (
          <Pressable style={[styles.moodItem, { backgroundColor: item.bg }]}>
            <Text style={styles.moodEmoji}>{item.emoji}</Text>
            <Text style={styles.moodLabel}>{item.label}</Text>
          </Pressable>
        )}
      />

      {/* Big green card */}
      <View style={styles.bigCard}>
        <View style={styles.lotus}><Text style={{ fontSize: 28 }}>🪷</Text></View>

        <View style={styles.innerCard}>
          <Text style={styles.innerTitle}>MindPath is …</Text>
          <Pressable onPress={onStartConversation} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Start a conversation…</Text>
          </Pressable>
          <Text style={styles.orText}>or…</Text>
          <Pressable onPress={onGetStarted} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>See a brief intro</Text>
          </Pressable>
        </View>

        {/* Searchbar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput
            placeholder="Searchbar, type in what you need"
            placeholderTextColor="#3d755bff"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => console.log("search:", search)}
          />
        </View>

        {/* right bottom big circle decor */}
        <View pointerEvents="none" style={styles.circleDecor} />
      </View>

      {/* Bottom tab */}
      <View style={styles.tabbar}>
        <TabItem label="Home" icon="🏠" active />
        <TabItem label="Chat" icon="💬" />
        <TabItem label="Resources" icon="📚" />
        <TabItem label="Profile" icon="👤" />
      </View>
    </SafeAreaView>
  );
}

function TabItem({ label, icon, active }: { label: string; icon: string; active?: boolean }) {
  return (
    <View style={[styles.tabItem, active && styles.tabItemActive]}>
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 4,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#e5e7eb",
    alignItems: "center", justifyContent: "center",
  },
  bellWrap: { position: "relative" },
  badge: {
    position: "absolute", right: -4, top: -2,
    backgroundColor: "#22c55e", borderRadius: 8,
    paddingHorizontal: 4, minWidth: 16, alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  titleWrap: { paddingHorizontal: 16, paddingTop: 6 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 4 },
  question: { fontSize: 14, color: "#6b7280" },

  moodItem: {
    width: ITEM_W, height: 78, borderRadius: 16,
    marginRight: ITEM_MR, alignItems: "center", justifyContent: "center",
  },
  moodEmoji: { fontSize: 24, marginBottom: 6 },
  moodLabel: { fontSize: 12, color: "#374151" },

  bigCard: {
    minHeight: CARD_MIN,
    marginHorizontal: 16,
    marginTop: 0, marginBottom: 10,
    backgroundColor: GREEN_MAIN,
    borderRadius: 28, padding: 16,
    justifyContent: "flex-start",
    overflow: "hidden",
  },
  lotus: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 10,
  },

  innerCard: {
    backgroundColor: BUBBLE_LIGHT,
    borderRadius: 18, padding: 16, marginHorizontal: 8, zIndex: 1,
  },
  innerTitle: { fontWeight: "700", color: "#065f46", marginBottom: 12 },

  primaryBtn: {
    backgroundColor: BUBBLE_LIGHT,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
    alignItems: "center", borderWidth: 1, borderColor: "rgba(24, 112, 87, 0.22)",
    marginBottom: 10,
  },
  primaryBtnText: { color: "#065f46", fontWeight: "700" },
  orText: { textAlign: "center", color: "#065f46", marginVertical: 6 },

  // Searchbar
  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: BUBBLE_LIGHT,
    borderRadius: 16, marginTop: 70, marginHorizontal: 8, // ⬅️ 往下放
    paddingHorizontal: 12, height: 46, zIndex: 1,
    borderWidth: 1, borderColor: "rgba(6,95,70,0.18)",
  },
  searchIcon: { fontSize: 16, marginRight: 8, color: "#355c47" },
  searchInput: { flex: 1, fontSize: 14, color: "#1f2937" },

  // right bottom big circle decor
  circleDecor: {
    position: "absolute",
    right: -200,
    bottom: -270,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(255,255,255,0.22)",
    zIndex: 0,
  },

  tabbar: {
    flexDirection: "row", backgroundColor: "#ffffff",
    paddingVertical: 6, paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb",
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4, borderRadius: 12 },
  tabItemActive: { backgroundColor: "#e0f2fe" },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  tabLabelActive: { color: "#0284c7", fontWeight: "700" },
});
