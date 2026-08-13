import React from "react";
import renderer, { act } from "react-test-renderer";

const mockRegisterRootComponent = jest.fn();
const mockUseFonts = jest.fn();
const mockLegalText = jest.fn(({ text }) =>
  React.createElement("LegalTextScreen", { text })
);
const mockNavigationContainer = jest.fn(({ children, theme }) =>
  React.createElement("NavigationContainer", { theme }, children)
);
const mockDateViewProvider = jest.fn(({ children }) =>
  React.createElement("DateViewProvider", null, children)
);
const mockRootNavigator = jest.fn(() => React.createElement("RootNavigator"));
const mockAppStateProvider = jest.fn(({ children }) =>
  React.createElement("AppStateProvider", null, children)
);
const mockAchievementsProvider = jest.fn(({ children }) =>
  React.createElement("AchievementsProvider", null, children)
);

jest.mock("expo", () => ({
  registerRootComponent: (...args: any[]) => mockRegisterRootComponent(...args),
}));

jest.mock("@expo-google-fonts/zen-maru-gothic", () => ({
  useFonts: (...args: any[]) => mockUseFonts(...args),
  ZenMaruGothic_400Regular: "font-400",
  ZenMaruGothic_500Medium: "font-500",
}));

jest.mock("@/screens/LegalTextScreen", () => ({
  __esModule: true,
  default: (props: any) => mockLegalText(props),
}));

jest.mock("@react-navigation/native", () => ({
  NavigationContainer: (props: any) => mockNavigationContainer(props),
  DefaultTheme: {
    colors: {
      background: "bg-default",
      text: "text-default",
      card: "card-default",
    },
  },
}));

jest.mock("@/state/DateViewContext", () => ({
  DateViewProvider: (props: any) => mockDateViewProvider(props),
}));

jest.mock("@/navigation/RootNavigator", () => ({
  __esModule: true,
  default: () => mockRootNavigator(),
}));

jest.mock("@/state/AppStateContext", () => ({
  AppStateProvider: (props: any) => mockAppStateProvider(props),
}));

jest.mock("@/state/AchievementsContext", () => ({
  AchievementsProvider: (props: any) => mockAchievementsProvider(props),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "1.2.3" } },
}));

describe("App / navigation / legal wrappers", () => {
  beforeEach(() => jest.clearAllMocks());

  test("src/App.tsx: fonts未ロード時はnull", () => {
    mockUseFonts.mockReturnValue([false]);
    const App = require("../src/App").default;
    let instance: ReturnType<typeof renderer.create>;
    act(() => {
      instance = renderer.create(React.createElement(App));
    });
    expect(instance!.toJSON()).toBeNull();
    act(() => {
      instance!.unmount();
    });
  });

  test("src/App.tsx: fontsロード後はProviderチェーンを描画", async () => {
    mockUseFonts.mockReturnValue([true]);
    const App = require("../src/App").default;
    let instance: ReturnType<typeof renderer.create>;
    await act(async () => {
      instance = renderer.create(React.createElement(App));
    });
    // isTrackingReady が false→true に変化するため初期描画+再描画の2回呼ばれる
    expect(mockAppStateProvider).toHaveBeenCalledTimes(2);
    expect(mockAchievementsProvider).toHaveBeenCalledTimes(2);
    expect(mockNavigationContainer).toHaveBeenCalledTimes(2);
    act(() => {
      instance!.unmount();
    });
  });

  test("index.ts: registerRootComponentを実行", () => {
    jest.isolateModules(() => {
      require("../index");
    });
    expect(mockRegisterRootComponent).toHaveBeenCalledTimes(1);
  });

  test("src/navigation/index.tsx: themeとProviderを適用", () => {
    const Navigator = require("../src/navigation/index").default;
    act(() => {
      renderer.create(React.createElement(Navigator));
    });
    const passedTheme = mockNavigationContainer.mock.calls[0][0].theme;
    expect(passedTheme.colors.background).toBe("#FFFDF7");
    expect(passedTheme.colors.text).toBe("#4A3F35");
    expect(mockDateViewProvider).toHaveBeenCalledTimes(1);
    expect(mockRootNavigator).toHaveBeenCalledTimes(1);
  });

  test("About/Terms/PrivacyPolicy screens pass correct text props", () => {
    const {
      getAboutTextJa,
      TERMS_TEXT_JA,
      PRIVACY_POLICY_TEXT_JA,
    } = require("../src/content/legal/ja");
    const AboutScreen = require("../src/screens/AboutScreen").default;
    const TermsScreen = require("../src/screens/TermsScreen").default;
    const PrivacyPolicyScreen =
      require("../src/screens/PrivacyPolicyScreen").default;

    act(() => {
      renderer.create(React.createElement(AboutScreen));
      renderer.create(React.createElement(TermsScreen));
      renderer.create(React.createElement(PrivacyPolicyScreen));
    });

    const passedTexts = mockLegalText.mock.calls.map(([props]) => props.text);
    expect(passedTexts).toEqual(
      expect.arrayContaining([
        getAboutTextJa("1.2.3"),
        TERMS_TEXT_JA,
        PRIVACY_POLICY_TEXT_JA,
      ])
    );
  });
});
