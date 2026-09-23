import React from "react";
import renderer, { act } from "react-test-renderer";
import { TouchableOpacity } from "react-native";

const findAncestorOfType = (instance: any, type: any): any => {
  let current = instance.parent;
  while (current) {
    if (current.type === type) return current;
    current = current.parent;
  }
  return null;
};

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
const mockValidateBackup = jest.fn().mockResolvedValue(undefined);
const mockRestoreBackup = jest.fn();
jest.mock("@/services/backupService", () => ({
  createBackup: (...args: any[]) => mockCreateBackup(...args),
  validateBackup: (...args: any[]) => mockValidateBackup(...args),
  restoreBackup: (...args: any[]) => mockRestoreBackup(...args),
  INVALID_FORMAT_ERROR: "未対応のバックアップ形式です",
}));

const mockShareAsync = jest.fn().mockResolvedValue(undefined);
jest.mock("expo-sharing", () => ({
  shareAsync: (...args: any[]) => mockShareAsync(...args),
}));

const mockGetDocumentAsync = jest.fn();
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: any[]) => mockGetDocumentAsync(...args),
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

  test("インポート: ファイル選択がキャンセルされた場合、validateBackup は呼ばれない", async () => {
    mockGetDocumentAsync.mockResolvedValue({ canceled: true });
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
    const importButton = tree.root.findByProps({ testID: "import-button" });
    await act(async () => {
      await importButton.props.onPress();
    });
    expect(mockValidateBackup).not.toHaveBeenCalled();
  });

  test("インポート: validateBackup が失敗した場合、エラーAlertが表示され restoreBackup は呼ばれない", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///cache/backup.zip" }],
    });
    mockValidateBackup.mockRejectedValue(
      new Error("未対応のバックアップ形式です")
    );
    const alertSpy = jest
      .spyOn(require("react-native").Alert, "alert")
      .mockImplementation(() => {});
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
    const importButton = tree.root.findByProps({ testID: "import-button" });
    await act(async () => {
      await importButton.props.onPress();
    });
    expect(alertSpy).toHaveBeenCalledWith(
      "エラー",
      "未対応のバックアップ形式です"
    );
    expect(mockRestoreBackup).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test("インポート: 確認ダイアログで「キャンセル」を選んだ場合、restoreBackup は呼ばれない", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///cache/backup.zip" }],
    });
    mockValidateBackup.mockResolvedValue(undefined);
    const alertSpy = jest
      .spyOn(require("react-native").Alert, "alert")
      .mockImplementation((_title, _message, buttons) => {
        const cancelButton = buttons?.find((b: any) => b.text === "キャンセル");
        cancelButton?.onPress?.();
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
    const importButton = tree.root.findByProps({ testID: "import-button" });
    await act(async () => {
      await importButton.props.onPress();
    });
    expect(mockRestoreBackup).not.toHaveBeenCalled();
    expect(mockRestoreState).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test("インポート: 確認ダイアログで「インポート」を選び復元が成功した場合、完了Alertが表示される", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///cache/backup.zip" }],
    });
    mockValidateBackup.mockResolvedValue(undefined);
    mockRestoreBackup.mockResolvedValue({
      profiles: [{ id: "u1" }],
      achievements: {},
      growthRecords: {},
    });
    const alertSpy = jest
      .spyOn(require("react-native").Alert, "alert")
      .mockImplementation((_title, _message, buttons) => {
        const importConfirmButton = buttons?.find(
          (b: any) => b.text === "インポート"
        );
        importConfirmButton?.onPress?.();
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
    const importButton = tree.root.findByProps({ testID: "import-button" });
    await act(async () => {
      await importButton.props.onPress();
    });
    expect(mockRestoreBackup).toHaveBeenCalledWith("file:///cache/backup.zip");
    expect(mockRestoreState).toHaveBeenCalledWith([{ id: "u1" }], {}, {});
    expect(alertSpy).toHaveBeenCalledWith(
      "完了",
      "バックアップからデータを復元しました"
    );
    alertSpy.mockRestore();
  });

  test("インポート: restoreBackup が例外を投げた場合、エラーAlertが表示される", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///cache/backup.zip" }],
    });
    mockValidateBackup.mockResolvedValue(undefined);
    mockRestoreBackup.mockRejectedValue(new Error("破損しています"));
    const alertSpy = jest
      .spyOn(require("react-native").Alert, "alert")
      .mockImplementation((_title, _message, buttons) => {
        const importConfirmButton = buttons?.find(
          (b: any) => b.text === "インポート"
        );
        importConfirmButton?.onPress?.();
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
    const importButton = tree.root.findByProps({ testID: "import-button" });
    await act(async () => {
      await importButton.props.onPress();
    });
    expect(alertSpy).toHaveBeenCalledWith(
      "エラー",
      "未対応のバックアップ形式です"
    );
    alertSpy.mockRestore();
  });

  test("子ども一覧から別の子どもをタップした場合、setActiveUser が呼ばれる", async () => {
    mockAppState = {
      users: [
        {
          id: "u1",
          name: "たろうくん",
          birthDate: "2024-01-01",
          dueDate: null,
          settings: {
            showCorrectedUntilMonths: 24,
            ageFormat: "ymd",
            showDaysSinceBirth: true,
            lastViewedMonth: null,
          },
        },
        {
          id: "u2",
          name: "はなこちゃん",
          birthDate: "2025-01-01",
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
    const targetText = tree.root.findByProps({ children: "はなこちゃん" });
    const targetRow = findAncestorOfType(targetText, TouchableOpacity);
    await act(async () => {
      await targetRow.props.onPress();
    });
    expect(mockSetActiveUser).toHaveBeenCalledWith("u2");
  });

  test("「＋ 子どもを追加・編集」タップで ProfileManager 画面へ遷移する", async () => {
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
    expect(json).toContain("＋ 子どもを追加・編集");
    const addButtonText = tree.root.findByProps({
      children: "＋ 子どもを追加・編集",
    });
    const addButton = findAncestorOfType(addButtonText, TouchableOpacity);
    await act(async () => {
      await addButton.props.onPress();
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith("ProfileManager");
  });
});
