import React, { useState } from "react";
import {
  Text,
  View,
  Pressable,
  ScrollView,
  StyleSheet
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

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

/** ---------- Profile screen (hardcoded UI + "mood-card style" buttons) ---------- */
export default function ProfileContent() {
  // Track selected states for Chat1/2/3 and R1/2 (multi-select, toggled like mood cards)
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const togglePick = (key: string) =>
    setPicked(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
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
    </SafeAreaProvider>
  );
}


const styles = StyleSheet.create({
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
})