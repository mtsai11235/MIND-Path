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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Tabs } from 'expo-router';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { generateAPIUrl } from '@/utils/utils';

/** ---------- Types ---------- */
type Mood = { key: string; label: string; emoji: string; bg: string };
type Tab = "Home" | "Chat" | "Resources" | "Profile";

/** ---------- Data for the mood slider ---------- */
const MOODS: Mood[] = [
  { key: "happy", label: "Happy", emoji: "😊", bg: "#fde68a" },
  { key: "calm", label: "Calm", emoji: "😌", bg: "#bfdbfe" },
  { key: "manic", label: "Manic", emoji: "🌪️", bg: "#c7d2fe" },
  { key: "angry", label: "Angry", emoji: "😡", bg: "#fecaca" },
  { key: "sad", label: "Sad", emoji: "😢", bg: "#bbf7d0" },
];

/** ---------- Layout constants ---------- */
const ITEM_W = 72;                       // mood item width
const ITEM_MR = 12;                      // mood item gap
const { width: W, height: H } = Dimensions.get("window");
const CARD_MIN = Math.round(H * 0.52);   // big green card min-height
const CIRCLE_SIZE = Math.round(W * 1.2); // decorative circle size

/** ---------- Theme colors ---------- */
const GREEN_MAIN   = "#3F9360";
const GREEN_LIGHT  = "#DDEFE6";
const GREEN_LIGHT_ALT = "#CFE7DB";       // slightly deeper than GREEN_LIGHT
const GREEN_BORDER = "rgba(6,95,70,0.14)";
const GREEN_TEXT   = "#065F46";
const PLACEHOLDER  = "#3a6a54";

/** ---------- Profile clinic card colors ---------- */
const PEACH_LIGHT  = "#FEF3E7";
const PEACH_BORDER = "rgba(240, 180, 140, 0.35)";

export default function Index() {
  /** Local tab state (no external nav lib for bottom tabs) */
  const [tab, setTab] = useState<Tab>("Home");

  /** Time-based greeting */
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning!";
    if (h < 18) return "Good Afternoon!";
    return "Good Evening!";
  }, []);

  /** Snap offsets for mood FlatList */
  const snapOffsets = useMemo(() => {
    const arr: number[] = [];
    const leftPad = 16;
    for (let i = 0; i < MOODS.length; i++) arr.push(leftPad + i * (ITEM_W + ITEM_MR));
    return arr;
  }, []);

  /** Home searchbar submit -> switch tabs */
  const onHomeSearchSubmit = (text: string) => {
    const q = text.trim().toLowerCase();
    if (q === 'chat') return setTab('Chat');
    if (q === 'resources' || q === 'resource') return setTab('Resources');
    if (q === 'profile' || q === 'me' || q === 'account') return setTab('Profile');
  };

  /** Render current tab content */
  const renderScreen = () => {
    if (tab === "Home") return <HomeContent greeting={greeting} snapOffsets={snapOffsets} onSearchSubmit={onHomeSearchSubmit} />;
    if (tab === "Chat") return <ChatScreen />;
    if (tab === "Resources") return <ResourcesContent />;
    if (tab === "Profile") return <ProfileContent />;
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />
      {renderScreen()}

      {/* Bottom tab bar (hand-rolled) */}
      <View style={styles.tabbar}>
        <TabItem label="Home"      icon="🏠" active={tab === "Home"}      onPress={() => setTab("Home")} />
        <TabItem label="Chat"      icon="💬" active={tab === "Chat"}      onPress={() => setTab("Chat")} />
        <TabItem label="Resources" icon="📚" active={tab === "Resources"} onPress={() => setTab("Resources")} />
        <TabItem label="Profile"   icon="👤" active={tab === "Profile"}   onPress={() => setTab("Profile")} />
      </View>
    </SafeAreaView>
  );
}

/** ---------- Tabs layout for expo-router (kept minimal) ---------- */
export function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

/** ---------- Chat screen ---------- */
export function ChatScreen() {
  const [input, setInput] = useState('');
  const { messages, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl('api/chat'),
    }),
    onError: error => console.error(error, 'ERROR'),
  });

  if (error) return <Text>{error.message}</Text>;

  return (
    <SafeAreaProvider style={{ height: '100%' }}>
      <View style={styles.chatWrap}>
        {/* Messages list */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}
        >
          {messages.map(m => {
            const isUser = m.role === 'user';
            return (
              <View
                key={m.id}
                style={[styles.msgRow, { alignItems: isUser ? 'flex-end' : 'flex-start' }]}
              >
                <View style={isUser ? styles.bubbleUser : styles.bubbleAssistant}>
                  {m.parts.map((part, i) => {
                    if (part.type === 'text') {
                      return (
                        <Text key={`${m.id}-${i}`} style={styles.msgText}>
                          {part.text}
                        </Text>
                      );
                    }
                    return null;
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Input area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <View style={styles.chatInputWrap}>
            <TextInput
              style={styles.chatInput}
              placeholder="Say something..."
              placeholderTextColor={PLACEHOLDER}
              value={input}
              onChange={e => setInput(e.nativeEvent.text)}
              onSubmitEditing={e => {
                e.preventDefault();
                if (input.trim().length === 0) return;
                sendMessage({ text: input });
                setInput('');
              }}
              autoFocus={true}
              returnKeyType="send"
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaProvider>
  );
}

/** ---------- Resources screen (title + alternating large cards) ---------- */
function ResourcesContent() {
  const items = Array.from({ length: 5 }, (_, i) => `Resources ${i + 1}`);

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      {/* Header title (left-top aligned) */}
      <View style={styles.resourceHeader}>
        <Text style={styles.resourceHeaderText}>Resources</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.resourceList}
        showsVerticalScrollIndicator={false}
      >
        {items.map((label, idx) => (
          <View
            key={label}
            style={[
              styles.resourceCard,
              idx % 2 === 1 && styles.resourceCardAlt, // alternate colors for contrast
            ]}
          >
            <Text style={styles.resourceTitle}>{label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** ---------- Profile screen (hardcoded UI + "mood-card style" buttons) ---------- */
function ProfileContent() {
  // Track selected states for Chat1/2/3 and R1/2 (multi-select, toggled like mood cards)
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const togglePick = (key: string) =>
    setPicked(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      {/* Reuse shared header (avatar + bell) */}
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={{ fontSize: 18 }}>🧑🏻‍🦱</Text></View>
        <View style={{ flex: 1 }} />
        <View style={styles.bellWrap}>
          <Text style={{ fontSize: 20 }}>🔔</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top green card: Previous chats / Resources */}
        <View style={styles.profileTopCard}>
          <Text style={styles.profileTopTitle}>Previous chats / Resources</Text>

          <View style={{ flexDirection: "row", marginTop: 10 }}>
            {/* Left column: Chats */}
            <View style={{ flex: 1 }}>
              {["Chat1", "Chat2", "Chat3"].map(label => {
                const isSelected = !!picked[label];
                return (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    onPress={() => togglePick(label)}
                    style={[
                      styles.choiceItem,
                      {
                        backgroundColor: isSelected ? "#ffffff" : GREEN_LIGHT,
                        borderWidth: isSelected ? 1 : 0,
                        borderColor: isSelected ? "#cbd5e1" : "transparent",
                      },
                    ]}
                  >
                    <Text style={styles.choiceLabel}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ width: 24 }} />

            {/* Right column: Resources */}
            <View style={{ flex: 1 }}>
              {["R1", "R2"].map(label => {
                const isSelected = !!picked[label];
                return (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    onPress={() => togglePick(label)}
                    style={[
                      styles.choiceItem,
                      {
                        backgroundColor: isSelected ? "#ffffff" : GREEN_LIGHT,
                        borderWidth: isSelected ? 1 : 0,
                        borderColor: isSelected ? "#cbd5e1" : "transparent",
                      },
                    ]}
                  >
                    <Text style={styles.choiceLabel}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Decorative blob */}
          <View style={styles.profileTopDecor} />
        </View>

        {/* "Near by Me ▾" section header */}
        <View style={styles.nearbyHeader}>
          <Text style={styles.nearbyTitle}>Near by Me</Text>
          <Text style={styles.nearbyChevron}>▾</Text>
        </View>

        {/* Two static clinic cards */}
        <View style={styles.clinicCard}>
          <Text style={styles.clinicTitle}>Clinic 1</Text>
          <View style={styles.clinicDivider} />
          <Text style={styles.clinicSubtitle}>Location，information..</Text>

          <Pressable style={styles.apptBtn}>
            <Text style={styles.apptBtnText}>Appointment time</Text>
          </Pressable>
        </View>

        <View style={styles.clinicCard}>
          <Text style={styles.clinicTitle}>Clinic 2</Text>
          <View style={styles.clinicDivider} />
          <Text style={styles.clinicSubtitle}>Location，information..</Text>

          <Pressable style={styles.apptBtn}>
            <Text style={styles.apptBtnText}>Appointment time</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/** ---------- Home screen ---------- */
function HomeContent({
  greeting,
  snapOffsets,
  onSearchSubmit,
}: {
  greeting: string;
  snapOffsets: number[];
  onSearchSubmit?: (text: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const onStartConversation = () => console.log("Start conversation pressed");
  const onGetStarted = () => console.log("Get started pressed");
  const onMoodPress = (m: Mood) =>
    setSelectedMood((prev) => (prev === m.key ? null : m.key));

  return (
    <>
      {/* Shared header */}
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 2 }}
        style={{ marginTop: 10, marginBottom: 20 }}
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

      {/* Big green card */}
      <View style={styles.bigCard}>
        {/* Lotus badge */}
        <View style={styles.lotus}><Text style={{ fontSize: 28 }}>🪷</Text></View>

        {/* Inner bubble */}
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
            placeholderTextColor={PLACEHOLDER}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => onSearchSubmit?.(search)}
          />
        </View>

        {/* Decorative circle */}
        <View pointerEvents="none" style={styles.circleDecor} />
      </View>
    </>
  );
}

/** ---------- Single tab button ---------- */
function TabItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tabItem, active && styles.tabItemActive]}>
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

/** ---------- Styles ---------- */
const styles = StyleSheet.create({
  /** App background */
  container: { flex: 1, backgroundColor: "#f3f4f6" },

  /** Shared header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
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

  /** Greeting block */
  titleWrap: { paddingHorizontal: 16, paddingTop: 6 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 4 },
  question: { fontSize: 14, color: "#6b7280" },

  /** Mood slider item */
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

  /** Big green card (container) */
  bigCard: {
    minHeight: CARD_MIN,
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 10,
    backgroundColor: GREEN_MAIN,
    borderRadius: 28,
    padding: 16,
    justifyContent: "flex-start",
    overflow: "hidden",
  },

  /** Lotus badge */
  lotus: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
  },

  /** Inner bubble within big card */
  innerCard: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 18,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 80,
    marginHorizontal: 8,
    zIndex: 3,
    elevation: 3,
  },
  innerTitle: {
    fontWeight: "700",
    color: GREEN_TEXT,
    marginBottom: 12,
    fontSize: 16,
  },

  /** Primary buttons (within inner bubble) */
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
  primaryBtnText: { color: GREEN_TEXT, fontWeight: "700" },
  orText: { textAlign: "center", color: GREEN_TEXT, marginVertical: 6 },

  /** Searchbar on Home */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN_LIGHT,
    borderRadius: 16,
    marginTop: 24,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    height: 46,
    zIndex: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
  },
  searchIcon: { fontSize: 16, marginRight: 8, color: "#355c47" },
  searchInput: { flex: 1, fontSize: 14, color: "#1f2937" },

  /** Decorative circle in big card */
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

  /** Bottom tab bar */
  tabbar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 12,
  },
  tabItemActive: { backgroundColor: GREEN_LIGHT },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  tabLabelActive: { color: GREEN_TEXT, fontWeight: "700" },

  /** ---------- Chat styles ---------- */
  chatWrap: {
    height: '95%',
    display: 'flex',
    flexDirection: 'column',
    paddingHorizontal: 8,
  },
  msgRow: {
    width: '100%',
    marginVertical: 6,
  },
  bubbleAssistant: {
    maxWidth: '82%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bubbleUser: {
    maxWidth: '82%',
    backgroundColor: GREEN_LIGHT,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
  },
  msgText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  chatInputWrap: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    marginHorizontal: 4,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  chatInput: {
    height: 44,
    fontSize: 14,
    color: '#1f2937',
  },

  /** ---------- Resources styles ---------- */
  resourceHeader: {
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  resourceHeaderText: {
    fontSize: 22,
    fontWeight: "700",
    color: GREEN_TEXT,
  },
  resourceList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  resourceCard: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    paddingVertical: 20,
    paddingHorizontal: 18,
    minHeight: Math.round(H * 0.24),
    justifyContent: 'center',
    marginBottom: 16,
  },
  resourceCardAlt: {
    backgroundColor: GREEN_LIGHT_ALT,
  },
  resourceTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GREEN_TEXT,
  },

  /** ---------- Profile styles ---------- */
  profileTopCard: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    padding: 16,
    position: "relative",
    overflow: "hidden",
    marginBottom: 14,
  },
  profileTopTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: GREEN_TEXT,
  },
  profileTopDecor: {
    position: "absolute",
    right: -80,
    bottom: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.28)",
    transform: [{ rotate: "12deg" }],
  },

  // "Mood-card style" choice buttons used in Profile's top card
  choiceItem: {
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  choiceLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },

  /** Nearby section */
  nearbyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // if your RN version doesn't support `gap`, use margins
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  nearbyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5c4235",
  },
  nearbyChevron: {
    marginLeft: 6,
    fontSize: 14,
    color: "#97877d",
  },

  /** Clinic cards */
  clinicCard: {
    backgroundColor: PEACH_LIGHT,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PEACH_BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  clinicTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5c4235",
    marginBottom: 8,
  },
  clinicDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginBottom: 8,
  },
  clinicSubtitle: {
    fontSize: 13,
    color: "#7a6f68",
    marginBottom: 12,
  },
  apptBtn: {
    alignSelf: "flex-start",
    backgroundColor: GREEN_LIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  apptBtnText: {
    color: GREEN_TEXT,
    fontWeight: "700",
  },
});
