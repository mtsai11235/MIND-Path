import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { initModel, sanitizeText } from '@/utils/modelUtils';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadModel() {
      console.log("Loading PHI detection model...");
      await initModel();  // 🔹 loads model into memory once
      console.log("Model loaded successfully");
      setReady(true);
    }
    loadModel();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading PHI model...</Text>
      </View>
    );
  }

  // Now you can use sanitizeText() anywhere in your app
  return (
    <View style={{ padding: 20 }}>
      <Text>{sanitizeText("Hi, I’m John Doe. My number is 555-123-4567.")}</Text>
    </View>
  );
}