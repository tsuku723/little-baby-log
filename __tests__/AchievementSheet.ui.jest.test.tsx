import React from "react";
import renderer, { act } from "react-test-renderer";

let mockActiveUser: any = null;
let mockByDay: Record<string, any[]> = {};
const mockLoadDay = jest.fn().mockResolvedValue(undefined);
const mockRemove = jest.fn().mockResolvedValue(undefined);

jest.mock("@/state/AppStateContext", () => ({
  useActiveUser: () => mockActiveUser,
}));

jest.mock("@/state/AchievementsContext", () => ({
  useAchievements: () => ({
    byDay: mockByDay,
    loadDay: mockLoadDay,
    remove: mockRemove,
  }),
}));

jest.mock("@/components/AchievementForm", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ draft }: any) =>
      React.createElement(
        View,
        { testID: "achievement-form" },
        React.createElement(Text, null, draft ? `editing:${draft.id}` : "new")
      ),
  };
});

import AchievementSheet from "../src/components/AchievementSheet";
import AchievementItem from "../src/components/AchievementItem";

describe("AchievementSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveUser = null;
    mockByDay = {};
    mockLoadDay.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
  });

  const activeUser = (overrides: Partial<any> = {}) => ({
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
    ...overrides,
  });

  test("isoDayが不正な場合、日付情報を読み込めませんでしたが表示される", async () => {
    mockActiveUser = activeUser();
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementSheet isoDay="invalid-date" visible onClose={jest.fn()} />
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain(
      "日付情報を読み込めませんでした"
    );
  });

  test("isoDayが形式は正しいが実在しない日付の場合、日付情報を読み込めませんでしたが表示される", async () => {
    mockActiveUser = activeUser();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementSheet isoDay="2024-02-30" visible onClose={jest.fn()} />
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain(
      "日付情報を読み込めませんでした"
    );
    warnSpy.mockRestore();
  });

  test("isoDayがnullの場合、日付情報を読み込めませんでしたが表示される", async () => {
    mockActiveUser = activeUser();
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementSheet isoDay={null} visible onClose={jest.fn()} />
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain(
      "日付情報を読み込めませんでした"
    );
  });

  test("useModal=falseかつvisible=falseの場合、何もレンダリングしない", async () => {
    mockActiveUser = activeUser();
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementSheet
          isoDay="2024-06-01"
          visible={false}
          onClose={jest.fn()}
          useModal={false}
        />
      );
    });
    expect(tree.toJSON()).toBeNull();
  });

  test("useModal=falseかつvisible=trueの場合、インライン表示される", async () => {
    mockActiveUser = activeUser();
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementSheet
          isoDay="2024-06-01"
          visible
          onClose={jest.fn()}
          useModal={false}
        />
      );
    });
    expect(tree.toJSON()).not.toBeNull();
    expect(tree.root.findAllByType(require("react-native").Modal).length).toBe(
      0
    );
  });

  test("実績が0件の場合、まだ記録はありませんが表示される", async () => {
    mockActiveUser = activeUser();
    mockByDay = {};
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementSheet isoDay="2024-06-01" visible onClose={jest.fn()} />
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain("まだ記録はありません");
  });

  test("正期産の場合、暦のみ表示され在胎・修正は表示されない", async () => {
    mockActiveUser = activeUser({ birthDate: "2024-01-01", dueDate: null });
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementSheet isoDay="2024-06-01" visible onClose={jest.fn()} />
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("暦:");
    expect(json).not.toContain("在胎:");
    expect(json).not.toContain("修正:");
  });

  test("早産・due前の場合、在胎が表示される", async () => {
    mockActiveUser = activeUser({
      birthDate: "2025-01-01",
      dueDate: "2025-02-15",
    });
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementSheet isoDay="2025-01-10" visible onClose={jest.fn()} />
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("在胎:");
  });

  test("早産・due後の場合、修正月齢が表示される", async () => {
    mockActiveUser = activeUser({
      birthDate: "2025-01-01",
      dueDate: "2025-02-15",
    });
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementSheet isoDay="2025-05-15" visible onClose={jest.fn()} />
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("修正:");
  });

  test("showDaysSinceBirth=falseの場合、生後日数は表示されない", async () => {
    mockActiveUser = activeUser({
      settings: {
        showCorrectedUntilMonths: 24,
        ageFormat: "ymd",
        showDaysSinceBirth: false,
        lastViewedMonth: null,
      },
    });
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementSheet isoDay="2024-06-01" visible onClose={jest.fn()} />
      );
    });
    expect(JSON.stringify(tree.toJSON())).not.toContain("生後日数");
  });

  test("showDaysSinceBirth=trueの場合、生後日数が表示される", async () => {
    mockActiveUser = activeUser({
      settings: {
        showCorrectedUntilMonths: 24,
        ageFormat: "ymd",
        showDaysSinceBirth: true,
        lastViewedMonth: null,
      },
    });
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementSheet isoDay="2024-06-01" visible onClose={jest.fn()} />
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain("生後日数");
  });

  test("isoDayが変わると編集中状態がリセットされloadDayが呼ばれる", async () => {
    mockActiveUser = activeUser();
    mockByDay = {
      "2024-06-01": [
        {
          id: "a1",
          date: "2024-06-01",
          title: "できたこと1",
          memo: "",
          createdAt: "",
          updatedAt: "",
        },
      ],
    };
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementSheet isoDay="2024-06-01" visible onClose={jest.fn()} />
      );
    });
    expect(mockLoadDay).toHaveBeenCalledWith("2024-06-01");

    // 実績アイテムをタップして編集状態にする
    const TouchableOpacity = require("react-native").TouchableOpacity;
    const itemTouchables = tree.root
      .findByType(AchievementItem)
      .findAllByType(TouchableOpacity);
    await act(async () => {
      itemTouchables[0].props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain("editing:a1");

    mockLoadDay.mockClear();
    await act(async () => {
      tree.update(
        <AchievementSheet isoDay="2024-06-02" visible onClose={jest.fn()} />
      );
    });

    expect(mockLoadDay).toHaveBeenCalledWith("2024-06-02");
    expect(JSON.stringify(tree.toJSON())).toContain("new");
  });

  test("実績アイテムの削除ボタンでremoveが呼ばれる", async () => {
    mockActiveUser = activeUser();
    mockByDay = {
      "2024-06-01": [
        {
          id: "a1",
          date: "2024-06-01",
          title: "できたこと1",
          memo: "",
          createdAt: "",
          updatedAt: "",
        },
      ],
    };
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementSheet isoDay="2024-06-01" visible onClose={jest.fn()} />
      );
    });

    const TouchableOpacity = require("react-native").TouchableOpacity;
    const itemTouchables = tree.root
      .findByType(AchievementItem)
      .findAllByType(TouchableOpacity);
    await act(async () => {
      itemTouchables[1].props.onPress(); // 削除ボタン
    });

    expect(mockRemove).toHaveBeenCalledWith("a1", "2024-06-01");
  });

  test("閉じるボタンでonCloseが呼ばれる", async () => {
    mockActiveUser = activeUser();
    const onClose = jest.fn();
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementSheet isoDay="2024-06-01" visible onClose={onClose} />
      );
    });

    // 実績0件のため、TouchableOpacityはヘッダーの閉じるボタンのみ
    const TouchableOpacity = require("react-native").TouchableOpacity;
    const closeButton = tree.root.findByType(TouchableOpacity);
    await act(async () => {
      closeButton.props.onPress();
    });
    expect(onClose).toHaveBeenCalled();
  });
});
