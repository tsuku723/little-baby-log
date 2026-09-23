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
          testID: "date-picker-confirm",
          accessibilityRole: "button",
          onPress: () => onConfirm(mockPickerConfirmDate ?? value),
        },
        React.createElement(Text, null, "日付を確定")
      );
    },
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
    mockPickerConfirmDate = null;
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

  test("選び直しの保存に失敗した場合、旧一時ファイルは削除されない", async () => {
    mockAppState = { users: [], activeUserId: null };
    const routeNew = { params: {} };
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

    mockSaveCroppedProfilePhotoAsync.mockRejectedValueOnce(
      new Error("save failed")
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
    expect(JSON.stringify(tree.toJSON())).toContain("profile-photos/new1.jpg");
    consoleErrorSpy.mockRestore();
  });

  test("名前が未入力で保存した場合、バリデーションエラーが表示される", async () => {
    mockAppState = { users: [], activeUserId: null };
    const routeNew = { params: {} };
    const alertSpy = jest
      .spyOn(require("react-native").Alert, "alert")
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

    // 保存ボタンは名前未入力のため disabled になる
    const saveButton = findButtonByText(tree.root, "保存");
    expect(saveButton.props.disabled).toBe(true);
    expect(mockAddUser).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test("在胎週数計算に関わる出産予定日・性別を設定して保存すると、正しい値でupdateUserが呼ばれる", async () => {
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

    // 出産予定日を選択
    mockPickerConfirmDate = new Date(2024, 2, 1); // 2024-03-01
    await act(async () => {
      tree.root
        .findByProps({ accessibilityLabel: "出産予定日を選択" })
        .props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "date-picker-confirm" }).props.onPress();
    });

    // 性別を選択
    const genderButton = tree.root.findAll(
      (node: any) => extractText(node) === "女の子" && node.props.onPress
    )[0];
    await act(async () => {
      genderButton.props.onPress();
    });

    await act(async () => {
      findButtonByText(tree.root, "保存").props.onPress();
    });

    expect(mockUpdateUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        dueDate: "2024-03-01",
        gender: "female",
      })
    );
  });

  test("修正月齢の表示上限を「36か月」に変更して保存できる", async () => {
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

    const monthsButton = tree.root.findAll(
      (node: any) => extractText(node) === "36か月" && node.props.onPress
    )[0];
    await act(async () => {
      monthsButton.props.onPress();
    });

    await act(async () => {
      findButtonByText(tree.root, "保存").props.onPress();
    });

    expect(mockUpdateUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        settings: expect.objectContaining({ showCorrectedUntilMonths: 36 }),
      })
    );
  });

  test("生まれてからの日数表示スイッチをOFFにして保存できる", async () => {
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

    const daysSwitch = tree.root.findAllByType(Switch)[0];
    await act(async () => {
      daysSwitch.props.onValueChange(false);
    });

    await act(async () => {
      findButtonByText(tree.root, "保存").props.onPress();
    });

    expect(mockUpdateUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        settings: expect.objectContaining({ showDaysSinceBirth: false }),
      })
    );
  });

  test("削除ボタン押下→確認ダイアログで「削除」を選ぶとdeleteUserが呼ばれる", async () => {
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
      achievements: {},
    };
    const route = { params: { profileId: "u1" } };
    const alertSpy = jest
      .spyOn(require("react-native").Alert, "alert")
      .mockImplementation((_title, _message, buttons) => {
        const deleteButton = buttons?.find((b: any) => b.text === "削除");
        deleteButton?.onPress?.();
      });
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
      findButtonByText(tree.root, "このプロフィールを削除する").props.onPress();
    });

    expect(mockDeleteUser).toHaveBeenCalledWith("u1");
    alertSpy.mockRestore();
  });

  test("プロフィールが1件のみの場合、削除ボタンはdisabledになる", async () => {
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

    const deleteButton = findButtonByText(
      tree.root,
      "このプロフィールを削除する"
    );
    expect(deleteButton.props.disabled).toBe(true);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  test("写真削除ボタン押下でprofilePhotoPathがクリアされる", async () => {
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

    expect(JSON.stringify(tree.toJSON())).toContain("写真を削除");
    await act(async () => {
      findButtonByText(tree.root, "写真を削除").props.onPress();
    });

    // 既存プロフィール写真と同じパスのため、この時点では即時削除されない
    // （保存/キャンセル時に実際のパスとの差分を見て削除される）
    expect(mockDeleteIfExistsAsync).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).not.toContain("写真を削除");
  });

  test("写真アクセス許可が拒否された場合、専用のエラーAlertが表示される", async () => {
    mockAppState = { users: [], activeUserId: null };
    const routeNew = { params: {} };
    const { PhotoPermissionDeniedError } = require("@/utils/photo");
    mockPickPhotoAsync.mockRejectedValueOnce(
      new PhotoPermissionDeniedError("denied")
    );
    const alertSpy = jest
      .spyOn(require("react-native").Alert, "alert")
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

    expect(alertSpy).toHaveBeenCalledWith(
      "アクセス許可が必要です",
      "設定からフォトライブラリへのアクセスを許可してください。"
    );
    alertSpy.mockRestore();
  });

  test("トリミングをキャンセルするとモーダルが閉じる", async () => {
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
    expect(JSON.stringify(tree.toJSON())).toContain("photo-crop-modal");

    await act(async () => {
      tree.root.findByProps({ testID: "crop-cancel" }).props.onPress();
    });

    expect(JSON.stringify(tree.toJSON())).not.toContain("photo-crop-modal");
  });
});
