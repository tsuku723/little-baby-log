import React from "react";

import {
  BottomTabBar,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import AdBanner from "@/components/AdBanner";

import { COLORS } from "@/constants/colors";
import AboutScreen from "@/screens/AboutScreen";
import AchievementListScreen from "@/screens/AchievementListScreen";
import ContactScreen from "@/screens/ContactScreen";
import OpenSourceLicensesScreen from "@/screens/OpenSourceLicensesScreen";
import PrivacyPolicyScreen from "@/screens/PrivacyPolicyScreen";
import ProfileEditScreen from "@/screens/ProfileEditScreen";
import ProfileManagerScreen from "@/screens/ProfileManagerScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import TermsScreen from "@/screens/TermsScreen";
import TodayScreen from "@/screens/TodayScreen";
import CalendarScreen from "@/screens/CalendarScreen";
import {
  CalendarStackParamList,
  RecordListStackParamList,
  SettingsStackParamList,
  TabParamList,
} from "./types";

const Tab = createBottomTabNavigator<TabParamList>();
const CalendarStack = createNativeStackNavigator<CalendarStackParamList>();
const RecordListStack = createNativeStackNavigator<RecordListStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const CalendarStackNavigator: React.FC = () => (
  <CalendarStack.Navigator
    initialRouteName="Calendar"
    screenOptions={{ headerShown: false }}
  >
    <CalendarStack.Screen name="Calendar" component={CalendarScreen} />
    <CalendarStack.Screen name="Today" component={TodayScreen} />
  </CalendarStack.Navigator>
);

const RecordListStackNavigator: React.FC = () => (
  <RecordListStack.Navigator
    initialRouteName="AchievementList"
    screenOptions={{ headerShown: false }}
  >
    <RecordListStack.Screen
      name="AchievementList"
      component={AchievementListScreen}
    />
  </RecordListStack.Navigator>
);

const SettingsStackNavigator: React.FC = () => (
  <SettingsStack.Navigator
    initialRouteName="Settings"
    screenOptions={{
      headerShown: false,
      headerStyle: {
        backgroundColor: COLORS.headerBackground,
      },
      headerShadowVisible: false,
      headerTintColor: COLORS.textPrimary,
      headerTitleStyle: {
        color: COLORS.textPrimary,
      },
      headerBackButtonDisplayMode: "minimal",
      contentStyle: {
        backgroundColor: COLORS.background,
      },
    }}
  >
    <SettingsStack.Screen name="Settings" component={SettingsScreen} />
    <SettingsStack.Screen name="ProfileEdit" component={ProfileEditScreen} />
    <SettingsStack.Screen
      name="ProfileManager"
      component={ProfileManagerScreen}
    />
    <SettingsStack.Screen name="About" component={AboutScreen} />
    <SettingsStack.Screen
      name="PrivacyPolicy"
      component={PrivacyPolicyScreen}
    />
    <SettingsStack.Screen name="Terms" component={TermsScreen} />
    <SettingsStack.Screen
      name="OpenSourceLicenses"
      component={OpenSourceLicensesScreen}
    />
    <SettingsStack.Screen name="Contact" component={ContactScreen} />
  </SettingsStack.Navigator>
);

const TabNavigator: React.FC = () => {
  return (
    // タブは全画面共通。Phase 1 では仮のラベルのみで機能は画面切替だけ。
    <Tab.Navigator
      initialRouteName="CalendarStack"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bottomBackground,
          borderTopColor: COLORS.bottomBackground,
        },
        tabBarActiveTintColor: COLORS.accentMain,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: { fontSize: 12 },
      }}
      tabBar={(props) => (
        <View>
          <AdBanner />
          <BottomTabBar {...props} />
        </View>
      )}
    >
      <Tab.Screen
        name="CalendarStack"
        component={CalendarStackNavigator}
        options={{
          tabBarLabel: "カレンダー",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              e.preventDefault();
              navigation.navigate(route.name, { screen: "Calendar" });
            }
          },
        })}
      />
      <Tab.Screen
        name="RecordListStack"
        component={RecordListStackNavigator}
        options={{
          tabBarLabel: "記録一覧",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsStack"
        component={SettingsStackNavigator}
        options={{
          tabBarLabel: "設定",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
