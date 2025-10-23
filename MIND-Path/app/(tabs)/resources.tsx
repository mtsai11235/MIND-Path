import React from "react";
import {
  Text,
  View,
  ScrollView,
  Dimensions,
  StyleSheet
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';


/** ---------- Theme colors ---------- */
const GREEN_LIGHT  = "#DDEFE6";
const GREEN_LIGHT_ALT = "#CFE7DB";       // slightly deeper than GREEN_LIGHT
const GREEN_BORDER = "rgba(6,95,70,0.14)";
const GREEN_TEXT   = "#065F46";


/** ---------- Layout constants ---------- */
const { width: W, height: H } = Dimensions.get("window");


/** ---------- Resources screen (title + alternating large cards) ---------- */
export default function ResourcesContent() {
  const items = Array.from({ length: 5 }, (_, i) => `Resources ${i + 1}`);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
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
      </SafeAreaView>

  );
}

const styles = StyleSheet.create({

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
})