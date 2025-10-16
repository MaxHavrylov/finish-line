import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import {
  NavigationContainer,
  DefaultTheme as NavDefaultTheme,
  DarkTheme as NavDarkTheme,
  Theme as NavTheme
} from "@react-navigation/native";
import DiscoverScreen from "../screens/DiscoverScreen";
import EventDetailsScreen from "../screens/EventDetailsScreen";
import ProviderDetailsScreen from "../screens/ProviderDetailsScreen";
import MyRacesScreen from "../screens/MyRacesScreen";
import CommunityScreen from "../screens/CommunityScreen";
import RunnerDetailsScreen from "../screens/RunnerDetailsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
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
      <Stack.Screen
        name="ProviderDetails"
        component={ProviderDetailsScreen}
        options={{ title: "Provider Details" }}
      />
    </Stack.Navigator>
  );
}

function CommunityStack() {
  const { t } = useTranslation('common');
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CommunityList"
        component={CommunityScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RunnerDetails"
        component={RunnerDetailsScreen}
        options={{ title: t('viewRunner') }}
      />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  const { t } = useTranslation('common');
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SettingsList"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t('notifications') }}
      />
    </Stack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const paperTheme = usePaperTheme();
  const { t } = useTranslation('common');

  // Helper function to create tab press listeners that reset to root screen
  const createTabPressListener = (tabName: string, rootScreenName: string) => ({
    navigation,
  }: {
    navigation: any;
  }) => ({
    tabPress: (e: any) => {
      e.preventDefault();
      
      // Always navigate to the root screen of the target tab
      // This ensures we always land on the root regardless of current state
      navigation.navigate(tabName, { screen: rootScreenName });
    }
  });

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
        detachInactiveScreens={true}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: paperTheme.colors.primary,
          tabBarInactiveTintColor: paperTheme.colors.onSurfaceDisabled,
          tabBarIcon: ({ color, size }) => {
            let icon: keyof typeof Ionicons.glyphMap = "home";
            if (route.name === "DiscoverTab") icon = "compass";
            if (route.name === "MyRaces") icon = "trophy";
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
          listeners={createTabPressListener('DiscoverTab', 'Discover')}
        />
        <Tab.Screen 
          name="MyRaces" 
          component={MyRacesScreen} 
          options={{ title: t('myRaces') }} 
        />
        <Tab.Screen 
          name="Community" 
          component={CommunityStack} 
          options={{ title: t('community') }}
          listeners={createTabPressListener('Community', 'CommunityList')}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsStack} 
          options={{ title: t('settings') }}
          listeners={createTabPressListener('Settings', 'SettingsList')}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}