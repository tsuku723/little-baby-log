import React from "react";
import renderer, { act } from "react-test-renderer";
import { Switch } from "react-native";
import * as Notifications from "expo-notifications";

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

const mockPickPhotoAsync = jest.fn().mockResolvedValue(null);
const mockSaveCroppedProfilePhotoAsync = jest.fn().mockResolvedValue(null);
const mockDeleteIfExistsAsync = jest.fn().mockResolvedValue(undefined);

jest.mock("@/utils/photo", () => ({
  PhotoPermissionDeniedError: class PhotoPermissionDeniedError extends Error {},
  pickPhotoAsync: mockPickPhotoAsync,
  saveCroppedProfilePhotoAsync: mockSaveCroppedProfilePhotoAsync,
  deleteIfExistsAsync: mockDeleteIfExistsAsync,
  resolvePhotoPath: (path: string) => path,
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
    mockPickPhotoAsync.mockResolvedValue({
      uri: "file://picked.jpg",
      width: 100,
      height: 100,
    });
    mockSaveCroppedProfilePhotoAsync.mockResolvedValue(
      "profile-photos/new.jpg"
    );
    mockDeleteIfExistsAsync.mockResolvedValue(undefined);
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
        notifyMilestoneEnabled: false,
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
        notifyMilestoneEnabled: false,
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
        notifyMilestoneEnabled: false,
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

  test("マイルストーン通知トグルが表示される", async () => {
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
    expect(json).toContain("マイルストーン通知");
  });

  test("通知トグルをONにすると権限をリクエストし、許可されればONになる", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "undetermined",
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });

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

    const toggle = tree.root.findAllByType(Switch)[1];
    await act(async () => {
      toggle.props.onValueChange(true);
    });

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    const updatedToggle = tree.root.findAllByType(Switch)[1];
    expect(updatedToggle.props.value).toBe(true);
  });

  test("通知権限が拒否されるとトグルはOFFのままになる", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "undetermined",
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });

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

    const toggle = tree.root.findAllByType(Switch)[1];
    await act(async () => {
      toggle.props.onValueChange(true);
    });

    const updatedToggle = tree.root.findAllByType(Switch)[1];
    expect(updatedToggle.props.value).toBe(false);
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

  test("初回の写真設定時は保存のみ行われ、削除は呼ばれない", async () => {
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
      tree.root
        .findByProps({ accessibilityLabel: "プロフィール写真を選択" })
        .props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "crop-confirm" }).props.onPress();
    });

    expect(mockSaveCroppedProfilePhotoAsync).toHaveBeenCalledWith(
      "file://picked.jpg",
      { x: 0, y: 0, width: 10, height: 10 }
    );
    expect(mockDeleteIfExistsAsync).not.toHaveBeenCalled();
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain("photo-crop-modal");
  });

  test("写真を選び直すと、保存と旧写真の削除が両方行われる", async () => {
    const existingUser = {
      id: "u1",
      name: "テストちゃん",
      birthDate: "2024-01-01",
      dueDate: null,
      profilePhotoPath: "profile-photos/old.jpg",
      settings: {
        showCorrectedUntilMonths: 24,
        ageFormat: "ymd" as const,
        showDaysSinceBirth: true,
        lastViewedMonth: null,
        notifyMilestoneEnabled: false,
      },
    };
    mockAppState = { users: [existingUser], activeUserId: "u1" };
    const route = { params: { profileId: "u1" } };
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

    // 1回目: 既存プロフィール写真と同じパスのため削除は呼ばれない
    mockSaveCroppedProfilePhotoAsync.mockResolvedValueOnce(
      "profile-photos/new1.jpg"
    );
    await act(async () => {
      tree.root
        .findByProps({ accessibilityLabel: "プロフィール写真を選択" })
        .props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "crop-confirm" }).props.onPress();
    });
    expect(mockDeleteIfExistsAsync).not.toHaveBeenCalled();

    // 2回目: 直前に保存した一時写真(new1.jpg)が不要になるため削除される
    mockSaveCroppedProfilePhotoAsync.mockResolvedValueOnce(
      "profile-photos/new2.jpg"
    );
    await act(async () => {
      tree.root
        .findByProps({ accessibilityLabel: "プロフィール写真を選択" })
        .props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "crop-confirm" }).props.onPress();
    });

    expect(mockSaveCroppedProfilePhotoAsync).toHaveBeenCalledTimes(2);
    expect(mockDeleteIfExistsAsync).toHaveBeenCalledWith(
      "profile-photos/new1.jpg"
    );
  });

  test("保存に失敗した場合、写真は更新されずエラーが表示される", async () => {
    mockAppState = { users: [], activeUserId: null };
    const routeNew = { params: {} };
    mockSaveCroppedProfilePhotoAsync.mockRejectedValueOnce(
      new Error("save failed")
    );
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
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
      tree.root
        .findByProps({ accessibilityLabel: "プロフィール写真を選択" })
        .props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "crop-confirm" }).props.onPress();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain("photo-crop-modal");
    consoleErrorSpy.mockRestore();
  });
});
