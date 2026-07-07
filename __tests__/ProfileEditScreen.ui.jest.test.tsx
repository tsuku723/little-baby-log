import React from "react";
import renderer, { act } from "react-test-renderer";

let mockAppState: any = { users: [], activeUserId: null };
const mockAddUser = jest.fn().mockResolvedValue(undefined);
const mockUpdateUser = jest.fn().mockResolvedValue(undefined);
const mockDeleteUser = jest.fn().mockResolvedValue(undefined);

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

jest.mock("@/state/AppStateContext", () => ({
  useAppState: () => ({
    state: mockAppState,
    addUser: mockAddUser,
    updateUser: mockUpdateUser,
    deleteUser: mockDeleteUser,
  }),
}));

const mockParentNavigate = jest.fn();
const mockNavigation = {
  goBack: jest.fn(),
  popToTop: jest.fn(),
  getParent: jest
    .fn()
    .mockReturnValue({ setOptions: jest.fn(), navigate: mockParentNavigate }),
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

describe("ProfileEditScreen UI (TS-UI-009)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation.getParent.mockReturnValue({
      setOptions: jest.fn(),
      navigate: mockParentNavigate,
    });
  });

  test("新規プロフィール（profileId なし）: 「新しいこどもを追加」を表示", async () => {
    mockAppState = { users: [], activeUserId: null };
    const routeNew = { params: {} };
    const ProfileEditScreen =
      require("../src/screens/ProfileEditScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ProfileEditScreen, {
          navigation: mockNavigation,
          route: routeNew,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("新しいこどもを追加");
  });

  test("既存プロフィール（profileId あり）: 「プロフィールを編集」と削除ボタンを表示", async () => {
    const existingUser = {
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
    mockAppState = {
      users: [existingUser, { ...existingUser, id: "u2", name: "別のこ" }],
      activeUserId: "u1",
    };
    const routeEdit = { params: { profileId: "u1" } };
    const ProfileEditScreen =
      require("../src/screens/ProfileEditScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ProfileEditScreen, {
          navigation: mockNavigation,
          route: routeEdit,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("プロフィールを編集");
    expect(json).toContain("このプロフィールを削除する");
  });

  test("フォームに出生日・出産予定日フィールドが表示される", async () => {
    mockAppState = { users: [], activeUserId: null };
    const routeNew = { params: {} };
    const ProfileEditScreen =
      require("../src/screens/ProfileEditScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ProfileEditScreen, {
          navigation: mockNavigation,
          route: routeNew,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("出生日");
    expect(json).toContain("出産予定日");
    expect(json).toContain("保存");
  });

  test("修正月齢の表示上限オプションが表示される", async () => {
    mockAppState = { users: [], activeUserId: null };
    const routeNew = { params: {} };
    const ProfileEditScreen =
      require("../src/screens/ProfileEditScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ProfileEditScreen, {
          navigation: mockNavigation,
          route: routeNew,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("24か月");
    expect(json).toContain("36か月");
    expect(json).toContain("制限なし");
  });

  test("returnTo 指定時、保存後に呼び出し元タブへ戻る", async () => {
    const existingUser = {
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
    mockAppState = { users: [existingUser], activeUserId: "u1" };
    const route = { params: { profileId: "u1", returnTo: "CalendarStack" } };
    const ProfileEditScreen =
      require("../src/screens/ProfileEditScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ProfileEditScreen, {
          navigation: mockNavigation,
          route,
        })
      );
    });

    await act(async () => {
      findButtonByText(tree.root, "保存").props.onPress();
    });

    expect(mockNavigation.popToTop).toHaveBeenCalled();
    expect(mockParentNavigate).toHaveBeenCalledWith("CalendarStack", {
      screen: "Calendar",
    });
  });

  test("returnTo 指定時、キャンセル後に呼び出し元タブへ戻る", async () => {
    const existingUser = {
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
    mockAppState = { users: [existingUser], activeUserId: "u1" };
    const route = { params: { profileId: "u1", returnTo: "RecordListStack" } };
    const ProfileEditScreen =
      require("../src/screens/ProfileEditScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ProfileEditScreen, {
          navigation: mockNavigation,
          route,
        })
      );
    });

    await act(async () => {
      findButtonByText(tree.root, "キャンセル").props.onPress();
    });

    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    expect(mockNavigation.popToTop).toHaveBeenCalled();
    expect(mockParentNavigate).toHaveBeenCalledWith("RecordListStack", {
      screen: "AchievementList",
    });
  });

  test("returnTo 未指定時、キャンセルは通常の goBack のまま", async () => {
    mockAppState = { users: [], activeUserId: null };
    const routeNew = { params: {} };
    const ProfileEditScreen =
      require("../src/screens/ProfileEditScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ProfileEditScreen, {
          navigation: mockNavigation,
          route: routeNew,
        })
      );
    });

    await act(async () => {
      findButtonByText(tree.root, "キャンセル").props.onPress();
    });

    expect(mockNavigation.goBack).toHaveBeenCalled();
    expect(mockParentNavigate).not.toHaveBeenCalled();
  });
});
