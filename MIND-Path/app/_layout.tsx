import { Stack } from "expo-router";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";
import { ModelProvider } from "@/context/ModelContext";
import { TokenizerProvider } from "@/context/TokenizerContext";

import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <TokenizerProvider>
        <ModelProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </ModelProvider>
      </TokenizerProvider>
    </AuthProvider>
  );
}
