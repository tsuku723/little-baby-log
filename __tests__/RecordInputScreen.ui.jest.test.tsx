import React from "react";
import renderer, { act } from "react-test-renderer";
import { Alert, Linking } from "react-native";

let mockActiveUser: any = null;
let mockStore: any = {};
const mockUpsert = jest.fn().mockResolvedValue(undefined);
const mockRemove = jest.fn().mockResolvedValue(undefined);

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

// SectionList(VirtualizedList) はレイアウト計測に依存し、テスト環境では
// renderItem が実際に呼ばれないため、候補選択の検証ができるよう同期描画に差し替える
jest.mock("react-native/Libraries/Lists/SectionList", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({
      sections,
      renderItem,
      renderSectionHeader,
      keyExtractor,
    }: any) =>
      React.createElement(
        View,
        null,
        sections.map((section: any) =>
          React.createElement(
            View,
            { key: section.name },
            renderSectionHeader ? renderSectionHeader({ section }) : null,
            section.data.map((item: any) =>
              React.createElement(
                React.Fragment,
                { key: keyExtractor ? keyExtractor(item) : item },
                renderItem({ item, section })
              )
            )
          )
        )
      ),
  };
});

jest.mock("@/components/AppText", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ children, style }: any) =>
      React.createElement(Text, { style }, children),
  };
});

jest.mock("@/components/DatePickerModal", () => {
  const React = require("react");
  const { View, TouchableOpacity, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ onConfirm, onCancel }: any) =>
      React.createElement(
        View,
        { testID: "date-picker-modal" },
        React.createElement(
          TouchableOpacity,
          {
            testID: "date-confirm",
            accessibilityRole: "button",
            onPress: () => onConfirm(new Date("2024-07-15")),
          },
          React.createElement(Text, null, "date-confirm")
        ),
        React.createElement(
          TouchableOpacity,
          {
            testID: "date-cancel",
            accessibilityRole: "button",
            onPress: onCancel,
          },
          React.createElement(Text, null, "date-cancel")
        )
      ),
  };
});

jest.mock("@/components/PhotoCropModal", () => {
  const React = require("react");
  const { View, TouchableOpacity, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ onConfirm, onCancel }: any) =>
      React.createElement(
        View,
        { testID: "photo-crop-modal" },
        React.createElement(
          TouchableOpacity,
          {
            testID: "crop-confirm",
            accessibilityRole: "button",
            onPress: () => onConfirm({ x: 0, y: 0, width: 10, height: 10 }),
          },
          React.createElement(Text, null, "crop-confirm")
        ),
        React.createElement(
          TouchableOpacity,
          {
            testID: "crop-cancel",
            accessibilityRole: "button",
            onPress: onCancel,
          },
          React.createElement(Text, null, "crop-cancel")
        )
      ),
  };
});

jest.mock("@/state/AppStateContext", () => ({
  useActiveUser: () => mockActiveUser,
}));

jest.mock("@/state/AchievementsContext", () => ({
  useAchievements: () => ({
    store: mockStore,
    upsert: mockUpsert,
    remove: mockRemove,
  }),
}));

// Date インスタンスを安定させる（毎回 new Date() すると useEffect の依存が毎レンダーで変わりOOMになる）
jest.mock("@/state/DateViewContext", () => {
  const stableDate = new Date("2024-06-01");
  return {
    useDateViewContext: () => ({ selectedDate: stableDate }),
  };
});

const mockPickPhotoAsync = jest.fn().mockResolvedValue(null);
const mockSaveCroppedPhotoAsync = jest.fn().mockResolvedValue(null);
const mockSaveDirectPhotoAsync = jest.fn().mockResolvedValue(null);
const mockDeleteIfExistsAsync = jest.fn().mockResolvedValue(undefined);
const mockEnsureFileExistsAsync = jest.fn().mockResolvedValue(null);

class MockPhotoPermissionDeniedError extends Error {
  constructor() {
    super("Photo permission denied");
    this.name = "PhotoPermissionDeniedError";
  }
}

jest.mock("@/utils/photo", () => ({
  ensureFileExistsAsync: mockEnsureFileExistsAsync,
  pickPhotoAsync: mockPickPhotoAsync,
  saveCroppedPhotoAsync: mockSaveCroppedPhotoAsync,
  saveDirectPhotoAsync: mockSaveDirectPhotoAsync,
  deleteIfExistsAsync: mockDeleteIfExistsAsync,
  resolvePhotoPath: (path: string) => path,
  PhotoPermissionDeniedError: MockPhotoPermissionDeniedError,
}));

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
};
const mockRoute = { params: {} };

// フルスイート実行時はJestワーカーの並列実行によるリソース競合で
// モジュール初回requireのオーバーヘッドが20000msを超えることがあるため延長
jest.setTimeout(30000);

describe("RecordInputScreen UI (TS-UI-005)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore = {};
    mockPickPhotoAsync.mockResolvedValue({
      uri: "file://picked.jpg",
      width: 100,
      height: 100,
    });
    mockSaveCroppedPhotoAsync.mockResolvedValue("achievement-photos/new.jpg");
    mockSaveDirectPhotoAsync.mockResolvedValue("achievement-photos/direct.jpg");
    mockDeleteIfExistsAsync.mockResolvedValue(undefined);
    mockEnsureFileExistsAsync.mockResolvedValue(null);
    mockUpsert.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
  });

  const activeUser = {
    id: "u1",
    name: "テストちゃん",
    birthDate: "2024-01-01",
    dueDate: null,
    settings: {
      showCorrectedUntilMonths: 24,
      ageFormat: "ymd" as const,
      showDaysSinceBirth: true,
      lastViewedMonth: null,
    },
  };

  const findButtonByText = (root: any, text: string) => {
    const extractText = (node: any): string =>
      (node.children ?? [])
        .map((child: any) =>
          typeof child === "string" ? child : extractText(child)
        )
        .join("");
    return root.findAll(
      (node: any) =>
        node.props.accessibilityRole === "button" &&
        extractText(node).includes(text)
    )[0];
  };

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

  test("新規記録で写真を追加すると保存のみ行われ、削除は呼ばれない", async () => {
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

    await act(async () => {
      findButtonByText(tree.root, "写真を追加").props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "crop-confirm" }).props.onPress();
    });

    expect(mockSaveCroppedPhotoAsync).toHaveBeenCalledWith(
      "file://picked.jpg",
      { x: 0, y: 0, width: 10, height: 10 }
    );
    expect(mockDeleteIfExistsAsync).not.toHaveBeenCalled();
  });

  test("写真を選び直すと、保存と直前の未保存写真の削除が両方行われる", async () => {
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

    mockSaveCroppedPhotoAsync.mockResolvedValueOnce(
      "achievement-photos/new1.jpg"
    );
    await act(async () => {
      findButtonByText(tree.root, "写真を追加").props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "crop-confirm" }).props.onPress();
    });
    expect(mockDeleteIfExistsAsync).not.toHaveBeenCalled();

    mockSaveCroppedPhotoAsync.mockResolvedValueOnce(
      "achievement-photos/new2.jpg"
    );
    await act(async () => {
      findButtonByText(tree.root, "写真を差し替える").props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "crop-confirm" }).props.onPress();
    });

    expect(mockSaveCroppedPhotoAsync).toHaveBeenCalledTimes(2);
    expect(mockDeleteIfExistsAsync).toHaveBeenCalledWith(
      "achievement-photos/new1.jpg"
    );
  });

  test("保存に失敗した場合、写真は更新されずエラーが表示される", async () => {
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
    mockSaveCroppedPhotoAsync.mockRejectedValueOnce(new Error("save failed"));
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
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

    await act(async () => {
      findButtonByText(tree.root, "写真を追加").props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "crop-confirm" }).props.onPress();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain("photo-crop-modal");
    consoleErrorSpy.mockRestore();
  });

  test("差し替えの保存に失敗した場合、旧一時ファイルは削除されない", async () => {
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
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
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

    mockSaveCroppedPhotoAsync.mockResolvedValueOnce(
      "achievement-photos/new1.jpg"
    );
    await act(async () => {
      findButtonByText(tree.root, "写真を追加").props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "crop-confirm" }).props.onPress();
    });

    mockSaveCroppedPhotoAsync.mockRejectedValueOnce(new Error("save failed"));
    await act(async () => {
      findButtonByText(tree.root, "写真を差し替える").props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "crop-confirm" }).props.onPress();
    });

    expect(mockDeleteIfExistsAsync).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain(
      "achievement-photos/new1.jpg"
    );
    consoleErrorSpy.mockRestore();
  });

  test("タイトル未入力のまま保存すると、保存はブロックされエラーが表示される", async () => {
    mockActiveUser = activeUser;
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
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

    await act(async () => {
      findButtonByText(tree.root, "保存").props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "タイトルを入力してください",
      "記録タイトルは必須です。"
    );
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test("タイトル候補シートから候補を選択すると、タイトル欄に反映される", async () => {
    mockActiveUser = activeUser;
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

    await act(async () => {
      findButtonByText(tree.root, "候補から選ぶ（任意）").props.onPress();
    });
    await act(async () => {
      findButtonByText(tree.root, "首がすわった").props.onPress();
    });

    const titleInput = tree.root.findByProps({
      accessibilityLabel: "タイトル（必須）",
    });
    expect(titleInput.props.value).toBe("首がすわった");
  });

  test("日付ピッカーで選択した日付が画面に反映される", async () => {
    mockActiveUser = activeUser;
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

    await act(async () => {
      tree.root.findByProps({ testID: "date-confirm" }).props.onPress();
    });

    expect(JSON.stringify(tree.toJSON())).toContain("2024-07-15");
  });

  test("正常入力時に保存処理が実行され、一覧へ戻る", async () => {
    mockActiveUser = activeUser;
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

    const titleInput = tree.root.findByProps({
      accessibilityLabel: "タイトル（必須）",
    });
    await act(async () => {
      titleInput.props.onChangeText("初めて笑った日");
    });

    await act(async () => {
      findButtonByText(tree.root, "保存").props.onPress();
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "初めて笑った日",
        date: "2024-06-01",
      })
    );
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  test("保存に失敗した場合、エラーAlertが表示され画面遷移しない", async () => {
    mockActiveUser = activeUser;
    mockUpsert.mockRejectedValueOnce(new Error("save failed"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
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

    const titleInput = tree.root.findByProps({
      accessibilityLabel: "タイトル（必須）",
    });
    await act(async () => {
      titleInput.props.onChangeText("初めて笑った日");
    });
    await act(async () => {
      findButtonByText(tree.root, "保存").props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "保存に失敗しました",
      "時間をおいて再度お試しください。"
    );
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    alertSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test("新規記録で写真を追加したまま保存すると、photoPathがペイロードに含まれる", async () => {
    mockActiveUser = activeUser;
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

    await act(async () => {
      findButtonByText(tree.root, "写真を追加").props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "crop-confirm" }).props.onPress();
    });

    const titleInput = tree.root.findByProps({
      accessibilityLabel: "タイトル（必須）",
    });
    await act(async () => {
      titleInput.props.onChangeText("写真つきの記録");
    });
    await act(async () => {
      findButtonByText(tree.root, "保存").props.onPress();
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ photoPath: "achievement-photos/new.jpg" })
    );
  });

  test("写真権限が拒否された場合、設定を開く導線を含むAlertが表示される", async () => {
    mockActiveUser = activeUser;
    mockPickPhotoAsync.mockRejectedValueOnce(
      new MockPhotoPermissionDeniedError()
    );
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const openSettingsSpy = jest
      .spyOn(Linking, "openSettings")
      .mockImplementation(() => Promise.resolve());
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

    await act(async () => {
      findButtonByText(tree.root, "写真を追加").props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "写真へのアクセスが許可されていません",
      "写真を追加するには、設定アプリでこのアプリの写真アクセスを許可してください。",
      expect.arrayContaining([expect.objectContaining({ text: "設定を開く" })])
    );

    const [, , buttons] = alertSpy.mock.calls[0];
    const openSettingsButton = (buttons as any[]).find(
      (b) => b.text === "設定を開く"
    );
    openSettingsButton.onPress();
    expect(openSettingsSpy).toHaveBeenCalled();

    alertSpy.mockRestore();
    openSettingsSpy.mockRestore();
  });

  test("写真選択で予期しないエラーが発生した場合、汎用エラーAlertが表示される", async () => {
    mockActiveUser = activeUser;
    mockPickPhotoAsync.mockRejectedValueOnce(new Error("unexpected"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
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

    await act(async () => {
      findButtonByText(tree.root, "写真を追加").props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "写真の追加に失敗しました",
      "再度お試しください。"
    );
    alertSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test("寸法が取得できない画像はトリミングをスキップして直接保存される", async () => {
    mockActiveUser = activeUser;
    mockPickPhotoAsync.mockResolvedValueOnce({
      uri: "file://picked-nodim.jpg",
      width: null,
      height: null,
    });
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

    await act(async () => {
      findButtonByText(tree.root, "写真を追加").props.onPress();
    });

    expect(mockSaveDirectPhotoAsync).toHaveBeenCalledWith(
      "file://picked-nodim.jpg"
    );
    expect(mockSaveCroppedPhotoAsync).not.toHaveBeenCalled();
    // トリミングモーダルは表示されない
    expect(JSON.stringify(tree.toJSON())).not.toContain("photo-crop-modal");
    expect(JSON.stringify(tree.toJSON())).toContain(
      "achievement-photos/direct.jpg"
    );
  });

  test("写真を外すと未保存の一時写真が破棄され、プレビューが消える", async () => {
    mockActiveUser = activeUser;
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

    await act(async () => {
      findButtonByText(tree.root, "写真を追加").props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "crop-confirm" }).props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain(
      "achievement-photos/new.jpg"
    );

    await act(async () => {
      findButtonByText(tree.root, "写真を外す").props.onPress();
    });

    expect(mockDeleteIfExistsAsync).toHaveBeenCalledWith(
      "achievement-photos/new.jpg"
    );
    expect(JSON.stringify(tree.toJSON())).not.toContain("写真を外す");
  });

  test("写真を外す際に削除が失敗しても警告ログのみで状態はクリアされる", async () => {
    mockActiveUser = activeUser;
    mockDeleteIfExistsAsync.mockRejectedValueOnce(new Error("delete failed"));
    const consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});
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

    await act(async () => {
      findButtonByText(tree.root, "写真を追加").props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "crop-confirm" }).props.onPress();
    });

    await act(async () => {
      findButtonByText(tree.root, "写真を外す").props.onPress();
    });

    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).not.toContain("写真を外す");
    consoleWarnSpy.mockRestore();
  });

  test("編集モードで既存写真を外して保存すると、photoPathがnullになる", async () => {
    mockActiveUser = activeUser;
    mockStore = {
      "2024-06-01": [
        {
          id: "r1",
          date: "2024-06-01",
          title: "テスト記録",
          memo: "",
          photoPath: "achievement-photos/existing.jpg",
          createdAt: "2024-06-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
        },
      ],
    };
    const editRoute = {
      params: { recordId: "r1", isoDate: "2024-06-01", from: "today" },
    };
    // 編集対象の写真が実ファイルとして存在する前提にする
    mockEnsureFileExistsAsync.mockResolvedValue(
      "achievement-photos/existing.jpg"
    );
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

    await act(async () => {
      findButtonByText(tree.root, "写真を外す").props.onPress();
    });
    await act(async () => {
      findButtonByText(tree.root, "保存").props.onPress();
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ photoPath: null })
    );
  });

  test("ヘッダーのキャンセルボタンでgoBackが呼ばれる", async () => {
    mockActiveUser = activeUser;
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

    await act(async () => {
      findButtonByText(tree.root, "キャンセル").props.onPress();
    });

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  test("日付ピッカーをキャンセルすると日付は変わらない", async () => {
    mockActiveUser = activeUser;
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

    await act(async () => {
      tree.root.findByProps({ testID: "date-cancel" }).props.onPress();
    });

    expect(JSON.stringify(tree.toJSON())).toContain("2024-06-01");
  });

  test("トリミングをキャンセルすると写真は追加されない", async () => {
    mockActiveUser = activeUser;
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

    await act(async () => {
      findButtonByText(tree.root, "写真を追加").props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "crop-cancel" }).props.onPress();
    });

    expect(mockSaveCroppedPhotoAsync).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).not.toContain("photo-crop-modal");
  });

  test("メモを入力すると残り文字数が更新される", async () => {
    mockActiveUser = activeUser;
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

    const memoInput = tree.root.findByProps({ accessibilityLabel: "メモ" });
    await act(async () => {
      memoInput.props.onChangeText("とても嬉しかった");
    });

    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("残り ");
    expect(json).toContain('"492"');
  });

  test("今日へボタンを押すと日付が今日になる", async () => {
    mockActiveUser = activeUser;
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

    await act(async () => {
      findButtonByText(tree.root, "今日へ").props.onPress();
    });

    const { toIsoDateString } = require("@/utils/dateUtils");
    expect(JSON.stringify(tree.toJSON())).toContain(
      toIsoDateString(new Date())
    );
  });

  describe("confirmDelete", () => {
    const editRoute = (from: string) => ({
      params: { recordId: "r1", isoDate: "2024-06-01", from },
    });

    beforeEach(() => {
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
    });

    test("キャンセルを選択すると削除されない", async () => {
      mockActiveUser = activeUser;
      const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const RecordInputScreen =
        require("../src/screens/RecordInputScreen").default;
      let tree: any;
      await act(async () => {
        tree = renderer.create(
          React.createElement(RecordInputScreen, {
            navigation: mockNavigation,
            route: editRoute("today"),
          })
        );
      });

      await act(async () => {
        findButtonByText(tree.root, "この記録を削除").props.onPress();
      });

      // Alert.alert のボタンを何も押さない = キャンセル相当
      expect(mockRemove).not.toHaveBeenCalled();
      expect(mockNavigation.replace).not.toHaveBeenCalled();
      alertSpy.mockRestore();
    });

    test("from=list のとき、削除実行でRecordListStackへ遷移しremoveが呼ばれる", async () => {
      mockActiveUser = activeUser;
      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((_title, _msg, buttons) => {
          const deleteButton = (buttons as any[])?.find(
            (b) => b.text === "削除"
          );
          deleteButton?.onPress?.();
        });
      const RecordInputScreen =
        require("../src/screens/RecordInputScreen").default;
      let tree: any;
      await act(async () => {
        tree = renderer.create(
          React.createElement(RecordInputScreen, {
            navigation: mockNavigation,
            route: editRoute("list"),
          })
        );
      });

      await act(async () => {
        findButtonByText(tree.root, "この記録を削除").props.onPress();
      });

      expect(mockNavigation.replace).toHaveBeenCalledWith("MainTabs", {
        screen: "RecordListStack",
      });
      expect(mockRemove).toHaveBeenCalledWith("r1", "2024-06-01");
      alertSpy.mockRestore();
    });

    test("from=list以外のとき、削除実行でCalendarStackへ遷移する", async () => {
      mockActiveUser = activeUser;
      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((_title, _msg, buttons) => {
          const deleteButton = (buttons as any[])?.find(
            (b) => b.text === "削除"
          );
          deleteButton?.onPress?.();
        });
      const RecordInputScreen =
        require("../src/screens/RecordInputScreen").default;
      let tree: any;
      await act(async () => {
        tree = renderer.create(
          React.createElement(RecordInputScreen, {
            navigation: mockNavigation,
            route: editRoute("today"),
          })
        );
      });

      await act(async () => {
        findButtonByText(tree.root, "この記録を削除").props.onPress();
      });

      expect(mockNavigation.replace).toHaveBeenCalledWith("MainTabs", {
        screen: "CalendarStack",
      });
      alertSpy.mockRestore();
    });

    test("削除に失敗した場合、エラーAlertが表示される", async () => {
      mockActiveUser = activeUser;
      mockRemove.mockRejectedValueOnce(new Error("delete failed"));
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((_title, _msg, buttons) => {
          const deleteButton = (buttons as any[])?.find(
            (b) => b.text === "削除"
          );
          deleteButton?.onPress?.();
        });
      const RecordInputScreen =
        require("../src/screens/RecordInputScreen").default;
      let tree: any;
      await act(async () => {
        tree = renderer.create(
          React.createElement(RecordInputScreen, {
            navigation: mockNavigation,
            route: editRoute("today"),
          })
        );
      });

      await act(async () => {
        findButtonByText(tree.root, "この記録を削除").props.onPress();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        "削除に失敗しました",
        "時間をおいて再度お試しください。"
      );
      alertSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
