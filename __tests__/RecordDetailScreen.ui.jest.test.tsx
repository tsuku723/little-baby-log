import React from "react";
import renderer, { act } from "react-test-renderer";

let mockActiveUser: any = null;
let mockStore: any = {};

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
  FontAwesome6: () => null,
}));

jest.mock("@/components/AgeBadge", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ label }: any) => React.createElement(Text, null, label),
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

jest.mock("@/state/AppStateContext", () => ({
  useActiveUser: () => mockActiveUser,
}));

jest.mock("@/state/AchievementsContext", () => ({
  useAchievements: () => ({ store: mockStore }),
}));

jest.mock("@/utils/photo", () => ({
  ensureFileExistsAsync: jest.fn().mockResolvedValue(null),
}));

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
};

describe("RecordDetailScreen UI (TS-UI-006)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore = {};
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

  test("record=null: 記録が見つかりませんを表示", async () => {
    mockStore = {};
    const route = {
      params: { recordId: "nonexistent", isoDate: "2024-06-01", from: "today" },
    };
    const RecordDetailScreen =
      require("../src/screens/RecordDetailScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(RecordDetailScreen, {
          navigation: mockNavigation,
          route,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("記録が見つかりません");
  });

  test("from=list のとき「戻る」ボタンを表示", async () => {
    mockStore = {};
    const route = {
      params: { recordId: "nonexistent", isoDate: "2024-06-01", from: "list" },
    };
    const RecordDetailScreen =
      require("../src/screens/RecordDetailScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(RecordDetailScreen, {
          navigation: mockNavigation,
          route,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("戻る");
  });

  test("record あり: 記録詳細を表示", async () => {
    mockStore = {
      "2024-06-01": [
        {
          id: "r1",
          date: "2024-06-01",
          title: "初めての寝返り",
          memo: "とても嬉しかった",
          createdAt: "2024-06-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
        },
      ],
    };
    const route = {
      params: { recordId: "r1", isoDate: "2024-06-01", from: "today" },
    };
    const RecordDetailScreen =
      require("../src/screens/RecordDetailScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(RecordDetailScreen, {
          navigation: mockNavigation,
          route,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("初めての寝返り");
    expect(json).toContain("とても嬉しかった");
    expect(json).toContain("編集");
  });

  test("record=null かつ from=list: 戻るボタンでgoBackが呼ばれる", async () => {
    mockStore = {};
    const route = {
      params: { recordId: "nonexistent", isoDate: "2024-06-01", from: "list" },
    };
    const RecordDetailScreen =
      require("../src/screens/RecordDetailScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(RecordDetailScreen, {
          navigation: mockNavigation,
          route,
        })
      );
    });
    const backButton = tree.root.findAll(
      (node: any) => node.props.accessibilityRole === "button"
    )[0];
    await act(async () => {
      backButton.props.onPress();
    });
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  test("ヘッダーの戻るボタンでgoBackが呼ばれる", async () => {
    mockStore = {
      "2024-06-01": [
        {
          id: "r1",
          date: "2024-06-01",
          title: "初めての寝返り",
          memo: "",
          createdAt: "2024-06-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
        },
      ],
    };
    const route = {
      params: { recordId: "r1", isoDate: "2024-06-01", from: "today" },
    };
    const RecordDetailScreen =
      require("../src/screens/RecordDetailScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(RecordDetailScreen, {
          navigation: mockNavigation,
          route,
        })
      );
    });
    const backButton = tree.root.findByProps({ accessibilityLabel: "戻る" });
    await act(async () => {
      backButton.props.onPress();
    });
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  test("ヘッダーの編集ボタンでRecordInput画面へ遷移する", async () => {
    mockStore = {
      "2024-06-01": [
        {
          id: "r1",
          date: "2024-06-01",
          title: "初めての寝返り",
          memo: "",
          createdAt: "2024-06-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
        },
      ],
    };
    const route = {
      params: { recordId: "r1", isoDate: "2024-06-01", from: "today" },
    };
    const RecordDetailScreen =
      require("../src/screens/RecordDetailScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(RecordDetailScreen, {
          navigation: mockNavigation,
          route,
        })
      );
    });
    const editButton = tree.root.findByProps({ accessibilityLabel: "編集" });
    await act(async () => {
      editButton.props.onPress();
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith("RecordInput", {
      recordId: "r1",
      isoDate: "2024-06-01",
      from: "today",
    });
  });

  test("日付タップでToday画面へ遷移する", async () => {
    mockStore = {
      "2024-06-01": [
        {
          id: "r1",
          date: "2024-06-01",
          title: "初めての寝返り",
          memo: "",
          createdAt: "2024-06-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
        },
      ],
    };
    const route = {
      params: { recordId: "r1", isoDate: "2024-06-01", from: "today" },
    };
    const RecordDetailScreen =
      require("../src/screens/RecordDetailScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(RecordDetailScreen, {
          navigation: mockNavigation,
          route,
        })
      );
    });
    const dateButton = tree.root.findByProps({
      accessibilityLabel: "その日の記録をエクスポート",
    });
    await act(async () => {
      dateButton.props.onPress();
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith("MainTabs", {
      screen: "CalendarStack",
      params: { screen: "Today", params: { isoDate: "2024-06-01" } },
    });
  });

  test("user.name なし: ヘッダーが「記録」になる", async () => {
    mockActiveUser = null;
    mockStore = {
      "2024-06-01": [
        {
          id: "r1",
          date: "2024-06-01",
          title: "テスト",
          memo: "",
          createdAt: "2024-06-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
        },
      ],
    };
    const route = {
      params: { recordId: "r1", isoDate: "2024-06-01", from: "today" },
    };
    const RecordDetailScreen =
      require("../src/screens/RecordDetailScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(RecordDetailScreen, {
          navigation: mockNavigation,
          route,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    // user?.name が null なのでヘッダーは "記録" になる
    expect(json).toContain("記録");
  });
});
