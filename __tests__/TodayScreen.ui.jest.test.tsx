import React from "react";
import renderer, { act } from "react-test-renderer";

let mockActiveUser: any = null;
let mockByDay: any = {};
let mockAchievementsLoading = false;

jest.mock("expo-media-library", () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("react-native-view-shot", () => {
  const React = require("react");
  const { View } = require("react-native");
  const ViewShot = React.forwardRef((_props: any, _ref: any) =>
    React.createElement(View)
  );
  return { __esModule: true, default: ViewShot };
});

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/state/AppStateContext", () => ({
  useActiveUser: () => mockActiveUser,
}));

jest.mock("@/state/AchievementsContext", () => ({
  useAchievements: () => ({
    byDay: mockByDay,
    loading: mockAchievementsLoading,
  }),
}));

jest.mock("@/state/DateViewContext", () => ({
  useDateViewContext: () => ({
    selectedDate: new Date("2024-06-01"),
    selectDateFromCalendar: jest.fn(),
  }),
}));

jest.mock("@/utils/photo", () => ({
  ensureFileExistsAsync: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/components/AgeBadge", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/UserAvatar", () => ({
  __esModule: true,
  default: ({ name }: any) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, {}, `avatar:${name}`);
  },
}));

jest.mock("@/components/AppText", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ children, style }: any) =>
      React.createElement(Text, { style }, children),
  };
});

const mockStackNavigation = {
  popToTop: jest.fn(),
  getParent: jest.fn().mockReturnValue({ setOptions: jest.fn() }),
};
const mockRoute = { params: { isoDate: "2024-06-01" } };

describe("TodayScreen UI (TS-UI-004)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockByDay = {};
    mockAchievementsLoading = false;
    mockStackNavigation.getParent.mockReturnValue({ setOptions: jest.fn() });
  });

  test("user=null: プロフィールを作成してくださいを表示", async () => {
    mockActiveUser = null;
    const TodayScreen = require("../src/screens/TodayScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(TodayScreen, {
          navigation: mockStackNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("プロフィールを作成してください");
  });

  test("user あり・birthDate なし: 生年月日が未設定ですを表示", async () => {
    mockActiveUser = {
      id: "u1",
      name: "テストちゃん",
      birthDate: null,
      dueDate: null,
      settings: {
        showCorrectedUntilMonths: 24,
        ageFormat: "ymd",
        showDaysSinceBirth: true,
        lastViewedMonth: null,
      },
    };
    const TodayScreen = require("../src/screens/TodayScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(TodayScreen, {
          navigation: mockStackNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("生年月日が未設定です");
  });

  test("user あり・birthDate あり・記録なし: 今日の記録セクションを表示", async () => {
    mockActiveUser = {
      id: "u1",
      name: "テストちゃん",
      birthDate: "2024-01-01",
      dueDate: null,
      settings: {
        showCorrectedUntilMonths: 24,
        ageFormat: "ymd",
        showDaysSinceBirth: true,
        lastViewedMonth: null,
      },
    };
    mockByDay = {};
    const TodayScreen = require("../src/screens/TodayScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(TodayScreen, {
          navigation: mockStackNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("2024/06/01(土)の記録");
    expect(json).toContain("気づいたことがあれば記録しよう");
  });

  test("記録あり: 記録カードを表示", async () => {
    mockActiveUser = {
      id: "u1",
      name: "テストちゃん",
      birthDate: "2024-01-01",
      dueDate: null,
      settings: {
        showCorrectedUntilMonths: 24,
        ageFormat: "ymd",
        showDaysSinceBirth: false,
        lastViewedMonth: null,
      },
    };
    mockByDay = {
      "2024-06-01": [
        {
          id: "r1",
          date: "2024-06-01",
          title: "初めての笑顔",
          memo: "",
          createdAt: "2024-06-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
        },
      ],
    };
    const TodayScreen = require("../src/screens/TodayScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(TodayScreen, {
          navigation: mockStackNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("初めての笑顔");
  });

  test("user あり: UserAvatar が名前付きで描画される", async () => {
    mockActiveUser = {
      id: "u1",
      name: "テストちゃん",
      birthDate: "2024-01-01",
      dueDate: null,
      profilePhotoPath: "/path/to/photo.jpg",
      settings: {
        showCorrectedUntilMonths: 24,
        ageFormat: "ymd",
        showDaysSinceBirth: true,
        lastViewedMonth: null,
      },
    };
    const TodayScreen = require("../src/screens/TodayScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(TodayScreen, {
          navigation: mockStackNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("avatar:テストちゃん");
  });

  test("ローディング中: 読み込み中...を表示", async () => {
    mockActiveUser = {
      id: "u1",
      name: "テストちゃん",
      birthDate: "2024-01-01",
      dueDate: null,
      settings: {
        showCorrectedUntilMonths: 24,
        ageFormat: "ymd",
        showDaysSinceBirth: true,
        lastViewedMonth: null,
      },
    };
    mockByDay = {};
    mockAchievementsLoading = true;
    const TodayScreen = require("../src/screens/TodayScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(TodayScreen, {
          navigation: mockStackNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("読み込み中...");
  });
});
