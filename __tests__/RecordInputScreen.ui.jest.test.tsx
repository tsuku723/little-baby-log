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

const mockPickPhotoAsync = jest.fn().mockResolvedValue(null);
const mockSaveCroppedPhotoAsync = jest.fn().mockResolvedValue(null);
const mockDeleteIfExistsAsync = jest.fn().mockResolvedValue(undefined);

jest.mock("@/utils/photo", () => ({
  ensureFileExistsAsync: jest.fn().mockResolvedValue(null),
  pickPhotoAsync: mockPickPhotoAsync,
  saveCroppedPhotoAsync: mockSaveCroppedPhotoAsync,
  deleteIfExistsAsync: mockDeleteIfExistsAsync,
  resolvePhotoPath: (path: string) => path,
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
    mockPickPhotoAsync.mockResolvedValue({
      uri: "file://picked.jpg",
      width: 100,
      height: 100,
    });
    mockSaveCroppedPhotoAsync.mockResolvedValue("achievement-photos/new.jpg");
    mockDeleteIfExistsAsync.mockResolvedValue(undefined);
  });

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
});
