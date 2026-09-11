import React from "react";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import GrowthRecordInputScreen from "@/screens/GrowthRecordInputScreen";
import RecordDetailScreen from "@/screens/RecordDetailScreen";
import RecordInputScreen from "@/screens/RecordInputScreen";
import { RootStackParamList } from "./types";
import TabNavigator from "./TabNavigator";

const RootStack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  return (
    // RootStack は全体の画面遷移ハブ。Phase 1 の構成を保ちつつ記録詳細・入力を管理する。
    <RootStack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{ headerShown: false }}
    >
      <RootStack.Screen name="MainTabs" component={TabNavigator} />
      <RootStack.Screen name="RecordInput" component={RecordInputScreen} />
      <RootStack.Screen name="RecordDetail" component={RecordDetailScreen} />
      <RootStack.Screen
        name="GrowthRecordInput"
        component={GrowthRecordInputScreen}
      />
    </RootStack.Navigator>
  );
};

export default RootNavigator;
