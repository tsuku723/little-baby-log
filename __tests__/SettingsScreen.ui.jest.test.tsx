import React from "react";
import renderer, { act } from "react-test-renderer";

const mockSetActiveUser = jest.fn().mockResolvedValue(undefined);
const mockRestoreState = jest.fn().mockResolvedValue(undefined);
let mockAppState: any = {
  users: [],
  activeUserId: null,
  achievements: {},
  growthRecords: {},
};

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

jest.mock("@/state/AppStateContext", () => ({
  useAppState: () => ({
    state: mockAppState,
    setActiveUser: mockSetActiveUser,
    restoreState: mockRestoreState,
  }),
}));

const mockCreateBackup = jest.fn();
jest.mock("@/services/backupService", () => ({
  createBackup: (...args: any[]) => mockCreateBackup(...args),
}));

const mockShareAsync = jest.fn().mockResolvedValue(undefined);
jest.mock("expo-sharing", () => ({
  shareAsync: (...args: any[]) => mockShareAsync(...args),
}));

const mockNavigation = { navigate: jest.fn() };
const mockRoute = { params: {} };

describe("SettingsScreen UI (TS-UI-008)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppState = {
      users: [],
      activeUserId: null,
      achievements: {},
      growthRecords: {},
    };
  });

  test("users なし: ベビーを選択セクションを表示", async () => {
    const SettingsScreen = require("../src/screens/SettingsScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(SettingsScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("ベビーを選択");
  });

  test("users あり: ユーザー名を表示", async () => {
    mockAppState = {
      users: [
        {
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
        },
      ],
      activeUserId: "u1",
      achievements: {},
      growthRecords: {},
    };
    const SettingsScreen = require("../src/screens/SettingsScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(SettingsScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("テストちゃん");
    expect(json).toContain("2024-01-01");
  });

  test("アクティブユーザーに✓マークが表示される", async () => {
    mockAppState = {
      users: [
        {
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
        },
      ],
      activeUserId: "u1",
      achievements: {},
      growthRecords: {},
    };
    const SettingsScreen = require("../src/screens/SettingsScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(SettingsScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("✓");
  });

  test("サポートメニューが表示される", async () => {
    const SettingsScreen = require("../src/screens/SettingsScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(SettingsScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("このアプリについて");
    expect(json).toContain("プライバシーポリシー");
    expect(json).toContain("利用規約");
  });

  test("バックアップを作成ボタンが表示される", async () => {
    const SettingsScreen = require("../src/screens/SettingsScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(SettingsScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("バックアップを作成");
  });

  test("バックアップボタン押下で createBackup が呼ばれる", async () => {
    mockCreateBackup.mockResolvedValue("file:///cache/backup.zip");
    const SettingsScreen = require("../src/screens/SettingsScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(SettingsScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const backupButton = tree.root.findByProps({ testID: "backup-button" });
    await act(async () => {
      await backupButton.props.onPress();
    });
    expect(mockCreateBackup).toHaveBeenCalledWith([], {}, {});
  });

  test("バックアップ処理中はボタンが disabled になる", async () => {
    mockCreateBackup.mockImplementation(() => new Promise(() => {}));
    const SettingsScreen = require("../src/screens/SettingsScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(SettingsScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const backupButton = tree.root.findByProps({ testID: "backup-button" });
    act(() => {
      backupButton.props.onPress();
    });
    await act(async () => {});
    const updatedButton = tree.root.findByProps({ testID: "backup-button" });
    expect(updatedButton.props.disabled).toBe(true);
  });

  test("バックアップ失敗時にエラーメッセージが表示される", async () => {
    mockCreateBackup.mockRejectedValue(new Error("保存に失敗しました"));
    const SettingsScreen = require("../src/screens/SettingsScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(SettingsScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const backupButton = tree.root.findByProps({ testID: "backup-button" });
    await act(async () => {
      await backupButton.props.onPress();
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("保存に失敗しました");
  });

  test("開発用: 全データを削除ボタンが表示される", async () => {
    const SettingsScreen = require("../src/screens/SettingsScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(SettingsScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("全データを削除（テスト用）");
  });

  test("開発用: 削除確認ダイアログで「削除する」を選ぶと restoreState が空データで呼ばれる", async () => {
    const alertSpy = jest
      .spyOn(require("react-native").Alert, "alert")
      .mockImplementation((_title, _message, buttons) => {
        const confirmButton = buttons?.find((b: any) => b.text === "削除する");
        confirmButton?.onPress?.();
      });
    const SettingsScreen = require("../src/screens/SettingsScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(SettingsScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const resetButton = tree.root.findByProps({ testID: "dev-reset-button" });
    await act(async () => {
      resetButton.props.onPress();
    });
    expect(mockRestoreState).toHaveBeenCalledWith([], {}, {});
    alertSpy.mockRestore();
  });
});
