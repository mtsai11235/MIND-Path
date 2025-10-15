import { View, Text } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'

const _layout = () => {
  return (
    <Tabs>
        <Tabs.Screen 
            name = "index"
            options = {{
                title: 'Home',
                headerShown: false,
                tabBarIcon: ({ color, size, focused }) => (
                <Text style={{ fontSize: size }}>🏠</Text>
        ),
            }}
        />
        <Tabs.Screen 
            name = "chat"
            options = {{
                title: 'Chat',
                headerShown: false,
                tabBarIcon: ({ color, size, focused }) => (
                <Text style={{ fontSize: size }}>💬</Text>
        ),
            }}

        />
        <Tabs.Screen 
            name = "profile"
            options = {{
                title: 'Profile',
                headerShown: false,
                tabBarIcon: ({ color, size, focused }) => (
                <Text style={{ fontSize: size }}>👤</Text>
        ),
            }}
        />
        <Tabs.Screen 
            name = "resources"
            options = {{
                title: 'Resources',
                headerShown: false,
                tabBarIcon: ({ color, size, focused }) => (
                <Text style={{ fontSize: size }}>📚</Text>
        ),
            }}
        />
    </Tabs>
  )
}

export default _layout