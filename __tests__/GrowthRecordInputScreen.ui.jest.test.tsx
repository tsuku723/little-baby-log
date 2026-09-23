import React from "react";
import renderer, { act } from "react-test-renderer";
import { Alert, Platform } from "react-native";

let mockActiveUser: any = null;
let mockRecords: any[] = [];
const mockUpsert = jest.fn().mockResolvedValue(undefined);
const mockRemove = jest.fn().mockResolvedValue(undefined);

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

jest.mock("@/state/AppStateContext", () => ({
  useActiveUser: () => mockActiveUser,
}));

jest.mock("@/state/GrowthRecordsContext", () => ({
  useGrowthRecords: () => ({
    records: mockRecords,
    upsert: mockUpsert,
    remove: mockRemove,
  }),
}));

jest.mock("@/state/DateViewContext", () => {
  const stableDate = new Date("2024-06-01");
  return {
    useDateViewContext: () => ({ selectedDate: stableDate }),
  };
});

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};
const mockRoute = { params: {} };

jest.setTimeout(20000);

describe("GrowthRecordInputScreen UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecords = [];
    mockUpsert.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
    (Platform as any).OS = "ios";
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

  const extractText = (node: any): string =>
    (node.children ?? [])
      .map((child: any) =>
        typeof child === "string" ? child : extractText(child)
      )
      .join("");

  const findButtonByText = (root: any, text: string) =>
    root.findAll(
      (node: any) =>
        node.props.accessibilityRole === "button" &&
        extractText(node).includes(text)
    )[0];

  const findButtonByExactText = (root: any, text: string) =>
    root.findAll(
      (node: any) =>
        node.props.accessibilityRole === "button" && extractText(node) === text
    )[0];

  const renderScreen = async (route = mockRoute) => {
    const GrowthRecordInputScreen =
      require("../src/screens/GrowthRecordInputScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(GrowthRecordInputScreen, {
          navigation: mockNavigation,
          route,
        })
      );
    });
    return tree;
  };

  test("user=null: プロフィールを作成してくださいを表示", async () => {
    mockActiveUser = null;
    const tree = await renderScreen();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("プロフィールを作成してください");
  });

  test("user=null: 設定へボタンでプロフィール管理画面へ遷移する", async () => {
    mockActiveUser = null;
    const tree = await renderScreen();
    const button = tree.root.findByProps({ testID: "empty-settings-button" });
    await act(async () => {
      button.props.onPress();
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith("MainTabs", {
      screen: "SettingsStack",
      params: { screen: "ProfileManager" },
    });
  });

  test("キャンセルボタンでnavigation.goBackされる", async () => {
    mockActiveUser = activeUser;
    const tree = await renderScreen();
    await act(async () => {
      findButtonByText(tree.root, "キャンセル").props.onPress();
    });
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  test("新規記録モード: 削除ボタンは表示されない", async () => {
    mockActiveUser = activeUser;
    const tree = await renderScreen();
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain("この記録を削除");
  });

  test("編集モード: 既存レコードの値がテキスト入力欄に反映される（体重は常にkg表示）", async () => {
    mockActiveUser = activeUser;
    mockRecords = [
      {
        id: "r1",
        date: "2024-06-01",
        weightKg: 3.5,
        heightCm: 50.1,
        headCircumferenceCm: 33.2,
        chestCircumferenceCm: 32.3,
      },
    ];
    const editRoute = { params: { recordId: "r1" } };
    const tree = await renderScreen(editRoute);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("この記録を削除");

    const weightInput = tree.root.findByProps({ accessibilityLabel: "体重" });
    expect(weightInput.props.value).toBe("3.5");
    const heightInput = tree.root.findByProps({ accessibilityLabel: "身長" });
    expect(heightInput.props.value).toBe("50.1");
    const headInput = tree.root.findByProps({ accessibilityLabel: "頭囲" });
    expect(headInput.props.value).toBe("33.2");
    const chestInput = tree.root.findByProps({ accessibilityLabel: "胸囲" });
    expect(chestInput.props.value).toBe("32.3");
  });

  test("新規モード: route.params.isoDateがあればその日付が初期値になる", async () => {
    mockActiveUser = activeUser;
    const tree = await renderScreen({ params: { isoDate: "2024-03-10" } });
    expect(JSON.stringify(tree.toJSON())).toContain("2024-03-10");
  });

  test("日付ピッカーで選択した日付が反映される", async () => {
    mockActiveUser = activeUser;
    const tree = await renderScreen();
    await act(async () => {
      tree.root.findByProps({ testID: "date-confirm" }).props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain("2024-07-15");
  });

  test("「今日へ」ボタンで今日の日付になる", async () => {
    mockActiveUser = activeUser;
    const realDate = Date;
    const fixedNow = new realDate("2024-08-20T00:00:00.000Z");
    jest
      .spyOn(global, "Date")
      .mockImplementation((...args: any[]) =>
        args.length === 0 ? fixedNow : new (realDate as any)(...args)
      );

    const tree = await renderScreen();
    await act(async () => {
      findButtonByText(tree.root, "今日へ").props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain("2024-08-20");

    (global.Date as any).mockRestore();
  });

  test("不正な数値を入力すると対象項目名を含むアラートが出て保存しない", async () => {
    mockActiveUser = activeUser;
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const tree = await renderScreen();

    const weightInput = tree.root.findByProps({ accessibilityLabel: "体重" });
    await act(async () => {
      weightInput.props.onChangeText("abc");
    });

    await act(async () => {
      findButtonByText(tree.root, "保存").props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "入力値を確認してください",
      expect.stringContaining("体重")
    );
    expect(mockUpsert).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test("すべて未入力で保存すると「最低1つ入力」のアラートが出る", async () => {
    mockActiveUser = activeUser;
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const tree = await renderScreen();

    await act(async () => {
      findButtonByText(tree.root, "保存").props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "記録項目を入力してください",
      "体重・身長・頭囲・胸囲のうち、最低1つを入力してください。"
    );
    expect(mockUpsert).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test("体重の単位がgの場合、kgに変換してから保存される", async () => {
    mockActiveUser = activeUser;
    const tree = await renderScreen();

    await act(async () => {
      findButtonByExactText(tree.root, "g").props.onPress();
    });
    const weightInput = tree.root.findByProps({ accessibilityLabel: "体重" });
    await act(async () => {
      weightInput.props.onChangeText("3500");
    });

    await act(async () => {
      findButtonByText(tree.root, "保存").props.onPress();
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ weightKg: 3.5 })
    );
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  test("正常入力時にupsertが呼ばれ、navigation.goBackされる", async () => {
    mockActiveUser = activeUser;
    const tree = await renderScreen();

    const heightInput = tree.root.findByProps({ accessibilityLabel: "身長" });
    await act(async () => {
      heightInput.props.onChangeText("50");
    });

    await act(async () => {
      findButtonByText(tree.root, "保存").props.onPress();
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ heightCm: 50 })
    );
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  test("upsertが失敗した場合、エラーアラートが表示される", async () => {
    mockActiveUser = activeUser;
    mockUpsert.mockRejectedValueOnce(new Error("save failed"));
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const tree = await renderScreen();

    const heightInput = tree.root.findByProps({ accessibilityLabel: "身長" });
    await act(async () => {
      heightInput.props.onChangeText("50");
    });
    await act(async () => {
      findButtonByText(tree.root, "保存").props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "保存に失敗しました",
      "時間をおいて再度お試しください。"
    );
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    alertSpy.mockRestore();
  });

  test("編集モードのときのみ削除ボタンが表示される", async () => {
    mockActiveUser = activeUser;
    mockRecords = [{ id: "r1", date: "2024-06-01", weightKg: 3.5 }];
    const tree = await renderScreen({ params: { recordId: "r1" } });
    expect(JSON.stringify(tree.toJSON())).toContain("この記録を削除");
  });

  // テスト環境(jest-expo/node環境)には window が存在しないため、Web分岐のテストでは
  // 明示的に window オブジェクトを用意する（実行後は元の状態に戻す）。
  const withMockWindow = (
    confirmReturn: boolean
  ): { confirmSpy: jest.Mock; alertSpy: jest.Mock; restore: () => void } => {
    const originalWindow = (global as any).window;
    const confirmSpy = jest.fn().mockReturnValue(confirmReturn);
    const alertSpy = jest.fn();
    (global as any).window = { confirm: confirmSpy, alert: alertSpy };
    return {
      confirmSpy,
      alertSpy,
      restore: () => {
        (global as any).window = originalWindow;
      },
    };
  };

  test("Web: window.confirmでキャンセルすると削除されない", async () => {
    mockActiveUser = activeUser;
    mockRecords = [{ id: "r1", date: "2024-06-01", weightKg: 3.5 }];
    (Platform as any).OS = "web";
    const { restore } = withMockWindow(false);
    const tree = await renderScreen({ params: { recordId: "r1" } });

    await act(async () => {
      findButtonByText(tree.root, "この記録を削除").props.onPress();
    });

    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    restore();
  });

  test("Web: window.confirmでOKすると先にgoBackされremoveが呼ばれる", async () => {
    mockActiveUser = activeUser;
    mockRecords = [{ id: "r1", date: "2024-06-01", weightKg: 3.5 }];
    (Platform as any).OS = "web";
    const { restore } = withMockWindow(true);
    const tree = await renderScreen({ params: { recordId: "r1" } });

    await act(async () => {
      findButtonByText(tree.root, "この記録を削除").props.onPress();
    });

    expect(mockNavigation.goBack).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith("r1");
    restore();
  });

  test("Web: removeが失敗した場合、window.alertでエラー表示される", async () => {
    mockActiveUser = activeUser;
    mockRecords = [{ id: "r1", date: "2024-06-01", weightKg: 3.5 }];
    (Platform as any).OS = "web";
    const { alertSpy, restore } = withMockWindow(true);
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockRemove.mockRejectedValueOnce(new Error("remove failed"));
    const tree = await renderScreen({ params: { recordId: "r1" } });

    await act(async () => {
      findButtonByText(tree.root, "この記録を削除").props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "削除に失敗しました。時間をおいて再度お試しください。"
    );
    consoleErrorSpy.mockRestore();
    restore();
  });

  test("ネイティブ: Alert.alertでキャンセルすると削除されない", async () => {
    mockActiveUser = activeUser;
    mockRecords = [{ id: "r1", date: "2024-06-01", weightKg: 3.5 }];
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation((_title, _msg, buttons) => {
        const cancelButton = buttons?.find((b: any) => b.style === "cancel");
        cancelButton?.onPress?.();
      });
    const tree = await renderScreen({ params: { recordId: "r1" } });

    await act(async () => {
      findButtonByText(tree.root, "この記録を削除").props.onPress();
    });

    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test("ネイティブ: 削除確定で先にgoBackされremoveが呼ばれる", async () => {
    mockActiveUser = activeUser;
    mockRecords = [{ id: "r1", date: "2024-06-01", weightKg: 3.5 }];
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation((_title, _msg, buttons) => {
        const deleteButton = buttons?.find(
          (b: any) => b.style === "destructive"
        );
        deleteButton?.onPress?.();
      });
    const tree = await renderScreen({ params: { recordId: "r1" } });

    await act(async () => {
      findButtonByText(tree.root, "この記録を削除").props.onPress();
    });

    expect(mockNavigation.goBack).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith("r1");
    alertSpy.mockRestore();
  });

  test("ネイティブ: removeが失敗した場合、エラーアラートが表示される", async () => {
    mockActiveUser = activeUser;
    mockRecords = [{ id: "r1", date: "2024-06-01", weightKg: 3.5 }];
    mockRemove.mockRejectedValueOnce(new Error("remove failed"));
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const alertCalls: any[] = [];
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation((title, msg, buttons) => {
        alertCalls.push([title, msg]);
        const deleteButton = buttons?.find(
          (b: any) => b.style === "destructive"
        );
        deleteButton?.onPress?.();
      });
    const tree = await renderScreen({ params: { recordId: "r1" } });

    await act(async () => {
      findButtonByText(tree.root, "この記録を削除").props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      alertCalls.some(
        ([title, msg]) =>
          title === "削除に失敗しました" &&
          msg === "時間をおいて再度お試しください。"
      )
    ).toBe(true);
    consoleErrorSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
