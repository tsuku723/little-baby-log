import React from "react";
import renderer, { act } from "react-test-renderer";

let mockActiveUser: any = null;

const mockLoadMonth = jest.fn().mockResolvedValue(undefined);
const mockUpdateUser = jest.fn().mockResolvedValue(undefined);

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(),
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
  useActiveUser: () => mockActiveUser,
  useAppState: () => ({ updateUser: mockUpdateUser }),
}));

jest.mock("@/state/AchievementsContext", () => ({
  useAchievements: () => ({ monthCounts: {}, loadMonth: mockLoadMonth }),
}));

jest.mock("@/state/GrowthRecordsContext", () => ({
  useGrowthRecords: () => ({ records: [] }),
}));

const mockSelectDateFromCalendar = jest.fn();
jest.mock("@/state/DateViewContext", () => ({
  useDateViewContext: () => ({
    selectDateFromCalendar: mockSelectDateFromCalendar,
  }),
}));

jest.mock("@/components/CalendarGrid", () => {
  const React = require("react");
  const { View, TouchableOpacity, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ onPressDay }: any) =>
      React.createElement(
        View,
        { testID: "calendar-grid" },
        React.createElement(
          TouchableOpacity,
          {
            testID: "press-day",
            accessibilityRole: "button",
            onPress: () => onPressDay("2024-06-15"),
          },
          React.createElement(Text, null, "press-day")
        ),
        React.createElement(
          TouchableOpacity,
          {
            testID: "press-invalid-day",
            accessibilityRole: "button",
            onPress: () => onPressDay("invalid-date"),
          },
          React.createElement(Text, null, "press-invalid-day")
        )
      ),
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
            onPress: () => onConfirm(new Date(2023, 2, 15)),
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

jest.mock("@/components/MonthHeader", () => {
  const React = require("react");
  const { View, TouchableOpacity, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({
      monthLabel,
      onPrev,
      onNext,
      onToday,
      onPressMonthLabel,
    }: any) =>
      React.createElement(
        View,
        { testID: "month-header" },
        React.createElement(Text, null, monthLabel),
        React.createElement(
          TouchableOpacity,
          {
            testID: "month-prev",
            accessibilityRole: "button",
            onPress: onPrev,
          },
          React.createElement(Text, null, "prev")
        ),
        React.createElement(
          TouchableOpacity,
          {
            testID: "month-next",
            accessibilityRole: "button",
            onPress: onNext,
          },
          React.createElement(Text, null, "next")
        ),
        React.createElement(
          TouchableOpacity,
          {
            testID: "month-today",
            accessibilityRole: "button",
            onPress: onToday,
          },
          React.createElement(Text, null, "today")
        ),
        React.createElement(
          TouchableOpacity,
          {
            testID: "month-label",
            accessibilityRole: "button",
            onPress: onPressMonthLabel,
          },
          React.createElement(Text, null, "label")
        )
      ),
  };
});

jest.mock("@/components/UserAvatar", () => ({
  __esModule: true,
  default: ({ name }: any) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, {}, `avatar:${name}`);
  },
}));

const mockNavigation = { push: jest.fn() };
const mockRoute = { params: {} };

describe("CalendarScreen UI (TS-UI-003)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("user=null: プロフィール未設定プレースホルダを表示", async () => {
    mockActiveUser = null;
    const CalendarScreen = require("../src/screens/CalendarScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    expect(tree.toJSON()).not.toBeNull();
    // ヘッダーに未設定文言が含まれる
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("プロフィール未設定");
  });

  test("user あり・birthDate あり: 名前と年齢情報を表示しloadMonthを呼ぶ", async () => {
    mockActiveUser = {
      id: "u1",
      name: "テストちゃん",
      birthDate: "2024-06-01",
      dueDate: null,
      settings: {
        showCorrectedUntilMonths: 24,
        ageFormat: "ymd" as const,
        showDaysSinceBirth: true,
        lastViewedMonth: null,
      },
    };
    const CalendarScreen = require("../src/screens/CalendarScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    expect(tree.toJSON()).not.toBeNull();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("テストちゃん");
    expect(mockLoadMonth).toHaveBeenCalled();
  });

  test("user あり・birthDate なし: 年齢情報なしプレースホルダを表示", async () => {
    mockActiveUser = {
      id: "u1",
      name: "名前ちゃん",
      birthDate: "",
      dueDate: null,
      settings: {
        showCorrectedUntilMonths: 24,
        ageFormat: "md" as const,
        showDaysSinceBirth: false,
        lastViewedMonth: null,
      },
    };
    const CalendarScreen = require("../src/screens/CalendarScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    expect(tree.toJSON()).not.toBeNull();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("年齢情報は設定済みのプロフィールで表示されます");
  });

  test("user あり: UserAvatar が名前付きで描画される", async () => {
    mockActiveUser = {
      id: "u1",
      name: "テストちゃん",
      birthDate: "2024-06-01",
      dueDate: null,
      profilePhotoPath: "/path/to/photo.jpg",
      settings: {
        showCorrectedUntilMonths: 24,
        ageFormat: "ymd" as const,
        showDaysSinceBirth: true,
        lastViewedMonth: null,
      },
    };
    const CalendarScreen = require("../src/screens/CalendarScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("avatar:テストちゃん");
  });

  test("user=null: UserAvatar が描画されない", async () => {
    mockActiveUser = null;
    const CalendarScreen = require("../src/screens/CalendarScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain("avatar:");
  });

  test("FABボタン（＋記録）が描画される", async () => {
    mockActiveUser = null;
    const CalendarScreen = require("../src/screens/CalendarScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("＋記録");
  });

  const baseUser = (lastViewedMonth: string | null) => ({
    id: "u1",
    name: "テストちゃん",
    birthDate: "2024-01-01",
    dueDate: null,
    settings: {
      showCorrectedUntilMonths: 24,
      ageFormat: "ymd" as const,
      showDaysSinceBirth: true,
      lastViewedMonth,
    },
  });

  test("初回ロード時にuserのlastViewedMonthへ月が復元される", async () => {
    mockActiveUser = baseUser("2024-06-01");
    const CalendarScreen = require("../src/screens/CalendarScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("2024/06");
  });

  test("lastViewedMonthが不正な形式の場合は現在月のまま表示される", async () => {
    mockActiveUser = baseUser("不正な日付");
    const CalendarScreen = require("../src/screens/CalendarScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    const now = new Date();
    const expectedLabel = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain(expectedLabel);
  });

  test("userが後からロードされた場合、lastViewedMonthへ月が補正される", async () => {
    mockActiveUser = null;
    const CalendarScreen = require("../src/screens/CalendarScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });

    mockActiveUser = baseUser("2023-03-01");
    await act(async () => {
      tree.update(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });

    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("2023/03");
  });

  test("前月・翌月・今日ボタンで月ラベルが遷移する", async () => {
    mockActiveUser = baseUser("2024-06-01");
    const CalendarScreen = require("../src/screens/CalendarScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain("2024/06");

    await act(async () => {
      tree.root.findByProps({ testID: "month-prev" }).props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain("2024/05");

    await act(async () => {
      tree.root.findByProps({ testID: "month-next" }).props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "month-next" }).props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain("2024/07");

    await act(async () => {
      tree.root.findByProps({ testID: "month-today" }).props.onPress();
    });
    const now = new Date();
    const expectedLabel = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(JSON.stringify(tree.toJSON())).toContain(expectedLabel);
  });

  test("月ラベルタップ→DatePickerModalで年月を確定すると、その月に移動する", async () => {
    mockActiveUser = baseUser("2024-06-01");
    const CalendarScreen = require("../src/screens/CalendarScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });

    await act(async () => {
      tree.root.findByProps({ testID: "month-label" }).props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "date-confirm" }).props.onPress();
    });

    // モックの DatePickerModal は 2023-03-15 を確定する
    expect(JSON.stringify(tree.toJSON())).toContain("2023/03");
  });

  test("DatePickerModalをキャンセルすると月は変わらない", async () => {
    mockActiveUser = baseUser("2024-06-01");
    const CalendarScreen = require("../src/screens/CalendarScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });

    await act(async () => {
      tree.root.findByProps({ testID: "month-label" }).props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "date-cancel" }).props.onPress();
    });

    expect(JSON.stringify(tree.toJSON())).toContain("2024/06");
  });

  test("日付タップでTodayへ遷移し、選択日がDateViewContextへ渡る", async () => {
    mockActiveUser = baseUser("2024-06-01");
    const CalendarScreen = require("../src/screens/CalendarScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });

    await act(async () => {
      tree.root.findByProps({ testID: "press-day" }).props.onPress();
    });

    expect(mockNavigation.push).toHaveBeenCalledWith("Today", {
      isoDate: "2024-06-15",
    });
    expect(mockSelectDateFromCalendar).toHaveBeenCalled();
  });

  test("不正な日付をタップしても画面遷移しない", async () => {
    mockActiveUser = baseUser("2024-06-01");
    const CalendarScreen = require("../src/screens/CalendarScreen").default;
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(CalendarScreen, {
          navigation: mockNavigation,
          route: mockRoute,
        })
      );
    });

    await act(async () => {
      tree.root.findByProps({ testID: "press-invalid-day" }).props.onPress();
    });

    expect(mockNavigation.push).not.toHaveBeenCalled();
  });
});
