import {Tabs } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';

export default function RootLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="conversational-assessment-page" options={{ 
        headerShown: false, 
        title: "Conversational Assessment", 
        tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? "chatbubbles" : "chatbubbles-outline"} 
              size={size} 
              color={color}
            />)
      }} />
    </Tabs>
  );
}
