import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

let mockActiveUser: any = null;
let mockStore: any = {};
let mockLoading = false;

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

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

let mockPickerConfirmDate: Date | null = null;
jest.mock("@/components/DatePickerModal", () => {
  const React = require("react");
  const { TouchableOpacity, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ visible, value, onConfirm }: any) => {
      if (!visible) return null;
      return React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel: "日付を確定",
          onPress: () => onConfirm(mockPickerConfirmDate ?? value),
        },
        React.createElement(Text, null, "確定")
      );
    },
  };
});

jest.mock("@/state/AppStateContext", () => ({
  useActiveUser: () => mockActiveUser,
}));

jest.mock("@/state/AchievementsContext", () => ({
  useAchievements: () => ({ loading: mockLoading, store: mockStore }),
}));

const mockNavigation = { navigate: jest.fn() };
const mockRoute = { params: {} };

const renderScreen = () => {
  const AchievementListScreen =
    require("../src/screens/AchievementListScreen").default;
  return render(
    React.createElement(AchievementListScreen, {
      navigation: mockNavigation,
      route: mockRoute,
    })
  );
};

describe("AchievementListScreen UI (TS-UI-007)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore = {};
    mockLoading = false;
    mockPickerConfirmDate = null;
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
  });

  test("記録なし: まだ記録がありませんを表示", () => {
    const { queryByText } = renderScreen();
    expect(queryByText("まだ記録がありません")).not.toBeNull();
  });

  test("ローディング中: 読み込み中...を表示", () => {
    mockLoading = true;
    const { queryByText } = renderScreen();
    expect(queryByText("読み込み中...")).not.toBeNull();
  });

  test("記録あり: 記録タイトルを表示", () => {
    mockStore = {
      "2024-06-01": [
        {
          id: "r1",
          date: "2024-06-01",
          title: "初めてのつかまり立ち",
          memo: "",
          createdAt: "2024-06-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
        },
      ],
    };
    const { queryByText } = renderScreen();
    expect(queryByText("初めてのつかまり立ち")).not.toBeNull();
  });

  test("user=null: プロフィール未設定のヘッダーを表示", () => {
    mockActiveUser = null;
    const { queryByText } = renderScreen();
    expect(queryByText("プロフィール未設定")).not.toBeNull();
  });

  test("FABボタン（＋記録）が描画される", () => {
    const { queryByText } = renderScreen();
    expect(queryByText("＋記録")).not.toBeNull();
  });

  test("フリーワード検索: タイトルが一致するレコードのみ表示される", () => {
    mockStore = {
      "2024-06-01": [
        {
          id: "r1",
          date: "2024-06-01",
          title: "初めてのつかまり立ち",
          memo: "",
          createdAt: "2024-06-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
        },
        {
          id: "r2",
          date: "2024-06-02",
          title: "はじめての離乳食",
          memo: "",
          createdAt: "2024-06-02T00:00:00.000Z",
          updatedAt: "2024-06-02T00:00:00.000Z",
        },
      ],
    };
    const { getByLabelText, queryByText } = renderScreen();
    fireEvent.changeText(getByLabelText("フリーワード検索"), "つかまり立ち");
    expect(queryByText("初めてのつかまり立ち")).not.toBeNull();
    expect(queryByText("はじめての離乳食")).toBeNull();
  });

  test("フリーワード検索: メモが一致するレコードも表示される", () => {
    mockStore = {
      "2024-06-01": [
        {
          id: "r1",
          date: "2024-06-01",
          title: "お出かけ",
          memo: "公園で遊んだ",
          createdAt: "2024-06-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
        },
      ],
    };
    const { getByLabelText, queryByText } = renderScreen();
    fireEvent.changeText(getByLabelText("フリーワード検索"), "公園");
    expect(queryByText("お出かけ")).not.toBeNull();
  });

  test("絞り込みトグル押下でフィルターパネルの開閉が切り替わる", () => {
    const { getByLabelText, queryByText } = renderScreen();
    expect(queryByText("範囲クリア")).toBeNull();
    fireEvent.press(getByLabelText("絞り込みを切り替える"));
    expect(queryByText("範囲クリア")).not.toBeNull();
    fireEvent.press(getByLabelText("絞り込みを切り替える"));
    expect(queryByText("範囲クリア")).toBeNull();
  });

  test("期間フィルター非アクティブ時は絞り込みバッジが表示されない", () => {
    const { queryByLabelText } = renderScreen();
    expect(
      queryByLabelText("絞り込みを切り替える（期間で絞り込み中）")
    ).toBeNull();
  });

  test("期間フィルター（from/to）設定時、該当期間のレコードのみ表示される", () => {
    mockStore = {
      "2024-05-01": [
        {
          id: "r1",
          date: "2024-05-01",
          title: "範囲外レコード",
          memo: "",
          createdAt: "2024-05-01T00:00:00.000Z",
          updatedAt: "2024-05-01T00:00:00.000Z",
        },
      ],
      "2024-06-15": [
        {
          id: "r2",
          date: "2024-06-15",
          title: "範囲内レコード",
          memo: "",
          createdAt: "2024-06-15T00:00:00.000Z",
          updatedAt: "2024-06-15T00:00:00.000Z",
        },
      ],
    };
    const { getByLabelText, queryByText } = renderScreen();
    fireEvent.press(getByLabelText("絞り込みを切り替える"));

    mockPickerConfirmDate = new Date(2024, 5, 1); // 2024-06-01
    fireEvent.press(getByLabelText("開始日を選択"));
    fireEvent.press(getByLabelText("日付を確定"));

    expect(queryByText("範囲外レコード")).toBeNull();
    expect(queryByText("範囲内レコード")).not.toBeNull();
  });

  test("期間フィルターがアクティブな時のみ絞り込みバッジが表示される", () => {
    const { getByLabelText, queryByLabelText } = renderScreen();
    expect(
      queryByLabelText("絞り込みを切り替える（期間で絞り込み中）")
    ).toBeNull();

    fireEvent.press(getByLabelText("絞り込みを切り替える"));
    mockPickerConfirmDate = new Date(2024, 5, 1);
    fireEvent.press(getByLabelText("開始日を選択"));
    fireEvent.press(getByLabelText("日付を確定"));

    expect(
      queryByLabelText("絞り込みを切り替える（期間で絞り込み中）")
    ).not.toBeNull();
  });

  test("終了日（To）設定時も該当期間のレコードのみ表示される", () => {
    mockStore = {
      "2024-05-01": [
        {
          id: "r1",
          date: "2024-05-01",
          title: "範囲内レコード",
          memo: "",
          createdAt: "2024-05-01T00:00:00.000Z",
          updatedAt: "2024-05-01T00:00:00.000Z",
        },
      ],
      "2024-06-15": [
        {
          id: "r2",
          date: "2024-06-15",
          title: "範囲外レコード",
          memo: "",
          createdAt: "2024-06-15T00:00:00.000Z",
          updatedAt: "2024-06-15T00:00:00.000Z",
        },
      ],
    };
    const { getByLabelText, queryByText } = renderScreen();
    fireEvent.press(getByLabelText("絞り込みを切り替える"));

    mockPickerConfirmDate = new Date(2024, 4, 31); // 2024-05-31
    fireEvent.press(getByLabelText("終了日を選択"));
    fireEvent.press(getByLabelText("日付を確定"));

    expect(queryByText("範囲内レコード")).not.toBeNull();
    expect(queryByText("範囲外レコード")).toBeNull();
  });

  test("範囲クリアボタン押下でfrom/toがクリアされ絞り込みバッジが消える", () => {
    const { getByLabelText, queryByLabelText, getByText } = renderScreen();
    fireEvent.press(getByLabelText("絞り込みを切り替える"));

    mockPickerConfirmDate = new Date(2024, 5, 1);
    fireEvent.press(getByLabelText("開始日を選択"));
    fireEvent.press(getByLabelText("日付を確定"));
    expect(
      queryByLabelText("絞り込みを切り替える（期間で絞り込み中）")
    ).not.toBeNull();

    fireEvent.press(getByText("範囲クリア"));
    expect(
      queryByLabelText("絞り込みを切り替える（期間で絞り込み中）")
    ).toBeNull();
  });
});
