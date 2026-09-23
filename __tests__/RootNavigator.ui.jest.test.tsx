import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { render, fireEvent } from "@testing-library/react-native";

import RootNavigator from "@/navigation/RootNavigator";

jest.mock("@/navigation/TabNavigator", () => (props: any) => {
  const React = require("react");
  const { View, Text, TouchableOpacity } = require("react-native");
  const { navigation } = props;
  return React.createElement(
    View,
    null,
    React.createElement(Text, null, "MainTabsMock"),
    React.createElement(TouchableOpacity, {
      testID: "goto-record-input",
      onPress: () => navigation.navigate("RecordInput"),
    }),
    React.createElement(TouchableOpacity, {
      testID: "goto-record-detail",
      onPress: () =>
        navigation.navigate("RecordDetail", {
          recordId: "r1",
          from: "today",
        }),
    }),
    React.createElement(TouchableOpacity, {
      testID: "goto-growth-record-input",
      onPress: () => navigation.navigate("GrowthRecordInput"),
    })
  );
});
jest.mock("@/screens/RecordInputScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, "RecordInputScreenMock");
});
jest.mock("@/screens/RecordDetailScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, "RecordDetailScreenMock");
});
jest.mock("@/screens/GrowthRecordInputScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, "GrowthRecordInputScreenMock");
});

const renderRootNavigator = () =>
  render(
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );

describe("RootNavigator", () => {
  test("初期表示はMainTabs", () => {
    const { getByText } = renderRootNavigator();
    expect(getByText("MainTabsMock")).toBeTruthy();
  });

  test("RecordInputへ遷移できる", () => {
    const { getByTestId, getByText } = renderRootNavigator();
    fireEvent.press(getByTestId("goto-record-input"));
    expect(getByText("RecordInputScreenMock")).toBeTruthy();
  });

  test("RecordDetailへ遷移できる", () => {
    const { getByTestId, getByText } = renderRootNavigator();
    fireEvent.press(getByTestId("goto-record-detail"));
    expect(getByText("RecordDetailScreenMock")).toBeTruthy();
  });

  test("GrowthRecordInputへ遷移できる", () => {
    const { getByTestId, getByText } = renderRootNavigator();
    fireEvent.press(getByTestId("goto-growth-record-input"));
    expect(getByText("GrowthRecordInputScreenMock")).toBeTruthy();
  });
});
