import { Stack } from "expo-router";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

import { SafeAreaProvider } from "react-native-safe-area-context";
export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
