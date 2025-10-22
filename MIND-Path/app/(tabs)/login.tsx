import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

/** ---------- Theme colors ---------- */
const GREEN_MAIN = "#3F9360";
const GREEN_LIGHT = "#DDEFE6";
const GREEN_BORDER = "rgba(6,95,70,0.14)";
const GREEN_TEXT = "#065F46";
const PLACEHOLDER = "#3a6a54";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secureEntry, setSecureEntry] = useState(true);
  const { logIn } = useAuth();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) return;
    logIn();
  };

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.subhead}>
            Welcome back. Sign in to continue your path to calm.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <Text style={styles.cardTitle}>Log in</Text>
          <Text style={styles.cardSubtitle}>
            Pick up your chats, explore resources, and continue your path to calm.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Your name here"
              placeholderTextColor={PLACEHOLDER}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={PLACEHOLDER}
                secureTextEntry={secureEntry}
                style={styles.passwordInput}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setSecureEntry(prev => !prev)}
                style={styles.toggle}
              >
                <Text style={styles.toggleText}>
                  {secureEntry ? "Show" : "Hide"}
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={styles.loginBtn}
            onPress={handleLogin}
            accessibilityRole="button"
          >
            <Text style={styles.loginBtnText}>Log in</Text>
          </Pressable>

          <Pressable accessibilityRole="button" style={{ alignSelf: "center" }}>
            <Text style={styles.linkText}>Forgot your password?</Text>
          </Pressable>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New here?</Text>
          <Pressable accessibilityRole="button">
            <Text style={styles.footerLink}>Create an account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  subhead: {
    fontSize: 14,
    color: "#6b7280",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    marginBottom: 28,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardAccent: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: GREEN_MAIN,
    alignSelf: "center",
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: GREEN_TEXT,
    textAlign: "center",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1f2937",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN_LIGHT,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    paddingRight: 4,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1f2937",
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: GREEN_TEXT,
  },
  loginBtn: {
    backgroundColor: GREEN_MAIN,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  loginBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  linkText: {
    color: GREEN_MAIN,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: "#6b7280",
  },
  footerLink: {
    fontSize: 13,
    color: GREEN_TEXT,
    fontWeight: "700",
  },
});
