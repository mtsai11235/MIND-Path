// app/(tabs)/resources.tsx
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter, type Href } from "expo-router"; // Import Href for typed navigation

// Global design colors
const G_BG = "#F5FAF7";
const G_CARD = "#FFFFFF";
const G_BORDER = "rgba(16,82,60,0.12)";
const G_TEXT = "#0F3D2E";
const G_MUTED = "#6B7F75";
const G_PRIMARY = "#2F6F4E";

export default function ResourcesSwitch() {
  // Navigation hook for Expo Router
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Pick a Resources tool</Text>
        <Text style={styles.subtitle}>You can switch between two implementations.</Text>

        {/* Option A - Symptom search */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Option A - Symptom search</Text>
          <Text style={styles.cardDesc}>Enter symptom keywords (e.g. anxiety / OCD / ADHD).</Text>

          <TouchableOpacity
            activeOpacity={0.9}
            accessibilityRole="button"
            // Navigate to Supabase search UI screen
            onPress={() => router.push("/(tabs)/resourcesContent" as Href)}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Go to Choice 1</Text>
          </TouchableOpacity>
        </View>

        {/* Option B - Provider finder */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Option B - Provider finder</Text>
          <Text style={styles.cardDesc}>Search by city/state/specialty. Includes distance ranking and pagination.</Text>

          <TouchableOpacity
            activeOpacity={0.9}
            accessibilityRole="button"
            // Navigate to provider search UI screen
            onPress={() => router.push("/(tabs)/resourcesProvider" as Href)}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Go to Choice 2</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: G_BG },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center", marginTop: 8, color: G_TEXT },
  subtitle: { textAlign: "center", color: G_MUTED, marginTop: 4, marginBottom: 12 },
  card: {
    backgroundColor: G_CARD,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: G_BORDER,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: G_TEXT },
  cardDesc: { marginTop: 6, color: G_MUTED },
  button: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: G_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(47,111,78,0.28)",
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, letterSpacing: 0.2 },
});
