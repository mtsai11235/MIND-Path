import React from "react"
import { View, Text } from 'react-native'
import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ size }) => <Text style={{ fontSize: size }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          headerShown: false,
          tabBarIcon: ({ size }) => <Text style={{ fontSize: size }}>💬</Text>,
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          title: "Resources",
          headerShown: false,
          tabBarIcon: ({ size }) => <Text style={{ fontSize: size }}>📚</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ size }) => <Text style={{ fontSize: size }}>👤</Text>,
        }}
      />
      <Tabs.Screen
        name="login"
        options={{
          href: null,
          headerShown: false,

        }}
      />
      <Tabs.Screen
        name="create-account"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
