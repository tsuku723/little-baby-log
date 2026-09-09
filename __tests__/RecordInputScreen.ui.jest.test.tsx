import React from "react";
import renderer, { act } from "react-test-renderer";

let mockActiveUser: any = null;
let mockStore: any = {};

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
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

jest.mock("@/components/DatePickerModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/PhotoCropModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/state/AppStateContext", () => ({
  useActiveUser: () => mockActiveUser,
}));

jest.mock("@/state/AchievementsContext", () => ({
  useAchievements: () => ({
    store: mockStore,
    upsert: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Date インスタンスを安定させる（毎回 new Date() すると useEffect の依存が毎レンダーで変わりOOMになる）
jest.mock("@/state/DateViewContext", () => {
  const stableDate = new Date("2024-06-01");
  return {
    useDateViewContext: () => ({ selectedDate: stableDate }),
  };
});

jest.mock("@/utils/photo", () => ({
  ensureFileExistsAsync: jest.fn().mockResolvedValue(null),
  pickPhotoAsync: jest.fn().mockResolvedValue(null),
  saveCroppedPhotoAsync: jest.fn().mockResolvedValue(null),
  deleteIfExistsAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};
const mockRoute = { params: {} };

describe("RecordInputScreen UI (TS-UI-005)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore = {};
  });

  test("user=null: プロフィールを作成してくださいを表示", async () => {
    mockActiveUser = null;
    const RecordInputScreen =
      require("../src/screens/RecordInputScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(RecordInputScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("プロフィールを作成してください");
  });

  test("user=null: 設定へボタンでプロフィール管理画面へ遷移する", async () => {
    mockActiveUser = null;
    const RecordInputScreen =
      require("../src/screens/RecordInputScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(RecordInputScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const button = tree.root.findByProps({ testID: "empty-settings-button" });
    await act(async () => {
      button.props.onPress();
    });
    // RecordInput は RootStack 直下のため、MainTabs 経由でネスト指定しないと遷移しない
    expect(mockNavigation.navigate).toHaveBeenCalledWith("MainTabs", {
      screen: "SettingsStack",
      params: { screen: "ProfileManager" },
    });
  });

  test("新規記録モード: フォームと保存ボタンを表示", async () => {
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
    mockStore = {};
    const RecordInputScreen =
      require("../src/screens/RecordInputScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(RecordInputScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("記録する");
    expect(json).toContain("保存");
    // 削除ボタンは表示されない
    expect(json).not.toContain("この記録を削除");
  });

  test("編集モード: 既存レコードがあれば削除ボタンを表示", async () => {
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
    mockStore = {
      "2024-06-01": [
        {
          id: "r1",
          date: "2024-06-01",
          title: "テスト記録",
          memo: "",
          createdAt: "2024-06-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
        },
      ],
    };
    const editRoute = {
      params: { recordId: "r1", isoDate: "2024-06-01", from: "today" },
    };
    const RecordInputScreen =
      require("../src/screens/RecordInputScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(RecordInputScreen, {
          navigation: mockNavigation,
          route: editRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("この記録を削除");
    // タイトルが初期値として入っていること
    expect(json).toContain("テスト記録");
  });
});
