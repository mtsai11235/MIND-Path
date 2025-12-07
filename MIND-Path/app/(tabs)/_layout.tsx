import React from "react";
import { Text, Image } from "react-native";
import { Tabs } from "expo-router";

const homeImg       = require("../../assets/images/home.png");
const chatImg       = require("../../assets/images/chat.png");
const resourcesImg  = require("../../assets/images/resources.png");
const profileImg    = require("../../assets/images/profile.png");

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ size }) => (
            <Image
              source={homeImg}
              style={{ width: size + 25, height: size + 25, resizeMode: "contain" }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          headerShown: false,
          tabBarIcon: ({ size }) => (
            <Image
              source={chatImg}
              style={{ width: size + 18, height: size + 18, resizeMode: "contain" }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          title: "Resources",
          headerShown: false,
          tabBarIcon: ({ size }) => (
            <Image
              source={resourcesImg}
              style={{ width: size + 20, height: size + 20, resizeMode: "contain" }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ size }) => (
            <Image
              source={profileImg}
              style={{ width: size + 18, height: size + 18, resizeMode: "contain" }}
            />
          ),
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

      <Tabs.Screen name="resourcesContent"  options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="resourcesProvider" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
