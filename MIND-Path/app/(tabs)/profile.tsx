import React, { useEffect, useMemo, useState } from "react";
import {
  Text,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import LoginScreen from "./login";

/** ---------- Theme colors ---------- */
const GREEN_MAIN = "#3F9360";
const GREEN_LIGHT = "#DDEFE6";
const GREEN_LIGHT_ALT = "#CFE7DB"; // slightly deeper than GREEN_LIGHT
const GREEN_BORDER = "rgba(6,95,70,0.14)";
const GREEN_TEXT = "#065F46";
const PLACEHOLDER = "#3a6a54";

/** ---------- Profile clinic card colors ---------- */
const PEACH_LIGHT = "#FEF3E7";
const PEACH_BORDER = "rgba(240, 180, 140, 0.35)";

const EMPTY_PROFILE = {
  username: "",
  password: "",
  zipcode: "",
  previousChatSessionIds: [] as string[],
  recommendedResourceIds: [] as string[],
  clinicIds: [] as string[],
};

function ProfileContent() {
  const { logOut, profile, updateProfile } = useAuth();
  const safeProfile = useMemo(() => profile ?? EMPTY_PROFILE, [profile]);

  const {
    previousChatSessionIds,
    recommendedResourceIds,
    clinicIds,
    zipcode,
    username,
  } = safeProfile;

  const displayName = username || "Guest Explorer";
  const zipcodeDisplay = zipcode || "Zipcode not provided";

  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const togglePick = (key: string) =>
    setPicked(prev => ({ ...prev, [key]: !prev[key] }));

  const [editingZip, setEditingZip] = useState(false);
  const [pendingZip, setPendingZip] = useState(zipcode);

  useEffect(() => {
    if (!editingZip) {
      setPendingZip(zipcode);
    }
  }, [zipcode, editingZip]);

  const handleZipSave = async () => {
    const trimmed = pendingZip.trim();
    await updateProfile({ zipcode: trimmed });
    setEditingZip(false);
  };

  const handleZipCancel = () => {
    setPendingZip(zipcode);
    setEditingZip(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Reuse shared header (avatar + bell) */}
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={{ fontSize: 18 }}>🧑🏻‍🦱</Text></View>
          <View style={{ flex: 1 }} />
          <View style={styles.bellWrap}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
          </View>
        </View>

        {/* Top green card: Previous chats / Resources */}
        <View style={styles.profileTopCard}>
          <Text style={styles.profileTopTitle}>Previous chats / Resources</Text>
          <Text style={styles.profileTopSubtitle}>
            Hi {displayName}, resume a conversation or revisit a recommended
            resource.
          </Text>

          <View style={{ flexDirection: "row", marginTop: 10 }}>
            {/* Left column: Chats */}
            <View style={{ flex: 1 }}>
              {previousChatSessionIds.length === 0 ? (
                <Text style={styles.emptyText}>No saved chats yet.</Text>
              ) : (
                previousChatSessionIds.map(label => {
                  const isSelected = !!picked[label];
                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="button"
                      onPress={() => togglePick(label)}
                      style={[
                        styles.choiceItem,
                        {
                          backgroundColor: isSelected
                            ? "#ffffff"
                            : GREEN_LIGHT,
                          borderWidth: isSelected ? 1 : 0,
                          borderColor: isSelected ? "#cbd5e1" : "transparent",
                        },
                      ]}
                    >
                      <Text style={styles.choiceLabel}>{label}</Text>
                    </Pressable>
                  );
                })
              )}
            </View>

            <View style={{ width: 24 }} />

            {/* Right column: Resources */}
            <View style={{ flex: 1 }}>
              {recommendedResourceIds.length === 0 ? (
                <Text style={styles.emptyText}>No resources saved yet.</Text>
              ) : (
                recommendedResourceIds.map(label => {
                  const isSelected = !!picked[label];
                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="button"
                      onPress={() => togglePick(label)}
                      style={[
                        styles.choiceItem,
                        {
                          backgroundColor: isSelected
                            ? "#ffffff"
                            : GREEN_LIGHT,
                          borderWidth: isSelected ? 1 : 0,
                          borderColor: isSelected ? "#cbd5e1" : "transparent",
                        },
                      ]}
                    >
                      <Text style={styles.choiceLabel}>{label}</Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>

          {/* Decorative blob */}
          <View style={styles.profileTopDecor} />
        </View>

        <View style={styles.nearbyHeader}>
          <Text style={styles.nearbyTitle}>
            Near by Me
            <Text style={styles.nearbyChevron}> ▾ </Text>
            <Text style={styles.nearbyZip}> {zipcodeDisplay} </Text>
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setEditingZip(true)}
            style={styles.zipEditIcon}
          >
            <Text style={styles.nearbyZip}>Edit</Text>
          </Pressable>
        </View>
        {editingZip && (
          <View style={styles.zipEditRow}>
            <TextInput
              value={pendingZip}
              onChangeText={setPendingZip}
              placeholder="Enter zipcode"
              placeholderTextColor={PLACEHOLDER}
              keyboardType="number-pad"
              style={styles.zipInput}
              maxLength={10}
            />
            <Pressable
              accessibilityRole="button"
              onPress={handleZipSave}
              style={styles.zipActionBtn}
            >
              <Text style={styles.zipActionText}>Save</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleZipCancel}
              style={[styles.zipActionBtn, styles.zipCancelBtn]}
            >
              <Text style={[styles.zipActionText, styles.zipCancelText]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        )}

        {/* Saved clinics */}
        {clinicIds.length === 0 ? (
          <View style={styles.clinicCard}>
            <Text style={styles.clinicTitle}>No clinics saved yet</Text>
            <View style={styles.clinicDivider} />
            <Text style={styles.clinicSubtitle}>
              Pin clinics you like and they will appear here for quick access.
            </Text>
          </View>
        ) : (
          clinicIds.map(id => {
            const isSelected = !!picked[id];
            return (
              <View
                key={id}
                style={[
                  styles.clinicCard,
                  isSelected && styles.clinicCardSelected,
                ]}
              >
                <Text style={styles.clinicTitle}>{id}</Text>
                <View style={styles.clinicDivider} />
                <Text style={styles.clinicSubtitle}>
                  Saved from your resource recommendations. Tap when you are
                  ready to schedule.
                </Text>
                <Pressable
                  style={styles.apptBtn}
                  accessibilityRole="button"
                  onPress={() => togglePick(id)}
                >
                  <Text style={styles.apptBtnText}>Appointment time</Text>
                </Pressable>
              </View>
            );
          })
        )}

        <Pressable
          style={styles.logoutBtn}
          accessibilityRole="button"
          onPress={logOut}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ProfileScreen() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) {
    return <LoginScreen />;
  }
  return <ProfileContent />;
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
    fontWeight: "700",
    color: GREEN_TEXT,
    marginBottom: 6,
  },
  profileTopSubtitle: {
    fontSize: 12,
    color: PLACEHOLDER,
  },
  profileTopDecor: {
    position: "absolute",
    right: -60,
    bottom: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.28)",
    transform: [{ rotate: "12deg" }],
  },

  zipEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
    marginBottom: 12,
  },
  zipInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: GREEN_LIGHT_ALT,
  },
  zipActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: GREEN_LIGHT,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
  },
  zipActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN_TEXT,
  },
  zipCancelBtn: {
    backgroundColor: "#ffffff",
  },
  zipCancelText: {
    color: PLACEHOLDER,
  },
  zipEditIcon: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  editIconText: {
    fontSize: 16,
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
  clinicCardSelected: {
    borderColor: GREEN_BORDER,
    borderWidth: 2,
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
  emptyText: {
    fontSize: 12,
    color: PLACEHOLDER,
    fontStyle: "italic",
  },

  /** Nearby section */
  nearbyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  nearbyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5c4235",
  },
  nearbyZip: {
    fontSize: 14,
    color: PLACEHOLDER,
    fontWeight: "600",
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
    marginBottom: 10,
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

  logoutBtn: {
    marginTop: 12,
    backgroundColor: GREEN_MAIN,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
