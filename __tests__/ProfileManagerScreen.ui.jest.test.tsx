import React from "react";
import renderer, { act } from "react-test-renderer";

let mockAppState: any = { users: [], activeUserId: null };

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
  useAppState: () => ({ state: mockAppState }),
  MAX_PROFILES: 5,
}));

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  getParent: jest.fn().mockReturnValue({ setOptions: jest.fn() }),
};
const mockRoute = { params: {} };

describe("ProfileManagerScreen UI (TS-UI-010)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation.getParent.mockReturnValue({ setOptions: jest.fn() });
  });

  test("users なし: ガイドテキストと追加ボタンを表示", async () => {
    mockAppState = { users: [], activeUserId: null };
    const ProfileManagerScreen =
      require("../src/screens/ProfileManagerScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ProfileManagerScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("新しいこどもを追加");
    expect(json).toContain("編集したいこどもを選んでください");
  });

  test("users あり: ユーザーカードを表示", async () => {
    mockAppState = {
      users: [
        {
          id: "u1",
          name: "テストちゃん",
          birthDate: "2024-01-01",
          dueDate: "2024-02-15",
          settings: {
            showCorrectedUntilMonths: 24,
            ageFormat: "ymd",
            showDaysSinceBirth: true,
            lastViewedMonth: null,
          },
        },
      ],
      activeUserId: "u1",
    };
    const ProfileManagerScreen =
      require("../src/screens/ProfileManagerScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ProfileManagerScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("テストちゃん");
    expect(json).toContain("2024-01-01");
    expect(json).toContain("編集");
  });

  test("dueDate なし: なしを表示", async () => {
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
    };
    const ProfileManagerScreen =
      require("../src/screens/ProfileManagerScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ProfileManagerScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("なし");
  });

  test("5人登録済み: 追加ボタンがグレーアウトされる", async () => {
    mockAppState = {
      users: Array.from({ length: 5 }, (_, i) => ({
        id: `u${i + 1}`,
        name: `ちゃん${i + 1}`,
        birthDate: "2024-01-01",
        dueDate: null,
        settings: {
          showCorrectedUntilMonths: 24,
          ageFormat: "ymd",
          showDaysSinceBirth: true,
          lastViewedMonth: null,
        },
      })),
      activeUserId: "u1",
    };
    const ProfileManagerScreen =
      require("../src/screens/ProfileManagerScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ProfileManagerScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('"opacity":0.4');
  });

  test("5人登録済み: 追加ボタンタップでアラートを表示", async () => {
    const alertSpy = jest.spyOn(require("react-native").Alert, "alert");
    mockAppState = {
      users: Array.from({ length: 5 }, (_, i) => ({
        id: `u${i + 1}`,
        name: `ちゃん${i + 1}`,
        birthDate: "2024-01-01",
        dueDate: null,
        settings: {
          showCorrectedUntilMonths: 24,
          ageFormat: "ymd",
          showDaysSinceBirth: true,
          lastViewedMonth: null,
        },
      })),
      activeUserId: "u1",
    };
    const ProfileManagerScreen =
      require("../src/screens/ProfileManagerScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ProfileManagerScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });

    const buttons = tree.root.findAllByType(
      require("react-native").TouchableOpacity
    );
    const addButton = buttons[buttons.length - 1];
    await act(async () => {
      addButton.props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "",
      "子どもは最大5人まで登録できます"
    );
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  test("複数ユーザー: 全ユーザーのカードを表示", async () => {
    mockAppState = {
      users: [
        {
          id: "u1",
          name: "ちゃん1",
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
          name: "ちゃん2",
          birthDate: "2023-05-10",
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
    };
    const ProfileManagerScreen =
      require("../src/screens/ProfileManagerScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ProfileManagerScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("ちゃん1");
    expect(json).toContain("ちゃん2");
  });
});
