import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { render, fireEvent } from "@testing-library/react-native";

import TabNavigator from "@/navigation/TabNavigator";

jest.mock("@/components/AdBanner", () => () => {
  const React = require("react");
  const { Text: RNText } = require("react-native");
  return React.createElement(RNText, { testID: "ad-banner-mock" });
});

jest.mock("@/screens/CalendarScreen", () => (props: any) => {
  const React = require("react");
  const { TouchableOpacity, Text } = require("react-native");
  const { navigation } = props;
  return React.createElement(
    TouchableOpacity,
    {
      testID: "goto-today",
      onPress: () => navigation.navigate("Today", { isoDate: "2026-09-23" }),
    },
    React.createElement(Text, null, "CalendarScreenMock")
  );
});
jest.mock("@/screens/TodayScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, "TodayScreenMock");
});
jest.mock("@/screens/AchievementListScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, "AchievementListScreenMock");
});
jest.mock("@/screens/GrowthScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, "GrowthScreenMock");
});
jest.mock("@/screens/SettingsScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, "SettingsScreenMock");
});
jest.mock("@/screens/ProfileEditScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, "ProfileEditScreenMock");
});
jest.mock("@/screens/ProfileManagerScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, "ProfileManagerScreenMock");
});
jest.mock("@/screens/AboutScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, "AboutScreenMock");
});
jest.mock("@/screens/PrivacyPolicyScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, "PrivacyPolicyScreenMock");
});
jest.mock("@/screens/TermsScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, "TermsScreenMock");
});
jest.mock("@/screens/OpenSourceLicensesScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, "OpenSourceLicensesScreenMock");
});
jest.mock("@/screens/ContactScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, "ContactScreenMock");
});

const renderTabNavigator = () =>
  render(
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );

describe("TabNavigator", () => {
  test("4つのタブラベルとAdBannerを表示する", () => {
    const { getByText, getByTestId } = renderTabNavigator();
    expect(getByText("カレンダー")).toBeTruthy();
    expect(getByText("記録一覧")).toBeTruthy();
    expect(getByText("成長")).toBeTruthy();
    expect(getByText("設定")).toBeTruthy();
    expect(getByTestId("ad-banner-mock")).toBeTruthy();
  });

  test("初期表示はカレンダースタックのCalendar画面", () => {
    const { getByText } = renderTabNavigator();
    expect(getByText("CalendarScreenMock")).toBeTruthy();
  });

  test("記録一覧・成長・設定タブへ切り替えられる", () => {
    const { getByText } = renderTabNavigator();

    fireEvent.press(getByText("記録一覧"));
    expect(getByText("AchievementListScreenMock")).toBeTruthy();

    fireEvent.press(getByText("成長"));
    expect(getByText("GrowthScreenMock")).toBeTruthy();

    fireEvent.press(getByText("設定"));
    expect(getByText("SettingsScreenMock")).toBeTruthy();
  });

  test("カレンダースタック内でTodayへ遷移後、カレンダータブを再タップするとCalendarへ戻る", () => {
    const { getByText, getByTestId } = renderTabNavigator();

    fireEvent.press(getByTestId("goto-today"));
    expect(getByText("TodayScreenMock")).toBeTruthy();

    fireEvent.press(getByText("カレンダー"));
    expect(getByText("CalendarScreenMock")).toBeTruthy();
  });
});
