import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  NavigationContainer,
  DefaultTheme as NavDefaultTheme,
  DarkTheme as NavDarkTheme,
  Theme as NavTheme
} from "@react-navigation/native";
import DiscoverScreen from "../screens/DiscoverScreen";
import EventDetailsScreen from "../screens/EventDetailsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CommunityScreen from "../screens/CommunityScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { Ionicons } from "@expo/vector-icons";
import { useTheme as usePaperTheme } from "react-native-paper";

const Stack = createNativeStackNavigator();

function DiscoverStack() {
  return (
    <Stack.Navigator>
      {/* 👇 Hide the native header for Discover (removes the gray bar) */}
      <Stack.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{ title: "Event Details" }}
      />
    </Stack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const paperTheme = usePaperTheme();

  const navTheme: NavTheme = {
    dark: paperTheme.dark,
    colors: {
      ...(paperTheme.dark ? NavDarkTheme.colors : NavDefaultTheme.colors),
      primary: paperTheme.colors.primary,
      background: paperTheme.colors.background,
      card: paperTheme.colors.elevation.level2,
      text: paperTheme.colors.onSurface,
      border: paperTheme.colors.outline,
      notification: paperTheme.colors.primary
    },
    fonts: paperTheme.fonts
  } as unknown as NavTheme;

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        initialRouteName="DiscoverTab"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: paperTheme.colors.primary,
          tabBarInactiveTintColor: paperTheme.colors.onSurfaceDisabled,
          tabBarIcon: ({ color, size }) => {
            let icon: keyof typeof Ionicons.glyphMap = "home";
            if (route.name === "DiscoverTab") icon = "compass";
            if (route.name === "Profile") icon = "person";
            if (route.name === "Community") icon = "people";
            if (route.name === "Settings") icon = "settings";
            return <Ionicons name={icon} size={size} color={color} />;
          }
        })}
      >
        <Tab.Screen
          name="DiscoverTab"
          component={DiscoverStack}
          options={{ title: "Discover" }}
        />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "My Profile" }} />
        <Tab.Screen name="Community" component={CommunityScreen} options={{ title: "Friends" }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}